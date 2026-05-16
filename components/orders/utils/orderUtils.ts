import {
  GoodsOrderItemStatus,
  OrderStatus,
  PaymentStatus,
  ServiceOrderItemStatus,
} from "@/constants/enum";
import { Order } from "@/services/api/orderService";
import { FormatUtils } from "@/utils/format";

export interface DisplayOrder {
  id: string;
  orderId: string;
  status: string;
  statusColor: string;
  statusBg: string;
  time: string;
  dateTime: string;
  description: string;
  fullAddress: string;
  items: string;
  price: string;
  paymentMethod: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  isException?: boolean;
  originalStatus: OrderStatus;
  firstItemImage?: string;
  remainingItemImages: string[];
  totalItemCount: number;
  orderItems: any[];
  storeName?: string;
  isNeedShipment?: boolean;
  isSplitShipment?: boolean;
  isDelivering?: boolean;
}

export const getOrderStatusDisplay = (
  status: OrderStatus
): {
  text: string;
  color: string;
  bg: string;
  icon: string;
  iconBg: string;
  iconColor: string;
} => {
  switch (status) {
    case OrderStatus.CREATED:
      return {
        text: "Đã tạo",
        color: "#6B7280",
        bg: "#F3F4F6",
        icon: "file-invoice",
        iconBg: "#F3F4F6",
        iconColor: "#6B7280",
      };
    case OrderStatus.NEED_CUSTOMER_CONFIRMATION:
      return {
        text: "Cần xác nhận",
        color: "#F59E0B",
        bg: "#FEF3C7",
        icon: "exclamation-circle",
        iconBg: "#FEF3C7",
        iconColor: "#F59E0B",
      };
    case OrderStatus.CUSTOMER_REJECTED:
      return {
        text: "Đã từ chối",
        color: "#B91C1C",
        bg: "#FEE2E2",
        icon: "times-circle",
        iconBg: "#FEE2E2",
        iconColor: "#EF4444",
      };
    case OrderStatus.PROCESSING:
      return {
        text: "Đang xử lý",
        color: "#1D4ED8",
        bg: "#DBEAFE",
        icon: "cog",
        iconBg: "#DBEAFE",
        iconColor: "#1D4ED8",
      };
    case OrderStatus.CANCELLED:
      return {
        text: "Đã hủy",
        color: "#6B7280",
        bg: "#F3F4F6",
        icon: "ban",
        iconBg: "#F3F4F6",
        iconColor: "#6B7280",
      };
    default:
      return {
        text: OrderStatus[status] || "Không xác định",
        color: "#6B7280",
        bg: "#F3F4F6",
        icon: "question-circle",
        iconBg: "#F3F4F6",
        iconColor: "#6B7280",
      };
  }
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const formatDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
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
    return `${formattedDate} ${formattedTime}`;
  } catch {
    return dateString;
  }
};

export const formatPrice = (amount: number): string => {
  return FormatUtils.toVndCurrency(amount);
};

export const getPaymentMethodDisplay = (paymentStatus: PaymentStatus): string => {
  switch (paymentStatus) {
    case PaymentStatus.PAID:
      return "Đã thanh toán";
    case PaymentStatus.PARTIAL_PAID:
      return "Thanh toán một phần";
    case PaymentStatus.UNPAID:
      return "Chưa thanh toán";
    case PaymentStatus.REFUNDED:
      return "Đã hoàn tiền";
    default:
      return "";
  }
};

/** Badge colors aligned with OrderDetailScreen payment pills */
export function getPaymentStatusBadge(
  status: PaymentStatus | string | undefined
): { text: string; color: string; bgColor: string } | undefined {
  if (status == null || status === "") return undefined;
  switch (status as PaymentStatus) {
    case PaymentStatus.UNPAID:
      return { text: "Chưa thanh toán", color: "#B91C1C", bgColor: "#FEE2E2" };
    case PaymentStatus.PARTIAL_PAID:
      return { text: "Thanh toán một phần", color: "#92400E", bgColor: "#FEF3C7" };
    case PaymentStatus.PAID:
      return { text: "Đã thanh toán", color: "#059669", bgColor: "#D1FAE5" };
    case PaymentStatus.REFUNDED:
      return { text: "Đã hoàn tiền", color: "#4B5563", bgColor: "#E5E7EB" };
    default:
      return {
        text: typeof status === "string" ? status : "Không rõ",
        color: "#6B7280",
        bgColor: "#F3F4F6",
      };
  }
}

export const mapOrderToDisplay = (
  order: Order,
  hubNames: Map<string, string>
): DisplayOrder => {
  const statusDisplay = getOrderStatusDisplay(order.status);
  const isException =
    order.status === OrderStatus.NEED_CUSTOMER_CONFIRMATION

  // Extract item images
  const orderItems = order.order_items || [];
  const itemImages = orderItems
    .map((item: any) => item.product_image || item.product_thumbnail_url)
    .filter((img: string | undefined) => img && img.trim() !== "");

  const firstItemImage = itemImages.length > 0 ? itemImages[0] : undefined;
  const remainingItemImages = itemImages.slice(1);
  const totalItemCount = orderItems.reduce(
    (sum: number, item: any) => sum + (item.quantity || 1),
    0
  );

  // Check if any item is in delivering/shipping state
  const isDelivering = orderItems.some((item: any) => {
    const goodsStatus = item.goods_status as GoodsOrderItemStatus | undefined;
    const serviceStatus =
      item.service_status as ServiceOrderItemStatus | undefined;
    return (
      goodsStatus === GoodsOrderItemStatus.SHIPPING ||
      serviceStatus === ServiceOrderItemStatus.DELIVERING
    );
  });

  // Get hub name from map, fallback to hub_id if not found
  const hubName = order.hub_id
    ? hubNames.get(order.hub_id) || `Hub ${order.hub_id.substring(0, 8)}`
    : undefined;

  // Build full address
  const fullAddressParts = [
    order.shipping_address_detail_snapshot,
    order.shipping_ward_snapshot,
    order.shipping_district_snapshot,
    order.shipping_province_snapshot,
  ].filter(Boolean);
  const fullAddress = fullAddressParts.length > 0
    ? fullAddressParts.join(", ")
    : "Không có địa chỉ";

  return {
    id: order.id,
    orderId: order.code,
    status: statusDisplay.text,
    statusColor: statusDisplay.color,
    statusBg: statusDisplay.bg,
    time: formatDate(order.created_date),
    dateTime: formatDateTime(order.created_date),
    description: order.shipping_address_detail_snapshot || "Không có địa chỉ",
    fullAddress: fullAddress,
    items: order.note || "Đơn hàng",
    price: formatPrice(order.final_total),
    paymentMethod: getPaymentMethodDisplay(order.payment_status),
    icon: statusDisplay.icon,
    iconBg: statusDisplay.iconBg,
    iconColor: statusDisplay.iconColor,
    isException,
    originalStatus: order.status,
    firstItemImage,
    remainingItemImages,
    totalItemCount,
    orderItems: orderItems,
    storeName: hubName,
    isNeedShipment: order.is_need_shipment,
    isSplitShipment: order.is_split_shipment,
    isDelivering,
  };
};

export const isOrderActive = (status: OrderStatus): boolean => {
  return status !== OrderStatus.CANCELLED;
};

