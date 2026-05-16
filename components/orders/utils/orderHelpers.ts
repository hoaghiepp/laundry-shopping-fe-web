import { OrderCardData } from "@/components/store/OrderCard";
import { IncidentStatus, OrderStatus, PaymentStatus, ServiceOrderItemStatus } from "@/constants/enum";
import { Order } from "@/services/api/orderService";
import { formatCurrencyVND } from "@/utils/format";
import { getPaymentStatusBadge } from "./orderUtils";

export type OrderTab =
  | "new"
  | "processing"
  | "waiting_transport"
  | "waiting_return"
  | "finished"
  | "cancelled";

// Helper to check if order contains only goods (no services)
export const isOnlyGoodsOrder = (order: Order): boolean => {
  if (!order.order_items || order.order_items.length === 0) {
    return true; // Default to goods if no items
  }

  return order.order_items.every((item: any) => {
    const productType = item.product_type || item.type || "GOODS";
    return productType === "GOODS";
  });
};

// Map OrderStatus to OrderTab status
export const mapOrderStatusToTab = (
  status: OrderStatus,
  order?: Order
): OrderTab | "exception" | null => {
  switch (status) {
    case OrderStatus.CREATED:
      return "new";
    case OrderStatus.PROCESSING:
      // If order contains only goods, it's "processing"
      // Otherwise (has services), it's "waiting_transport"
      if (order && !isOnlyGoodsOrder(order)) {
        return "waiting_transport";
      }
      return "processing";
    case OrderStatus.NEED_CUSTOMER_CONFIRMATION:
      return "processing";
    case OrderStatus.CUSTOMER_REJECTED:
      return "exception";
    case OrderStatus.FINISHED:
      return "finished";
    default:
      return null;
  }
};

// Helper to check if all service items are done (DELIVERING status)
export const areAllServicesDone = (order: Order): boolean => {
  if (!order.order_items || order.order_items.length === 0) return false;

  const serviceItems = order.order_items.filter((item: any) => {
    const productType = item.product_type || item.type || "GOODS";
    return productType === "SERVICE";
  });

  if (serviceItems.length === 0) return false;

  // All service items must be DELIVERING
  return serviceItems.every(
    (item: any) =>
      item.service_status === ServiceOrderItemStatus.DELIVERING ||
      item.status === ServiceOrderItemStatus.DELIVERING
  );
};

// Helper to map order items to card items
export const mapOrderItemsToCardItems = (
  orderItems: any[],
  filterGoodsOnly?: boolean
): OrderCardData["items"] => {
  if (!orderItems || orderItems.length === 0) return [];

  // Filter to only goods if requested
  const itemsToMap = filterGoodsOnly
    ? orderItems.filter((item) => {
        const productType = item.product_type || item.type || "GOODS";
        return productType === "GOODS";
      })
    : orderItems;

  return itemsToMap.map((item) => {
    // Determine icon based on product type
    const productType = item.product_type || item.type || "GOODS";
    const icon = productType === "SERVICE" ? "tshirt" : "box-open";

    // Build item name with quantity and unit
    const quantity =
      item.adjusted_quantity || item.confirmed_qty || item.initial_qty || 1;
    const unit = item.unit || "cái";
    const productName = item.product_name || item.name || "Sản phẩm";
    const name = `${productName} (${quantity} ${unit})`;

    // Add variant info as note if available
    const note = item.product_variant || item.variant || undefined;

    return {
      icon,
      name,
      note,
      product_type: productType,
      quantity: typeof quantity === "number" ? quantity : parseFloat(quantity) || 0,
      adjusted_quantity: item.adjusted_quantity !== undefined && item.adjusted_quantity !== null
        ? (typeof item.adjusted_quantity === "number" ? item.adjusted_quantity : parseFloat(item.adjusted_quantity) || 0)
        : undefined,
    };
  });
};

// Helper to calculate COD amount
export const calculateCODAmount = (order: Order): number => {
  if (order.payment_status === PaymentStatus.PAID) {
    return 0;
  }
  // COD = final_total - wallet_deduction - package_deduction
  return (
    order.final_total -
    (order.wallet_deduction || 0) -
    (order.package_deduction || 0)
  );
};

// Helper to calculate total weight from service items
export const calculateServiceWeights = (
  orderItems: any[]
): {
  totalWeight: { value: number; unit: string } | undefined;
  totalWeightAdjusted: { value: number; unit: string } | undefined;
} => {
  if (!orderItems || orderItems.length === 0) {
    return { totalWeight: undefined, totalWeightAdjusted: undefined };
  }

  // Filter only SERVICE items
  const serviceItems = orderItems.filter((item: any) => {
    const productType = item.product_type || item.type || "GOODS";
    return productType === "SERVICE";
  });

  if (serviceItems.length === 0) {
    return { totalWeight: undefined, totalWeightAdjusted: undefined };
  }

  // Calculate total weight (sum of quantity/initial_qty)
  let totalWeight = 0;
  // Calculate total weight adjusted (sum of adjusted_quantity or quantity)
  let totalWeightAdjusted = 0;
  let unit = "kg"; // Default unit, will use the first service item's unit if available

  serviceItems.forEach((item: any) => {
    // Get unit from first service item
    if (unit === "kg" && item.unit) {
      unit = item.unit;
    }

    // Calculate total weight (original quantity)
    const quantity =
      item.quantity || item.initial_qty || item.confirmed_qty || 0;
    totalWeight += typeof quantity === "number" ? quantity : parseFloat(quantity) || 0;

    // Calculate total weight adjusted (adjusted_quantity or quantity)
    const adjustedQty =
      item.adjusted_quantity !== undefined && item.adjusted_quantity !== null
        ? item.adjusted_quantity
        : quantity;
    totalWeightAdjusted +=
      typeof adjustedQty === "number"
        ? adjustedQty
        : parseFloat(adjustedQty) || 0;
  });

  return {
    totalWeight:
      totalWeight > 0 ? { value: totalWeight, unit } : undefined,
    totalWeightAdjusted:
      totalWeightAdjusted > 0
        ? { value: totalWeightAdjusted, unit }
        : undefined,
  };
};

// Helper to format created time with full date and time
export const formatCreatedTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);

    // Format: "25/12/2024 14:30"
    const formattedDate = date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const formattedTime = date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Add day of week for better context
    const dayOfWeek = date.toLocaleDateString("vi-VN", { weekday: "short" });

    return `${dayOfWeek}, ${formattedDate} ${formattedTime}`;
  } catch {
    return dateString;
  }
};

// Helper to format relative time (x ngày trước)
export const formatRelativeTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Show relative time
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return "Hôm qua";
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} tuần trước`;
    }
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} tháng trước`;
    }
    const years = Math.floor(diffDays / 365);
    return `${years} năm trước`;
  } catch {
    return "";
  }
};

// Map Order to OrderCardData
export const mapOrderToCardData = (
  order: Order,
  onOrderPress: (order: Order) => void,
  overrideStatus?: OrderCardData["status"],
  filterGoodsOnly?: boolean
): OrderCardData | null => {
  const tabStatus =
    overrideStatus || mapOrderStatusToTab(order.status, order);
  if (!tabStatus || tabStatus === "exception") {
    // Handle exception orders separately or skip
    if (tabStatus === "exception") {
      const cancelledPaymentBadge =
        order.status === OrderStatus.CANCELLED
          ? { text: "Đã hủy", color: "#991B1B", bgColor: "#FEE2E2" }
          : undefined;

      return {
        id: order.code,
        status: "exception",
        customerName:
          order.shipping_full_name_snapshot ||
          `Khách hàng ${order.customer_id.substring(0, 8)}`,
        customerPhone: order.shipping_phone_number_snapshot || "N/A",
        items: mapOrderItemsToCardItems(order.order_items || [], filterGoodsOnly),
        note: order.note || "Cần xác nhận từ khách hàng",
        totalPrice: formatCurrencyVND(order.final_total ?? 0),
        paymentStatusBadge:
          cancelledPaymentBadge ?? getPaymentStatusBadge(order.payment_status),
        createdTime: order.created_date
          ? formatCreatedTime(order.created_date)
          : undefined,
        relativeTime: order.created_date
          ? formatRelativeTime(order.created_date)
          : undefined,
      };
    }
    return null;
  }

  const cancelledPaymentBadge =
    order.status === OrderStatus.CANCELLED
      ? { text: "Đã hủy", color: "#991B1B", bgColor: "#FEE2E2" }
      : undefined;

  const cardData: OrderCardData = {
    id: order.code,
    status: tabStatus,
    customerName:
      order.shipping_full_name_snapshot ||
      `Khách hàng ${order.customer_id.substring(0, 8)}`,
    customerPhone: order.shipping_phone_number_snapshot || "N/A",
    items: mapOrderItemsToCardItems(order.order_items || [], filterGoodsOnly),
    note: order.note,
    totalPrice: formatCurrencyVND(order.final_total ?? 0),
    paymentStatusBadge:
      cancelledPaymentBadge ?? getPaymentStatusBadge(order.payment_status),
    createdTime: order.created_date
      ? formatCreatedTime(order.created_date)
      : undefined,
    relativeTime: order.created_date
      ? formatRelativeTime(order.created_date)
      : undefined,
  };

  // Calculate and add weights for orders with services (only if not filtering goods only)
  if (!filterGoodsOnly && !isOnlyGoodsOrder(order) && order.order_items) {
    const weights = calculateServiceWeights(order.order_items);
    if (weights.totalWeight) {
      cardData.totalWeight = weights.totalWeight;
    }
    if (weights.totalWeightAdjusted) {
      cardData.totalWeightAdjusted = weights.totalWeightAdjusted;
    }
  }

  // Add payment status badge for unpaid/partial paid orders
  if (
    order.payment_status === PaymentStatus.UNPAID ||
    order.payment_status === PaymentStatus.PARTIAL_PAID
  ) {
    const codAmount = calculateCODAmount(order);
    if (codAmount > 0) {
      cardData.amount = formatCurrencyVND(codAmount);
    }

    if (order.payment_status === PaymentStatus.PARTIAL_PAID) {
      cardData.specialBadge = {
        text: "Đã thanh toán một phần",
        color: "#92400E",
        bgColor: "#FEF3C7",
        icon: "exclamation-circle",
      };
    }
  }

  // Add split shipment badge if applicable
  if (order.is_split_shipment) {
    cardData.specialBadge = {
      text: "Giao lẻ",
      color: "#1E40AF",
      bgColor: "#DBEAFE",
      icon: "box-open",
    };
  }

  // Incident warning badge — only for pending (CREATED) incidents
  const pendingIncidents = Array.isArray((order as any)?.incidents)
    ? ((order as any).incidents as any[]).filter(
        (i: any) => i?.status === IncidentStatus.CREATED
      )
    : [];
  if (pendingIncidents.length > 0) {
    cardData.specialBadge = {
      text: `Sự cố (${pendingIncidents.length})`,
      color: "#991B1B",
      bgColor: "#FEE2E2",
      icon: "exclamation-triangle",
    };
  }

  // Add action buttons based on status
  if (tabStatus === "new") {
    cardData.actionButton = {
      text: "Xử lý ngay",
      onPress: () => onOrderPress(order),
    };
  } else if (tabStatus === "wait_confirm") {
    cardData.actionButton = {
      text: "Xử lý ngay",
      onPress: () => onOrderPress(order),
    };
  } else if (tabStatus === "processing") {
    cardData.actionButton = {
      text: "Tiếp tục",
      onPress: () => onOrderPress(order),
    };
  } else if (tabStatus === "waiting_transport") {
    cardData.actionButton = {
      text: "Xem chi tiết",
      onPress: () => onOrderPress(order),
    };
  } else if (tabStatus === "waiting_return") {
    cardData.actionButton = {
      text: "Trả hàng",
      onPress: () => onOrderPress(order),
    };
  } else if (tabStatus === "customer_rejected_waiting_return") {
    cardData.actionButton = {
      text: "Gọi xe",
      onPress: () => onOrderPress(order),
    };
  } else if (order.status === OrderStatus.CUSTOMER_REJECTED) {
    cardData.actionButton = {
      text: "Gọi xe",
      onPress: () => onOrderPress(order),
    };
  }

  return cardData;
};

