import { useEffect, useRef } from "react";
import {
  orderStream,
  type OrderUpdatedEvent,
} from "@/services/api/orderStream";

export type UseOrderStreamOptions = {
  /** Root layout owns the single socket for the logged-in session. */
  session?: boolean;
  /**
   * Selected store or factory id. Pass `null` while the staff screen is
   * mounted but nothing is selected yet. Omit on customer screens.
   */
  storeId?: string | null;
  onReady?: () => void;
  onOrderUpdated?: (event: OrderUpdatedEvent) => void;
};

/**
 * Shared order stream.
 * Call `{ session: true }` once from the root layout.
 * Staff/factory home passes `storeId`. Screens pass refetch/patch handlers.
 * All of them share one socket.
 */
export function useOrderStream(options?: UseOrderStreamOptions): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!optionsRef.current?.session) return;
    return orderStream.attachSession();
  }, [options?.session]);

  useEffect(() => {
    if (!options || !Object.prototype.hasOwnProperty.call(options, "storeId")) {
      return;
    }
    return orderStream.setStaffStore(options.storeId ?? null);
  }, [options?.storeId]);

  useEffect(() => {
    if (!optionsRef.current?.onReady && !optionsRef.current?.onOrderUpdated) {
      return;
    }
    return orderStream.subscribe({
      onReady: () => optionsRef.current?.onReady?.(),
      onOrderUpdated: (event) => optionsRef.current?.onOrderUpdated?.(event),
    });
  }, []);
}
