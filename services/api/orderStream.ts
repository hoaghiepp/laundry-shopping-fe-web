import { API_BASE_URL } from "@/constants/api";
import { OrderStatus, PaymentStatus } from "@/constants/enum";
import { refreshAccessTokenShared } from "@/lib/apiClient";
import { handleSessionExpired } from "@/lib/logoutHandler";
import { ensureSessionFromStoredTokens } from "@/lib/sessionHydrate";
import { getAccessToken } from "@/lib/tokenStore";
import { getGlobalUserRole, subscribeUserRole } from "@/utils/globalState";
import { AppState, type AppStateStatus } from "react-native";
import type { Order } from "./orderService";

export type OrderStreamCloseReason = "resync" | "evicted" | "shutdown";

export interface OrderStreamItem {
  id: string;
  product_type: "SERVICE" | "GOODS";
  service_status: string | null;
  goods_status: string | null;
  adjusted_quantity: number | null;
  total_price: number | null;
}

/** Partial snapshot from `order.updated`. Not a full Order. */
export interface OrderUpdatedEvent {
  order_id: string;
  order_code: string;
  customer_id: string;
  hub_id: string | null;
  factory_id: string | null;
  status: string;
  payment_status: string | null;
  final_total: number | null;
  wallet_deduction: number | null;
  last_modified_date: string | null;
  items: OrderStreamItem[];
}

export type OrderStreamTarget =
  | { kind: "customer" }
  | { kind: "staff"; storeId?: string | null };

export type OrderStreamListener = {
  onReady?: () => void;
  onOrderUpdated?: (event: OrderUpdatedEvent) => void;
};

const BACKOFF_START_MS = 1000;
const BACKOFF_CAP_MS = 30000;

function appIsActive(state: AppStateStatus): boolean {
  return state === "active" || state === "unknown";
}

function isStaffRole(roles: string[] | string | null): boolean {
  const list = !roles ? [] : Array.isArray(roles) ? roles : [roles];
  return list.some((role) => {
    const value = role.toUpperCase();
    return (
      value === "ROLE_STAFF" ||
      value === "STAFF" ||
      value === "ROLE_ADMIN" ||
      value === "ADMIN" ||
      value === "ROLE_SUPER_ADMIN" ||
      value === "SUPER_ADMIN" ||
      value.includes("STORE") ||
      value.includes("FACTORY")
    );
  });
}

function targetKey(target: OrderStreamTarget): string {
  if (target.kind === "customer") return "customer";
  return `staff:${target.storeId ?? ""}`;
}

function streamUrl(target: OrderStreamTarget): string {
  if (target.kind === "customer") {
    return `${API_BASE_URL}/v1/customer/orders/stream`;
  }
  const storeId = target.storeId?.trim();
  const query = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  return `${API_BASE_URL}/v1/staff/orders/stream${query}`;
}

/** Incremental SSE parser. Comment lines (`:keepalive`) are ignored. */
export function createSseParser(
  onEvent: (eventName: string, data: string) => void
): (chunk: string) => void {
  let buffer = "";
  let eventName = "message";
  let dataLines: string[] = [];

  return (chunk: string) => {
    buffer += chunk.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line === "") {
        if (dataLines.length > 0) {
          onEvent(eventName, dataLines.join("\n"));
        }
        eventName = "message";
        dataLines = [];
        continue;
      }
      if (line.startsWith(":")) continue;

      const colon = line.indexOf(":");
      const field = colon === -1 ? line : line.slice(0, colon);
      let value = colon === -1 ? "" : line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);

      if (field === "event") eventName = value;
      else if (field === "data") dataLines.push(value);
    }
  };
}

/**
 * Copy stream fields onto an order already loaded from REST.
 * Address, notes, logs, and incidents are left as they were.
 */
export function applyOrderStreamPatch(order: Order, event: OrderUpdatedEvent): Order {
  const itemsById = new Map((event.items ?? []).map((item) => [item.id, item]));
  const orderItems = Array.isArray(order.order_items)
    ? order.order_items.map((item) => {
        const patch = itemsById.get(item?.id);
        if (!patch) return item;
        return {
          ...item,
          service_status: patch.service_status,
          goods_status: patch.goods_status,
          adjusted_quantity: patch.adjusted_quantity,
          total_price: patch.total_price,
        };
      })
    : order.order_items;

  return {
    ...order,
    status: event.status as OrderStatus,
    payment_status: (event.payment_status ?? order.payment_status) as PaymentStatus,
    final_total: event.final_total ?? order.final_total,
    wallet_deduction: event.wallet_deduction ?? order.wallet_deduction,
    factory_id: event.factory_id ?? "",
    last_modified_date: event.last_modified_date ?? order.last_modified_date,
    order_items: orderItems,
  };
}

class OrderStreamClient {
  private listeners = new Set<OrderStreamListener>();
  private xhr: XMLHttpRequest | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private generation = 0;
  private reconcileGen = 0;
  private backoffMs = BACKOFF_START_MS;
  private stopped = true;
  private evicted = false;
  private authRetried = false;
  private sessionWanted = false;
  private appActive = true;
  private staffScopeCount = 0;
  private staffStoreId: string | null = null;
  private target: OrderStreamTarget | null = null;
  private activeKey: string | null = null;

  subscribe(listener: OrderStreamListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Staff/factory screen reports the selected store. `null` means none selected yet. */
  setStaffStore(storeId: string | null): () => void {
    this.staffScopeCount += 1;
    this.staffStoreId = storeId;
    void this.reconcile();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.staffScopeCount = Math.max(0, this.staffScopeCount - 1);
      if (this.staffScopeCount === 0) this.staffStoreId = null;
      void this.reconcile();
    };
  }

  /** One session owner (root layout) opens and closes the socket. */
  attachSession(): () => void {
    this.sessionWanted = true;
    this.appActive = appIsActive(AppState.currentState);
    const unsubRole = subscribeUserRole(() => {
      void this.reconcile();
    });
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      const active = appIsActive(state);
      const becameActive = active && !this.appActive;
      this.appActive = active;
      if (becameActive) this.evicted = false;
      void this.reconcile();
    });
    void (async () => {
      await ensureSessionFromStoredTokens();
      await this.reconcile();
    })();

    return () => {
      this.sessionWanted = false;
      unsubRole();
      sub.remove();
      this.stop();
    };
  }

  private async reconcile(): Promise<void> {
    const gen = ++this.reconcileGen;
    const token = await getAccessToken();
    if (gen !== this.reconcileGen) return;

    const roles = getGlobalUserRole();
    const hasRole = !!roles && (!Array.isArray(roles) || roles.length > 0);

    if (!this.sessionWanted || !this.appActive || !token || !hasRole || this.evicted) {
      this.stop();
      return;
    }

    if (isStaffRole(roles)) {
      if (this.staffScopeCount === 0 || !this.staffStoreId) {
        this.stop();
        return;
      }
      this.ensureConnected({ kind: "staff", storeId: this.staffStoreId });
      return;
    }

    this.ensureConnected({ kind: "customer" });
  }

  private ensureConnected(target: OrderStreamTarget): void {
    const key = targetKey(target);
    if (this.activeKey === key && this.xhr && !this.stopped) return;

    this.stopped = false;
    this.target = target;
    this.activeKey = key;
    this.backoffMs = BACKOFF_START_MS;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.abortXhr();
    void this.open();
  }

  private stop(): void {
    this.stopped = true;
    this.target = null;
    this.activeKey = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.abortXhr();
  }

  private abortXhr(): void {
    this.detach(this.xhr);
  }

  /** Drop handlers before abort so a dying socket cannot open a second one. */
  private detach(xhr: XMLHttpRequest | null): void {
    if (!xhr) return;
    xhr.onprogress = null;
    xhr.onreadystatechange = null;
    xhr.onerror = null;
    xhr.onabort = null;
    if (this.xhr === xhr) this.xhr = null;
    try {
      xhr.abort();
    } catch {
      /* already closed */
    }
  }

  private scheduleReconnect(immediate = false): void {
    if (this.stopped || this.evicted) return;
    if (this.reconnectTimer) return;
    const wait = immediate ? 0 : this.backoffMs;
    if (!immediate) {
      this.backoffMs = Math.min(this.backoffMs * 2, BACKOFF_CAP_MS);
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.abortXhr();
      void this.open();
    }, wait);
  }

  private async open(): Promise<void> {
    if (this.stopped || this.evicted || !this.target) return;
    const gen = ++this.generation;
    const target = this.target;
    const token = await getAccessToken();
    if (gen !== this.generation || this.stopped || this.evicted || !this.target) return;
    if (!token) {
      this.stop();
      return;
    }

    this.abortXhr();
    const xhr = new XMLHttpRequest();
    this.xhr = xhr;
    let cursor = 0;
    let settled = false;

    const parser = createSseParser((eventName, data) => {
      if (gen !== this.generation) return;
      if (eventName === "ready") {
        this.backoffMs = BACKOFF_START_MS;
        this.authRetried = false;
        this.emitReady();
        return;
      }
      if (eventName === "order.updated") {
        try {
          const parsed = JSON.parse(data) as OrderUpdatedEvent;
          if (!parsed?.order_id) return;
          this.listeners.forEach((listener) => {
            try {
              listener.onOrderUpdated?.(parsed);
            } catch (error) {
              console.error("order stream listener failed", error);
            }
          });
        } catch (error) {
          console.error("order stream event parse failed", error);
        }
        return;
      }
      if (eventName === "close") {
        let reason: OrderStreamCloseReason = "resync";
        try {
          const parsed = JSON.parse(data) as { reason?: string };
          if (
            parsed?.reason === "resync" ||
            parsed.reason === "evicted" ||
            parsed.reason === "shutdown"
          ) {
            reason = parsed.reason;
          }
        } catch {
          reason = "resync";
        }
        if (reason === "evicted") {
          this.evicted = true;
          this.stop();
          return;
        }
        this.abortXhr();
        this.scheduleReconnect();
      }
    });

    const pump = () => {
      const text = xhr.responseText || "";
      if (text.length <= cursor) return;
      parser(text.slice(cursor));
      cursor = text.length;
    };

    const onDone = () => {
      if (settled || gen !== this.generation || this.xhr !== xhr) return;
      settled = true;
      pump();
      this.detach(xhr);
      if (xhr.status === 401) {
        void this.handle401();
        return;
      }
      if (this.stopped || this.evicted) return;
      this.scheduleReconnect();
    };

    xhr.onprogress = pump;
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 2 && xhr.status === 401) {
        if (settled || gen !== this.generation) return;
        settled = true;
        this.detach(xhr);
        void this.handle401();
        return;
      }
      if (xhr.readyState === 3) pump();
      if (xhr.readyState === 4) onDone();
    };
    xhr.onerror = onDone;

    xhr.open("GET", streamUrl(target));
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Accept", "text/event-stream");
    xhr.setRequestHeader("Cache-Control", "no-cache");
    xhr.send();
  }

  private async handle401(): Promise<void> {
    if (this.authRetried) {
      this.stop();
      await handleSessionExpired();
      return;
    }
    this.authRetried = true;
    try {
      await refreshAccessTokenShared();
    } catch {
      this.stop();
      return;
    }
    if (this.stopped || this.evicted) return;
    this.scheduleReconnect(true);
  }

  private emitReady(): void {
    this.listeners.forEach((listener) => {
      try {
        listener.onReady?.();
      } catch (error) {
        console.error("order stream ready listener failed", error);
      }
    });
  }
}

export const orderStream = new OrderStreamClient();
