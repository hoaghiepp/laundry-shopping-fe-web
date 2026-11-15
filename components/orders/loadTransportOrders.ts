import { isCancelledLikeStatus } from "@/components/orders/utils/orderHelpers";
import { logisticService } from "@/services/api/logisticService";
import { orderService } from "@/services/api/orderService";
import {
  collectPages,
  FACTORY_RETURN_STATUSES,
  groupByOrder,
  OrderGroup,
  TransportDirection,
} from "@/utils/transportGroups";

async function searchAll(body: { current_store_id: string; status: string }) {
  return collectPages(async (page, size) => {
    const response = await logisticService.searchTrackingItems(body, { page, size });
    const total = Number(response?.meta?.total);
    return {
      rows: response?.data || [],
      total: Number.isFinite(total) ? total : undefined,
    };
  });
}

/**
 * Attaches customer info. Returns null when the hub must not ship the order:
 * a cancelled/rejected order's garments go back to the customer, not to the factory.
 * Factory-side groups are kept, since those garments still have to return to the hub.
 */
async function withCustomer(
  group: OrderGroup,
  direction: TransportDirection
): Promise<OrderGroup | null> {
  try {
    const response = await orderService.getStaffOrderById(group.orderId);
    const order = response?.data;
    if (direction === "hub" && isCancelledLikeStatus(order?.status)) return null;
    const name = String(order?.shipping_full_name_snapshot || "").trim();
    const phone = String(order?.shipping_phone_number_snapshot || "").trim();
    if (!name && !phone) return group;
    return { ...group, customerName: name, customerPhone: phone };
  } catch {
    return group;
  }
}

export async function loadTransportOrders(
  storeId: string,
  direction: TransportDirection
): Promise<OrderGroup[]> {
  const groups =
    direction === "hub"
      ? groupByOrder(
          await searchAll({ current_store_id: storeId, status: "TAGGED" }),
          "hub"
        )
      : groupByOrder(
          (
            await Promise.all(
              FACTORY_RETURN_STATUSES.map((status) =>
                searchAll({ current_store_id: storeId, status })
              )
            )
          ).flat(),
          "factory"
        );
  const enriched = await Promise.all(
    groups.map((group) => withCustomer(group, direction))
  );
  return enriched.filter((group): group is OrderGroup => group !== null);
}
