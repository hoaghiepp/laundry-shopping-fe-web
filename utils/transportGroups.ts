export type TransportDirection = "hub" | "factory";
export type BlockReason = "ON_TRIP" | "IN_BATCH" | "MISSING";

export interface TransportGarment {
  id: string;
  barcode: string;
  order_id: string;
  order_code: string;
  status?: string;
  current_trip_id?: string | null;
  current_batch_id?: string | null;
  item_condition?: string | null;
}

export interface BlockedGarment {
  barcode: string;
  reason: BlockReason;
}

export interface OrderGroup {
  orderId: string;
  orderCode: string;
  customerName?: string;
  customerPhone?: string;
  garments: TransportGarment[];
  blocked: BlockedGarment[];
  selectedIds: string[];
}

export const FACTORY_RETURN_STATUSES = [
  "RECEIVED_FACTORY",
  "WASHING",
  "DRIED",
  "IRONED",
  "PACKED",
] as const;

const PAGE_SIZE = 200;

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

export function asGarment(raw: any): TransportGarment | null {
  const id = text(raw?.id);
  const orderId = text(raw?.order_id ?? raw?.orderId);
  if (!id || !orderId) return null;
  return {
    id,
    barcode: text(raw?.barcode) || id,
    order_id: orderId,
    order_code: text(raw?.order_code ?? raw?.orderCode) || orderId,
    status: text(raw?.status) || undefined,
    current_trip_id: raw?.current_trip_id ?? raw?.currentTripId ?? null,
    current_batch_id: raw?.current_batch_id ?? raw?.currentBatchId ?? null,
    item_condition: raw?.item_condition ?? raw?.itemCondition ?? null,
  };
}

export function blockReason(
  item: TransportGarment,
  direction: TransportDirection
): BlockReason | null {
  if (item.item_condition === "MISSING") return "MISSING";
  if (item.current_trip_id) return "ON_TRIP";
  if (direction === "factory" && item.current_batch_id) return "IN_BATCH";
  return null;
}

/** Group a full result set. Callers must page until meta.total is covered first. */
export function groupByOrder(
  rows: any[],
  direction: TransportDirection
): OrderGroup[] {
  const byId = new Map<string, TransportGarment>();
  for (const row of rows) {
    const garment = asGarment(row);
    if (!garment || byId.has(garment.id)) continue;
    byId.set(garment.id, garment);
  }

  const groups = new Map<string, OrderGroup>();
  for (const garment of byId.values()) {
    let group = groups.get(garment.order_id);
    if (!group) {
      group = {
        orderId: garment.order_id,
        orderCode: garment.order_code,
        garments: [],
        blocked: [],
        selectedIds: [],
      };
      groups.set(garment.order_id, group);
    }
    const reason = blockReason(garment, direction);
    if (reason) {
      group.blocked.push({ barcode: garment.barcode, reason });
      continue;
    }
    group.garments.push(garment);
    group.selectedIds.push(garment.id);
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.orderCode.localeCompare(b.orderCode, "vi")
  );
}

export function selectionKind(group: OrderGroup): "all" | "none" | "some" {
  if (group.garments.length === 0 || group.selectedIds.length === 0) return "none";
  if (group.selectedIds.length >= group.garments.length) return "all";
  return "some";
}

export function withOrderSelection(group: OrderGroup, selected: boolean): OrderGroup {
  return {
    ...group,
    selectedIds: selected ? group.garments.map((item) => item.id) : [],
  };
}

export function selectionTotals(groups: OrderGroup[]) {
  let orders = 0;
  let garments = 0;
  for (const group of groups) {
    if (group.selectedIds.length === 0) continue;
    orders += 1;
    garments += group.selectedIds.length;
  }
  return { orders, garments };
}

export async function collectPages<T>(
  loadPage: (page: number, size: number) => Promise<{ rows: T[]; total?: number }>,
  size = PAGE_SIZE
): Promise<T[]> {
  const all: T[] = [];
  let page = 0;
  let total = Number.POSITIVE_INFINITY;
  while (all.length < total) {
    const result = await loadPage(page, size);
    const rows = result.rows || [];
    if (typeof result.total === "number" && result.total >= 0) total = result.total;
    all.push(...rows);
    if (rows.length === 0 || rows.length < size) break;
    page += 1;
    if (page > 100) break;
  }
  return all;
}
