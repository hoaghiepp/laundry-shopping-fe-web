import {
  DiscountType,
  IncidentStatus,
  IncidentType,
  OrderStatus,
  PaymentStatus,
  ProductType,
  SecureStoreKeys
} from "@/constants/enum";
import {
  ConfirmSurchargeRequest,
  customerAddressService,
  CustomerProfile,
  customerService,
} from "@/services/api/customerService";
import { Order, orderService } from "@/services/api/orderService";
import { packageService } from "@/services/api/packageProductService";
import { cacheManager } from "@/services/cache";
import { formatCurrencyVND } from "@/utils/format";
import { FontAwesome5 } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as SecureStore from "@/lib/secureStorage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Extended Order interface with order items
export interface OrderItem {
  id: string;
  product_id: string;
  product_name?: string;
  product_image?: string;
  product_thumbnail_url?: string;
  product_variant?: string;
  product_type?: string;
  quantity: number;
  adjusted_quantity?: number;
  unit_price: number;
  original_price?: number;
  total_price: number;
  unit?: string;
}

export interface OrderLog {
  id: string;
  order_id: string;
  old_status?: OrderStatus;
  new_status: OrderStatus;
  note?: string;
  created_by: string;
  created_date: string;
}

export interface OrderDetail extends Order {
  order_items?: OrderItem[];
  order_logs?: OrderLog[];
  promotion_name?: string;
  promotion_discount?: number;
}

interface TimelineEvent {
  time: string;
  title: string;
  status: "completed" | "current" | "pending";
  isException?: boolean;
  note?: string;
}

interface OrderDetailScreenProps {
  order: OrderDetail;
  onBack: () => void;
  onContinue?: () => void;
  onReturn?: () => void;
  isWaitingReturn?: boolean;
  onReturnWithShipping?: () => void;
  onReturnWithStoreTransport?: () => void;
}

// Helper to get status display info
const getStatusDisplay = (status: OrderStatus) => {
  switch (status) {
    case OrderStatus.CREATED:
      return {
        text: "Đã tạo",
        color: "#6B7280",
        bg: "#F3F4F6",
        icon: "file-invoice",
      };
    case OrderStatus.NEED_CUSTOMER_CONFIRMATION:
      return {
        text: "Cần xác nhận",
        color: "#F59E0B",
        bg: "#FEF3C7",
        icon: "exclamation-circle",
      };
    case OrderStatus.CUSTOMER_REJECTED:
      return {
        text: "Đã từ chối",
        color: "#B91C1C",
        bg: "#FEE2E2",
        icon: "times-circle",
      };
    // case OrderStatus.CONFIRMED:
    //   return { text: 'Đã xác nhận', color: '#059669', bg: '#D1FAE5', icon: 'check-circle' };
    // case OrderStatus.PICKED_UP:
    //   return { text: 'Đã lấy hàng', color: '#2563EB', bg: '#DBEAFE', icon: 'truck-pickup' };
    // case OrderStatus.AT_HUB:
    //   return { text: 'Tại Hub', color: '#7C3AED', bg: '#EDE9FE', icon: 'warehouse' };
    // case OrderStatus.AT_FACTORY:
    //   return { text: 'Tại Xưởng', color: '#DC2626', bg: '#FEE2E2', icon: 'industry' };
    case OrderStatus.PROCESSING:
      return {
        text: "Đang xử lý",
        color: "#1D4ED8",
        bg: "#DBEAFE",
        icon: "spinner",
      };
    // case OrderStatus.READY_TO_DELIVER:
    //   return { text: 'Sẵn sàng giao', color: '#059669', bg: '#D1FAE5', icon: 'box-open' };
    // case OrderStatus.DELIVERING:
    //   return { text: 'Đang giao', color: '#2563EB', bg: '#DBEAFE', icon: 'truck' };
    // case OrderStatus.DELIVERED:
    //   return { text: 'Đã giao', color: '#059669', bg: '#D1FAE5', icon: 'handshake' };
    // case OrderStatus.COMPLETED:
    //   return { text: 'Hoàn thành', color: '#059669', bg: '#D1FAE5', icon: 'check-double' };
    case OrderStatus.CANCELLED:
      return { text: "Đã hủy", color: "#6B7280", bg: "#E5E7EB", icon: "ban" };
    default:
      return {
        text: "Không rõ",
        color: "#6B7280",
        bg: "#E5E7EB",
        icon: "question-circle",
      };
  }
};

// Helper to get payment status display
const getPaymentStatusDisplay = (status: PaymentStatus) => {
  switch (status) {
    case PaymentStatus.UNPAID:
      return { text: "Chưa thanh toán", color: "#B91C1C", bg: "#FEE2E2" };
    case PaymentStatus.PARTIAL_PAID:
      return { text: "Thanh toán một phần", color: "#F59E0B", bg: "#FEF3C7" };
    case PaymentStatus.PAID:
      return { text: "Đã thanh toán", color: "#059669", bg: "#D1FAE5" };
    case PaymentStatus.REFUNDED:
      return { text: "Đã hoàn tiền", color: "#6B7280", bg: "#E5E7EB" };
    default:
      return { text: "Không rõ", color: "#6B7280", bg: "#E5E7EB" };
  }
};

// Helper to format date
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};

// Helper to build full shipping address
const getFullShippingAddress = (order: OrderDetail): string => {
  const parts = [
    order.shipping_address_detail_snapshot,
    order.shipping_ward_snapshot,
    order.shipping_district_snapshot,
    order.shipping_province_snapshot,
  ].filter(Boolean);

  if (parts.length === 0) {
    return "Chưa có địa chỉ";
  }

  return parts.join(", ");
};

// Generate timeline events from order logs
const generateTimelineEvents = (order: OrderDetail): TimelineEvent[] => {
  if (!order.order_logs || order.order_logs.length === 0) {
    // Fallback to current status if no logs
    const statusDisplay = getStatusDisplay(order.status);
    return [
      {
        time: formatDate(order.created_date),
        title: statusDisplay.text,
        status: "current",
      },
    ];
  }

  // Sort logs by created_date (oldest first)
  const sortedLogs = [...order.order_logs].sort(
    (a, b) =>
      new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
  );

  const events: TimelineEvent[] = sortedLogs.map((log, index) => {
    const isLast = index === sortedLogs.length - 1;
    const statusDisplay = getStatusDisplay(log.new_status);
    const isException =
      log.new_status === OrderStatus.NEED_CUSTOMER_CONFIRMATION;

    return {
      time: formatDate(log.created_date),
      title: statusDisplay.text,
      status: isLast ? "current" : "completed",
      isException,
      note: log.note,
    };
  });

  return events;
};

export const OrderDetailScreen: React.FC<OrderDetailScreenProps> = ({
  order: initialOrder,
  onBack,
  onContinue,
  onReturn,
  isWaitingReturn = false,
  onReturnWithShipping,
  onReturnWithStoreTransport,
}) => {
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [orderDetail, setOrderDetail] = useState<OrderDetail>(initialOrder);
  const [loading, setLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [processingIncidents, setProcessingIncidents] = useState<Set<string>>(new Set());
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isBatchProcessingIncidents, setIsBatchProcessingIncidents] = useState(false);
  const [isIncidentsExpanded, setIsIncidentsExpanded] = useState(true);
  const [savedPromotions, setSavedPromotions] = useState<any[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<any | null>(null);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionLoading, setPromotionLoading] = useState(false);
  const [customerPackages, setCustomerPackages] = useState<any[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<any[]>([]);
  const [isPackagesExpanded, setIsPackagesExpanded] = useState(false);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onBack();
        return true; // Prevent default behavior (exit app)
      }
    );

    return () => backHandler.remove();
  }, [onBack]);

  useEffect(() => {
    console.log('selectedPackages', selectedPackages);
  }, [selectedPackages]);

  // Fetch order with logs function
  const fetchOrderWithLogs = async () => {
    try {
      setLoading(true);
      console.log(
        "fetchOrderWithLogs - Fetching order with code:",
        initialOrder.code
      );

      // Set initial order immediately to show correct order code
      setOrderDetail(initialOrder);

      // Get customer ID from secure store
      const profileJson = await SecureStore.getItemAsync(
        SecureStoreKeys.CUSTOMER_PROFILE
      );
      if (!profileJson) {
        console.log(
          "fetchOrderWithLogs - No profile found, using initialOrder"
        );
        return;
      }

      const profile: CustomerProfile = JSON.parse(profileJson);
      console.log(
        "fetchOrderWithLogs - Customer ID:",
        profile.id,
        "Order code:",
        initialOrder.code
      );
      // Search order by code with logs
      const response = await orderService.searchCustomerOrders(
        {
          code: initialOrder.code,
          customer_id: profile.id,
          fetch_order_items: true,
          fetch_order_logs: true,
        },
        { page: 0, size: 1 }
      );

      console.log("fetchOrderWithLogs - Response:", response);

      if (response.data && response.data.length > 0) {
        console.log(
          "fetchOrderWithLogs - Setting order:",
          response.data[0].code
        );
        setOrderDetail(response.data[0] as OrderDetail);
      } else {
        console.log("fetchOrderWithLogs - No data, using initialOrder");
        setOrderDetail(initialOrder);
      }
    } catch (error) {
      console.error("Error fetching order with logs:", error);
      // Fallback to initial order if fetch fails
      setOrderDetail(initialOrder);
    } finally {
      setLoading(false);
    }
  };

  // Fetch incidents for the order
  const fetchIncidents = async () => {
    try {
      setLoadingIncidents(true);
      const profileJson = await SecureStore.getItemAsync(
        SecureStoreKeys.CUSTOMER_PROFILE
      );
      if (!profileJson) return;

      const profile: CustomerProfile = JSON.parse(profileJson);
      const response = await customerAddressService.searchIncidents(
        {
          customer_id: profile.id,
          order_id: initialOrder.id,
        },
        { page: 0, size: 100 }
      );

      if (response?.data) {
        setIncidents(response.data);
      }
    } catch (error) {
      console.error("Error fetching incidents:", error);
    } finally {
      setLoadingIncidents(false);
    }
  };

  // Fetch saved promotions
  const fetchSavedPromotions = async () => {
    try {
      setPromotionLoading(true);
      const profileJson = await SecureStore.getItemAsync(
        SecureStoreKeys.CUSTOMER_PROFILE
      );
      if (!profileJson) return;

      const profile: CustomerProfile = JSON.parse(profileJson);
      const response = await customerAddressService.searchPromotionsSaved(
        {
          customer_id: profile.id,
          is_used: false,
          is_expired: false,
        },
        { page: 0, size: 100 }
      );
      if (response?.data && response.data.length > 0) {
        setSavedPromotions(response.data);
      } else {
        setSavedPromotions([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch saved promotions:", error);
      setSavedPromotions([]);
    } finally {
      setPromotionLoading(false);
    }
  };

  // Fetch customer packages
  const fetchCustomerPackages = async () => {
    try {
      setPackagesLoading(true);
      const response = await packageService.customerSearchPackages(
        {},
        { page: 0, size: 100 }
      );
      if (response?.data && response.data.length > 0) {
        // Filter only active packages with remaining uses
        const activePackages = response.data.filter(
          (pkg: any) => pkg.status === "ACTIVE" && (pkg.remaining_count || pkg.remaining_quantity || 0) > 0
        );
        setCustomerPackages(activePackages);
      } else {
        setCustomerPackages([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch customer packages:", error);
      setCustomerPackages([]);
    } finally {
      setPackagesLoading(false);
    }
  };

  // Fetch order details with logs when initialOrder changes
  useEffect(() => {
    console.log("useEffect triggered - initialOrder.code:", initialOrder.code);
    fetchOrderWithLogs();
    fetchIncidents();
  }, [initialOrder.code, initialOrder.id]);

  // Fetch packages and promotions when order needs confirmation (and not for incidents)
  useEffect(() => {
    const hasPendingIncidents = incidents.some(
      (incident) => incident.status === IncidentStatus.CREATED
    );
    if (
      orderDetail.status === OrderStatus.NEED_CUSTOMER_CONFIRMATION &&
      !hasPendingIncidents
    ) {
      fetchSavedPromotions();
      fetchCustomerPackages();
    } else {
      // Reset selections when not in confirmation state
      setSelectedPackages([]);
      setSelectedPromotion(null);
    }
  }, [orderDetail.status, incidents.length]);

  const timelineEvents = generateTimelineEvents(orderDetail);
  const statusDisplay = getStatusDisplay(orderDetail.status);
  const paymentStatusDisplay = getPaymentStatusDisplay(
    orderDetail.payment_status
  );
  const isNeedCustomerConfirmation =
    orderDetail.status === OrderStatus.NEED_CUSTOMER_CONFIRMATION;
  const isException = orderDetail.status === OrderStatus.CUSTOMER_REJECTED;

  // Show only latest status when collapsed
  const displayedTimeline = isTimelineExpanded
    ? timelineEvents
    : timelineEvents.slice(-1);

  // Split order items into goods and services
  const goodsItems =
    orderDetail.order_items?.filter(
      (item) => (item.product_type as ProductType) === ProductType.GOODS
    ) || [];

  const serviceItems =
    orderDetail.order_items?.filter(
      (item) => (item.product_type as ProductType) === ProductType.SERVICE
    ) || [];

  // Calculate package deduction based on selected packages
  const calculatePackageDeduction = (): number => {
    if (!selectedPackages || selectedPackages.length === 0) return 0;
    
    const orderItems = orderDetail.order_items || [];
    
    // Sum up deductions from all selected packages
    return selectedPackages.reduce((total, pkg) => {
      if (!pkg) return total;
      
      // Find the matching service item in the order that matches the package's product_id
      const productId = pkg.product?.id;
      if (!productId) return total;
      
      // Find the service item with matching product_id
      const matchingServiceItem = orderItems.find((item: OrderItem) => {
        return String(item.product_id) === String(productId) && 
               (item.product_type as ProductType) === ProductType.SERVICE;
      });
      
      if (matchingServiceItem) {
        // Deduct the full total_price of the service item (full quantity)
        return total + (matchingServiceItem.total_price || 0);
      }
      
      return total;
    }, 0);
  };

  // Check if package's product.id exists in order items
  const isPackageProductInOrder = (pkg: any): boolean => {
    if (!pkg) return false;
    
    const productId = pkg.product?.id;
    if (!productId) return true; // If no product.id, consider it valid
    
    // Check if any order item has matching product_id
    const orderItems = orderDetail.order_items || [];
    return orderItems.some((item: any) => {
      const itemProductId = item.product_id;
      return String(itemProductId) === String(productId) && itemProductId != null;
    });
  };

  // Check if a package can be selected (no duplicate product.id and product must be in order)
  const canSelectPackage = (pkg: any): boolean => {
    if (!pkg) return false;
    
    // First check if package's product is in the order
    if (!isPackageProductInOrder(pkg)) return false;
    
    const productId = pkg.product?.id;
    if (!productId) return true; // If no product.id, allow selection
    
    // Check if any already selected package (excluding this one) has the same product.id
    const hasDuplicate = selectedPackages.some((selectedPkg) => {
      // Skip the current package (to allow deselection)
      if (selectedPkg.id === pkg.id) return false;
      
      const selectedProductId = selectedPkg.product?.id;
      
      // Compare as strings to handle type mismatches
      return String(selectedProductId) === String(productId) && selectedProductId != null;
    });
    
    return !hasDuplicate;
  };

  // Calculate promotion discount based on selected promotion
  const calculatePromotionDiscount = (): number => {
    if (!selectedPromotion) return 0;
    
    const promotion = selectedPromotion.promotion || selectedPromotion;
    if (!promotion) return 0;

    const subtotal = orderDetail.sub_total || 0;
    
    // Check minimum order value
    if (promotion.min_order_value && subtotal < promotion.min_order_value) {
      return 0;
    }

    if (promotion.discount_type === DiscountType.PERCENTAGE) {
      // Percentage discount
      const discount = (subtotal * promotion.discount_value) / 100;
      // Apply max discount if specified
      if (promotion.max_discount_amount) {
        return Math.min(discount, promotion.max_discount_amount);
      }
      return discount;
    } else {
      // Fixed amount discount
      return Math.min(promotion.discount_value, subtotal);
    }
  };

  // Calculate final total with selected package and promotion
  const calculatedPackageDeduction = calculatePackageDeduction();
  const calculatedPromotionDiscount = calculatePromotionDiscount();
  const calculatedFinalTotal = Math.max(
    0,
    (orderDetail.sub_total || 0) -
      calculatedPromotionDiscount -
      calculatedPackageDeduction +
      (orderDetail.shipping_fee || 0) +
      (orderDetail.additional_fee || 0)
  );

  // Handle confirm with wallet payment
  const handleConfirmWithWallet = async () => {
    try {
      setIsConfirming(true);

      // Fetch newest customer profile to get latest wallet_balance
      const profileResponse = await customerService.getCustomerProfile();
      const customerProfile = profileResponse.data;

      if (!customerProfile) {
        Alert.alert("Lỗi", "Không thể lấy thông tin khách hàng");
        return;
      }

      // Calculate remaining amount to pay (after discounts)
      const packageDeduction = calculatePackageDeduction();
      const promotionDiscount = calculatePromotionDiscount();
      const newFinalTotal = Math.max(
        0,
        (orderDetail.sub_total || 0) -
          promotionDiscount -
          packageDeduction +
          (orderDetail.shipping_fee || 0) +
          (orderDetail.additional_fee || 0)
      );

      const remainingAmount = newFinalTotal - (orderDetail.wallet_deduction || 0);

      // Calculate max wallet payment (min of wallet_balance and remaining amount)
      const maxWalletPayment = Math.min(
        customerProfile.wallet_balance || 0,
        Math.max(0, remainingAmount)
      );

      const walletBalance = customerProfile.wallet_balance || 0;
      const confirmSurchargeRequest: ConfirmSurchargeRequest = {
        wallet_payment_amount: maxWalletPayment,
        customer_package_ids: selectedPackages.map((pkg) => pkg.id),
        customer_promotion_id: selectedPromotion?.id,
      };

      console.log("confirmSurchargeRequest", confirmSurchargeRequest);

      // Check if wallet balance is smaller than real charge
      if (walletBalance < remainingAmount) {
        const shortage = remainingAmount - walletBalance;
        Alert.alert(
          "Số dư ví không đủ",
          `Số dư ví của bạn (${formatCurrencyVND(walletBalance)}) không đủ để thanh toán. Còn thiếu ${formatCurrencyVND(shortage)}. Vui lòng nạp thêm tiền vào ví.`,
          [{ text: "OK" }]
        );
        return;
      }

      // Call confirm surcharge with wallet payment
      await customerService.confirmSurcharge(
        orderDetail.id,
        confirmSurchargeRequest
      );

      // Invalidate customer profile cache to refresh wallet balance
      cacheManager.invalidate("customer:profile");

      // Refresh order details
      await fetchOrderWithLogs();

      // Update customer profile in SecureStore to reflect new wallet balance
      try {
        const updatedProfile = await customerService.getCustomerProfile();
        console.log("updatedProfile", updatedProfile);
        if (updatedProfile?.data) {
          await SecureStore.setItemAsync(
            SecureStoreKeys.CUSTOMER_PROFILE,
            JSON.stringify(updatedProfile.data)
          );
        }
      } catch (error) {
        console.error("Error updating customer profile:", error);
      }

      Alert.alert(
        "Thành công",
        `Đã xác nhận đơn hàng${
          maxWalletPayment > 0
            ? ` và thanh toán ${formatCurrencyVND(maxWalletPayment)} từ ví`
            : ""
        }`,
        [
          {
            text: "OK",
            onPress: () => {
              if (onContinue) {
                onContinue();
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Error confirming order with wallet:", error);
      Alert.alert(
        "Lỗi",
        error.message || "Không thể xác nhận đơn hàng. Vui lòng thử lại."
      );
    } finally {
      setIsConfirming(false);
    }
  };

  // Handle reject surcharge
  const handleRejectSurcharge = async () => {
    try {
      setIsRejecting(true);

      // Call reject surcharge API
      await customerService.rejectSurcharge(orderDetail.id);

      // Refresh order details
      await fetchOrderWithLogs();

      // Update customer profile in SecureStore to reflect any wallet changes
      try {
        const updatedProfile = await customerService.getCustomerProfile();
        if (updatedProfile?.data) {
          await SecureStore.setItemAsync(
            SecureStoreKeys.CUSTOMER_PROFILE,
            JSON.stringify(updatedProfile.data)
          );
        }
      } catch (error) {
        console.error("Error updating customer profile:", error);
      }

      Alert.alert("Thành công", "Đã từ chối điều chỉnh đơn hàng", [
        {
          text: "OK",
          onPress: () => {
            if (onReturn) {
              onReturn();
            }
          },
        },
      ]);
    } catch (error: any) {
      console.error("Error rejecting surcharge:", error);
      Alert.alert(
        "Lỗi",
        error.message || "Không thể từ chối đơn hàng. Vui lòng thử lại."
      );
    } finally {
      setIsRejecting(false);
    }
  };

  // Handle confirm incident
  const handleConfirmIncident = async (incidentId: string) => {
    Alert.alert(
      "Xác nhận sự cố",
      "Bạn có chắc chắn muốn xác nhận sự cố này?",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xác nhận",
          onPress: async () => {
            try {
              setProcessingIncidents((prev) => new Set(prev).add(incidentId));
              await customerAddressService.confirmIncident(incidentId);
              Alert.alert("Thành công", "Đã xác nhận sự cố");
              await fetchIncidents();
              await fetchOrderWithLogs();
            } catch (error: any) {
              console.error("Error confirming incident:", error);
              Alert.alert("Lỗi", error.message || "Không thể xác nhận sự cố. Vui lòng thử lại.");
            } finally {
              setProcessingIncidents((prev) => {
                const newSet = new Set(prev);
                newSet.delete(incidentId);
                return newSet;
              });
            }
          },
        },
      ]
    );
  };

  // Handle reject incident
  const handleRejectIncident = async (incidentId: string) => {
    Alert.alert(
      "Từ chối sự cố",
      "Bạn có chắc chắn muốn từ chối sự cố này? Hành động này không thể hoàn tác.",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Từ chối",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessingIncidents((prev) => new Set(prev).add(incidentId));
              await customerAddressService.rejectIncident(incidentId);
              Alert.alert("Thành công", "Đã từ chối sự cố");
              await fetchIncidents();
              await fetchOrderWithLogs();
            } catch (error: any) {
              console.error("Error rejecting incident:", error);
              Alert.alert("Lỗi", error.message || "Không thể từ chối sự cố. Vui lòng thử lại.");
            } finally {
              setProcessingIncidents((prev) => {
                const newSet = new Set(prev);
                newSet.delete(incidentId);
                return newSet;
              });
            }
          },
        },
      ]
    );
  };

  // Helper to get incident type display
  const getIncidentTypeDisplay = (type: IncidentType) => {
    switch (type) {
      case IncidentType.TEAR:
        return "Rách";
      case IncidentType.COLOR_FADE:
        return "Phai màu";
      case IncidentType.LOST:
        return "Mất hàng";
      default:
        return "Không rõ";
    }
  };

  // Handle confirm all incidents
  const handleConfirmAllIncidents = () => {
    const pendingIncidents = incidents.filter(
      (incident) => incident.status === IncidentStatus.CREATED
    );

    if (pendingIncidents.length === 0) {
      Alert.alert("Thông báo", "Không có sự cố nào cần xác nhận");
      return;
    }

    Alert.alert(
      "Xác nhận tất cả sự cố",
      `Bạn có chắc chắn muốn xác nhận ${pendingIncidents.length} sự cố?`,
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xác nhận",
          style: "default",
          onPress: async () => {
            try {
              console.log("handleConfirmAllIncidents - Confirming all incidents", pendingIncidents);
              setIsBatchProcessingIncidents(true);
              setProcessingIncidents(
                new Set(pendingIncidents.map((i) => i.id))
              );
              await Promise.all(
                pendingIncidents.map((incident) =>
                  customerAddressService.confirmIncident(incident.id)
                )
              );
              Alert.alert("Thành công", "Đã xác nhận tất cả sự cố");
              await fetchIncidents();
              await fetchOrderWithLogs();
            } catch (error: any) {
              console.error("Error confirming all incidents:", error);
              Alert.alert(
                "Lỗi",
                error.message || "Không thể xác nhận sự cố. Vui lòng thử lại."
              );
            } finally {
              setProcessingIncidents(new Set());
              setIsBatchProcessingIncidents(false);
            }
          },
        },
      ]
    );
  };

  // Handle reject all incidents
  const handleRejectAllIncidents = () => {
    const pendingIncidents = incidents.filter(
      (incident) => incident.status === IncidentStatus.CREATED
    );

    if (pendingIncidents.length === 0) {
      Alert.alert("Thông báo", "Không có sự cố nào cần xử lý");
      return;
    }

    Alert.alert(
      "Từ chối tất cả sự cố",
      `Bạn có chắc chắn muốn từ chối ${pendingIncidents.length} sự cố? Hành động này không thể hoàn tác.`,
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Từ chối",
          style: "destructive",
          onPress: async () => {
            try {
              setIsBatchProcessingIncidents(true);
              setProcessingIncidents(
                new Set(pendingIncidents.map((i) => i.id))
              );
              await Promise.all(
                pendingIncidents.map((incident) =>
                  customerAddressService.rejectIncident(incident.id)
                )
              );
              Alert.alert("Thành công", "Đã từ chối tất cả sự cố");
              await fetchIncidents();
              await fetchOrderWithLogs();
            } catch (error: any) {
              console.error("Error rejecting all incidents:", error);
              Alert.alert(
                "Lỗi",
                error.message || "Không thể từ chối sự cố. Vui lòng thử lại."
              );
            } finally {
              setProcessingIncidents(new Set());
              setIsBatchProcessingIncidents(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={1}
        >
          <FontAwesome5 name="arrow-left" size={16} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Chi tiết đơn #{orderDetail.code}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusDisplay.bg },
              ]}
            >
              <FontAwesome5
                name={statusDisplay.icon}
                size={14}
                color={statusDisplay.color}
              />
              <Text style={[styles.statusText, { color: statusDisplay.color }]}>
                {statusDisplay.text}
              </Text>
            </View>
            <View
              style={[
                styles.paymentBadge,
                { backgroundColor: paymentStatusDisplay.bg },
              ]}
            >
              <Text
                style={[
                  styles.paymentText,
                  { color: paymentStatusDisplay.color },
                ]}
              >
                {paymentStatusDisplay.text}
              </Text>
            </View>
          </View>
          <Text style={styles.orderDate}>
            Ngày đặt: {formatDate(orderDetail.created_date)}
          </Text>
        </View>

        {/* Shipping Status - Collapsible */}
        <View style={styles.timelineCard}>
          <TouchableOpacity
            style={styles.timelineHeader}
            onPress={() => setIsTimelineExpanded(!isTimelineExpanded)}
            activeOpacity={1}
          >
            <Text style={styles.timelineHeaderText}>Trạng thái đơn hàng</Text>
            <View style={styles.timelineHeaderRight}>
              {timelineEvents.length > 1 && (
                <Text style={styles.timelineCount}>
                  {isTimelineExpanded
                    ? "Thu gọn"
                    : `${timelineEvents.length} bước`}
                </Text>
              )}
              <FontAwesome5
                name={isTimelineExpanded ? "chevron-up" : "chevron-down"}
                size={12}
                color="#6B7280"
              />
            </View>
          </TouchableOpacity>

          <View style={styles.timeline}>
            {displayedTimeline.map((event, index) => (
              <View key={index} style={styles.timelineItem}>
                <View
                  style={[
                    styles.timelineDot,
                    event.status === "completed" && styles.dotCompleted,
                    event.status === "current" && styles.dotCurrent,
                    event.status === "pending" && styles.dotPending,
                    event.isException && styles.dotException,
                  ]}
                />
                {index < displayedTimeline.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      event.status === "pending" && styles.linePending,
                    ]}
                  />
                )}
                <View style={styles.timelineContent}>
                  {event.time && (
                    <Text style={styles.timelineTime}>{event.time}</Text>
                  )}
                  {event.isException && (
                    <Text style={styles.exceptionLabel}>
                      HÀNH ĐỘNG CẦN THIẾT
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.timelineTitle,
                      event.isException && styles.timelineTitleException,
                      event.status === "pending" && styles.timelineTitlePending,
                    ]}
                  >
                    {event.title}
                  </Text>
                  {event.note && (
                    <Text style={styles.timelineNote}>{event.note}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Shipping Address */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <FontAwesome5 name="map-marker-alt" size={16} color="#2563EB" />
            <Text style={styles.infoTitle}>Địa chỉ giao hàng</Text>
          </View>
          <Text style={styles.infoContent}>
            {getFullShippingAddress(orderDetail)}
          </Text>
        </View>

        {/* Goods Items */}
        {goodsItems.length > 0 && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <FontAwesome5 name="box-open" size={16} color="#2563EB" />
              <Text style={styles.infoTitle}>Hàng hóa</Text>
            </View>
            {goodsItems.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.productCard,
                  index > 0 && styles.productCardBorder,
                ]}
              >
                {/* Product Image */}
                <View style={styles.productImageContainer}>
                  {item.product_image || item.product_thumbnail_url ? (
                    <Image
                      source={{
                        uri: item.product_image || item.product_thumbnail_url,
                      }}
                      style={styles.productImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <FontAwesome5 name="box-open" size={24} color="#D1D5DB" />
                    </View>
                  )}
                </View>

                {/* Product Info */}
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.product_name || `Sản phẩm #${item.product_id}`}
                  </Text>

                  {item.product_variant && (
                    <Text style={styles.productVariant}>
                      Phân loại hàng: {item.product_variant}
                    </Text>
                  )}

                  <Text style={styles.productQuantity}>
                    x{item.quantity} {item.unit || "cái"}
                  </Text>

                  {/* Pricing */}
                  <View style={styles.productPricing}>
                    {item.original_price &&
                      item.original_price > item.unit_price && (
                        <Text style={styles.productOriginalPrice}>
                          {formatCurrencyVND(
                            item.original_price * item.quantity
                          )}
                        </Text>
                      )}
                    <Text style={styles.productPrice}>
                      {formatCurrencyVND(item.total_price)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Service Items */}
        {serviceItems.length > 0 && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <FontAwesome5 name="tshirt" size={16} color="#2563EB" />
              <Text style={styles.infoTitle}>Dịch vụ giặt là</Text>
            </View>

            <View style={styles.serviceDetails}>
              {serviceItems.map((item, index) => (
                <View key={item.id || index} style={{ marginBottom: 12 }}>
                  <View style={styles.serviceRow}>
                    <Text style={styles.serviceName}>
                      {item.product_name || `Dịch vụ #${item.product_id}`}
                    </Text>
                    {item.product_variant && (
                      <View style={styles.packageBadge}>
                        <Text style={styles.packageBadgeText}>
                          {item.product_variant}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.weightsRow}>
                    <View style={[styles.weightBox, styles.actualWeightBox]}>
                      <Text style={styles.actualWeightLabel}>KHÁCH BÁO</Text>
                      <View style={styles.weightInputRow}>
                        <Text style={styles.weightValue}>
                          {String(item.quantity ?? "-")}
                        </Text>
                        <Text style={styles.weightUnit}>
                          {item.unit || "kg"}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.weightBox, styles.actualWeightBox]}>
                      <Text style={styles.actualWeightLabel}>THỰC TẾ</Text>
                      <View style={styles.weightInputRow}>
                        <Text style={styles.weightValue}>
                          {String(
                            item.adjusted_quantity ?? item.quantity ?? "-"
                          )}
                        </Text>
                        <Text style={styles.weightUnit}>
                          {item.unit || "kg"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Pricing */}
                  <View style={styles.servicePricing}>
                    {item.original_price &&
                      item.original_price > item.unit_price && (
                        <Text style={styles.productOriginalPrice}>
                          {formatCurrencyVND(
                            item.original_price *
                              (item.adjusted_quantity || item.quantity)
                          )}
                        </Text>
                      )}
                    <View style={styles.servicePriceContainer}>
                      {item.adjusted_quantity !== undefined &&
                        item.adjusted_quantity !== null &&
                        item.adjusted_quantity !== item.quantity && (
                          <Text style={styles.adjustedPriceLabel}>
                            Giá điều chỉnh:
                          </Text>
                        )}
                      <Text style={styles.productPrice}>
                        {formatCurrencyVND(item.total_price)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Price Breakdown */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <FontAwesome5 name="receipt" size={16} color="#2563EB" />
            <Text style={styles.infoTitle}>Chi tiết thanh toán</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Tạm tính</Text>
            <Text style={styles.priceValue}>
              {formatCurrencyVND(orderDetail.sub_total)}
            </Text>
          </View>

          {/* Show existing discount if no new promotion selected, or show calculated discount */}
          {(calculatedPromotionDiscount > 0 || (orderDetail.discount_amount > 0 && !selectedPromotion)) && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                Giảm giá{" "}
                {selectedPromotion
                  ? `(${(selectedPromotion.promotion || selectedPromotion).name})`
                  : orderDetail.promotion_name
                  ? `(${orderDetail.promotion_name})`
                  : ""}
              </Text>
              <Text style={[styles.priceValue, styles.discountValue]}>
                -{formatCurrencyVND(calculatedPromotionDiscount || orderDetail.discount_amount)}
              </Text>
            </View>
          )}

          {/* Show package deductions - each package in a separate row */}
          {selectedPackages.length > 0 && selectedPackages.map((pkg) => {
            if (!pkg) return null;
            
            const orderItems = orderDetail.order_items || [];
            const productId = pkg.product?.id;
            const packageName = pkg.product?.name || pkg.name || "Gói dịch vụ";
            
            // Find the matching service item to get the actual deduction amount
            const matchingServiceItem = productId 
              ? orderItems.find((item: OrderItem) => {
                  return String(item.product_id) === String(productId) && 
                         (item.product_type as ProductType) === ProductType.SERVICE;
                })
              : null;
            
            const deductionAmount = matchingServiceItem?.total_price || 0;
            
            return (
              <View key={pkg.id} style={styles.priceRow}>
                <Text style={styles.priceLabel} numberOfLines={1} ellipsizeMode="tail">
                  Trừ gói: {packageName}
                </Text>
                <Text style={[styles.priceValue, styles.discountValue]}>
                  -{formatCurrencyVND(deductionAmount)}
                </Text>
              </View>
            );
          })}
          
          {/* Show existing package deduction if no new packages selected */}
          {selectedPackages.length === 0 && orderDetail.package_deduction > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel} numberOfLines={1} ellipsizeMode="tail">
                Trừ gói dịch vụ
              </Text>
              <Text style={[styles.priceValue, styles.discountValue]}>
                -{formatCurrencyVND(orderDetail.package_deduction)}
              </Text>
            </View>
          )}

          {orderDetail.wallet_deduction > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Trừ ví</Text>
              <Text style={[styles.priceValue, styles.discountValue]}>
                -{formatCurrencyVND(orderDetail.wallet_deduction)}
              </Text>
            </View>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Phí vận chuyển</Text>
            <Text style={styles.priceValue}>
              {formatCurrencyVND(orderDetail.shipping_fee)}
            </Text>
          </View>

          {/* {orderDetail.service_fee > 0 && (
            <View style={[styles.priceRow, styles.serviceFeeRow]}>
              <Text style={[styles.priceLabel, styles.serviceFeeLabel]}>
                Phí dịch vụ {orderDetail.is_need_shipment ? "lấy hàng" : ""}
              </Text>
              <Text style={[styles.priceValue, styles.serviceFeeValue]}>
                {formatCurrencyVND(orderDetail.service_fee)}
              </Text>
            </View>
          )} */}

          <View style={[styles.priceRow, styles.additionalFeeRow]}>
            <Text style={[styles.priceLabel, styles.additionalFeeLabel]}>
              Phí bổ sung
            </Text>
            <Text style={[styles.priceValue, styles.additionalFeeValue]}>
              {formatCurrencyVND(orderDetail.additional_fee)}
            </Text>
          </View>

          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>
              {formatCurrencyVND(
                (selectedPackages.length > 0 || selectedPromotion) 
                  ? calculatedFinalTotal 
                  : orderDetail.final_total
              )}
            </Text>
          </View>
        </View>

        {/* Note */}
        {orderDetail.note && (
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <FontAwesome5 name="sticky-note" size={16} color="#2563EB" />
              <Text style={styles.infoTitle}>Ghi chú</Text>
            </View>
            <Text style={styles.infoContent}>{orderDetail.note}</Text>
          </View>
        )}

        {/* Incidents Section */}
        {incidents.length > 0 && (
          <View style={styles.incidentSectionCard}>
            <TouchableOpacity
              style={styles.incidentSectionHeader}
              onPress={() => setIsIncidentsExpanded((prev) => !prev)}
              activeOpacity={0.8}
            >
              <View style={styles.incidentSectionHeaderLeft}>
                <FontAwesome5 name="exclamation-triangle" size={18} color="#DC2626" />
                <Text style={styles.incidentSectionTitle}>SỰ CỐ CẦN XỬ LÝ</Text>
              </View>
              <View style={styles.incidentHeaderRight}>
                <View style={styles.incidentCountBadge}>
                  <Text style={styles.incidentCountText}>{incidents.length}</Text>
                </View>
                <FontAwesome5
                  name={isIncidentsExpanded ? "chevron-up" : "chevron-down"}
                  size={14}
                  color="#DC2626"
                />
              </View>
            </TouchableOpacity>
            {isIncidentsExpanded &&
              (loadingIncidents ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <View style={styles.incidentWarning}>
                    <FontAwesome5 name="info-circle" size={14} color="#DC2626" />
                    <Text style={styles.incidentWarningText}>
                      Vui lòng xem xét và xác nhận/từ chối các sự cố bên dưới
                    </Text>
                  </View>
                  {incidents.map((incident, index) => (
                    <View
                      key={incident.id}
                      style={[
                        styles.incidentCard,
                        index > 0 && styles.incidentCardBorder,
                      ]}
                    >
                      <View style={styles.incidentHeader}>
                        <View style={styles.incidentTypeRow}>
                          <Text style={styles.incidentType}>
                            {getIncidentTypeDisplay(incident.type)}
                          </Text>
                          <View
                            style={[
                              styles.incidentStatusBadge,
                              incident.status === IncidentStatus.CREATED &&
                                styles.incidentStatusCreated,
                              incident.status === IncidentStatus.USER_ACCEPTED &&
                                styles.incidentStatusAccepted,
                              incident.status === IncidentStatus.USER_REJECTED &&
                                styles.incidentStatusRejected,
                            ]}
                          >
                            <Text style={styles.incidentStatusText}>
                              {incident.status === IncidentStatus.CREATED && "Chờ xác nhận"}
                              {incident.status === IncidentStatus.USER_ACCEPTED && "Đã chấp nhận"}
                              {incident.status === IncidentStatus.USER_REJECTED && "Đã từ chối"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {incident.description && (
                        <Text style={styles.incidentDescription}>
                          {incident.description}
                        </Text>
                      )}

                      {incident.image_urls && incident.image_urls.length > 0 && (
                        <View style={styles.incidentImagesContainer}>
                          {incident.image_urls.map((url: string, imgIndex: number) => (
                            <TouchableOpacity
                              key={imgIndex}
                              onPress={() => setFullscreenImage(url)}
                              activeOpacity={0.8}
                            >
                              <Image
                                source={{ uri: url }}
                                style={styles.incidentImage}
                                contentFit="cover"
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Per-incident actions removed; incidents are handled via batch actions below */}
                    </View>
                  ))}

                  {/* Batch Actions for pending incidents */}
                  {incidents.some((i) => i.status === IncidentStatus.CREATED) && (
                    <View style={styles.batchActionsContainer}>
                      <Text style={styles.batchActionsLabel}>Xử lý hàng loạt:</Text>
                      <View style={styles.batchActions}>
                        <TouchableOpacity
                          style={[
                            styles.batchRejectButton,
                            processingIncidents.size > 0 && styles.incidentButtonDisabled,
                          ]}
                          onPress={handleRejectAllIncidents}
                          disabled={processingIncidents.size > 0}
                          activeOpacity={0.8}
                        >
                          <FontAwesome5 name="times-circle" size={16} color="#FFFFFF" />
                          <Text style={styles.batchRejectButtonText}>
                            Từ chối tất cả
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.batchConfirmButton,
                            processingIncidents.size > 0 && styles.incidentButtonDisabled,
                          ]}
                          onPress={handleConfirmAllIncidents}
                          disabled={processingIncidents.size > 0}
                          activeOpacity={0.8}
                        >
                          <FontAwesome5 name="check-circle" size={16} color="#FFFFFF" />
                          <Text style={styles.batchConfirmButtonText}>
                            Xác nhận tất cả
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              ))}
          </View>
        )}

        {/* Return buttons for waiting_return tab */}
        {isWaitingReturn && (onReturnWithShipping || onReturnWithStoreTransport) && (
          <View style={styles.returnActionsCard}>
            <View style={styles.returnActionsHeader}>
              <FontAwesome5 name="undo-alt" size={16} color="#2563EB" />
              <Text style={styles.returnActionsTitle}>Trả hàng cho khách</Text>
            </View>
            <Text style={styles.returnActionsDescription}>
              Chọn phương thức vận chuyển để trả hàng cho khách hàng
            </Text>
            <View style={styles.returnActions}>
              {onReturnWithShipping && (
                <TouchableOpacity
                  style={styles.returnShippingButton}
                  onPress={onReturnWithShipping}
                  activeOpacity={0.8}
                >
                  <FontAwesome5 name="shipping-fast" size={18} color="#FFFFFF" />
                  <Text style={styles.returnShippingButtonText}>
                    Đặt ship
                  </Text>
                </TouchableOpacity>
              )}
              {onReturnWithStoreTransport && (
                <TouchableOpacity
                  style={styles.returnStoreButton}
                  onPress={onReturnWithStoreTransport}
                  activeOpacity={0.8}
                >
                  <FontAwesome5 name="store" size={18} color="#FFFFFF" />
                  <Text style={styles.returnStoreButtonText}>
                    Shop vận chuyển
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Package and Promotion Selection for NEED_CUSTOMER_CONFIRMATION (excluding incident cases) */}
        {isNeedCustomerConfirmation &&
          !incidents.some((i) => i.status === IncidentStatus.CREATED) && (
            <>
              {/* Package Selection */}
              {customerPackages.length > 0 && (
                <View style={styles.packageCard}>
                  <TouchableOpacity
                    style={styles.packageHeader}
                    onPress={() => setIsPackagesExpanded(!isPackagesExpanded)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.packageTitle}>Gói dịch vụ</Text>
                    <View style={styles.packageHeaderRight}>
                      {selectedPackages.length > 0 && !isPackagesExpanded && (
                        <Text style={styles.packageHeaderSummary} numberOfLines={1}>
                          Đã chọn {selectedPackages.length} gói
                        </Text>
                      )}
                      <FontAwesome5
                        name={isPackagesExpanded ? "chevron-up" : "chevron-down"}
                        size={12}
                        color="#6B7280"
                      />
                    </View>
                  </TouchableOpacity>
                  {isPackagesExpanded && (
                    <View style={styles.packageListContainer}>
                      {customerPackages.map((pkg: any) => {
                        const isSelected = selectedPackages.some((selectedPkg) => selectedPkg.id === pkg.id);
                        const isProductInOrder = isPackageProductInOrder(pkg);
                        const canSelect = canSelectPackage(pkg);
                        const isDisabled = !isSelected && (!canSelect || !isProductInOrder);
                        
                        return (
                          <TouchableOpacity
                            key={pkg.id}
                            style={[
                              styles.packageOption,
                              isSelected && styles.packageOptionSelected,
                              isDisabled && styles.packageOptionDisabled,
                            ]}
                            onPress={() => {
                              // Toggle selection
                              if (isSelected) {
                                // Allow deselection
                                setSelectedPackages((prev) =>
                                  prev.filter((selectedPkg) => selectedPkg.id !== pkg.id)
                                );
                              } else {
                                // Check if package product is in order
                                if (!isProductInOrder) {
                                  Alert.alert(
                                    "Không thể chọn",
                                    "Gói dịch vụ này không khớp với sản phẩm trong đơn hàng."
                                  );
                                  return;
                                }
                                
                                // Before adding, check for duplicate product.id
                                const productId = pkg.product?.id;
                                
                                if (productId != null) {
                                  // Check if any selected package has the same product.id
                                  const hasDuplicate = selectedPackages.some((selectedPkg) => {
                                    const selectedProductId = selectedPkg.product?.id;
                                    
                                    // Compare as strings to handle type mismatches
                                    return String(selectedProductId) === String(productId) && selectedProductId != null;
                                  });
                                  
                                  if (hasDuplicate) {
                                    Alert.alert(
                                      "Không thể chọn",
                                      "Bạn đã chọn một gói dịch vụ khác có cùng sản phẩm. Mỗi sản phẩm chỉ có thể sử dụng một gói."
                                    );
                                    return;
                                  }
                                }
                                
                                // Add the package object if no duplicate
                                setSelectedPackages((prev) => [...prev, pkg]);
                              }
                            }}
                            activeOpacity={isDisabled ? 1 : 0.7}
                            disabled={isDisabled}
                          >
                            <View style={styles.packageOptionContent}>
                              <Text style={styles.packageOptionName} numberOfLines={2}>
                                {pkg.product?.name || pkg.name || "Gói dịch vụ"}
                              </Text>
                              <Text style={styles.packageOptionRemaining}>
                                Còn: {pkg.remaining_count || pkg.remaining_quantity || 0} lượt
                              </Text>
                              {/* {pkg.product?.price && (
                                <Text style={styles.packageOptionPrice}>
                                  Giá trị: {formatCurrencyVND(pkg.product.price)}
                                </Text>
                              )} */}
                              {isDisabled && !isSelected && (
                                <Text style={styles.packageOptionDisabledText}>
                                  {!isProductInOrder 
                                    ? "Không khớp với đơn hàng"
                                    : "Đã chọn gói khác cùng loại"}
                                </Text>
                              )}
                            </View>
                            {isSelected && (
                              <FontAwesome5 name="check" size={14} color="#2563EB" />
                            )}
                            {isDisabled && !isSelected && (
                              <FontAwesome5 name="times-circle" size={14} color="#9CA3AF" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Promotion Selection */}
              <View style={styles.promotionCard}>
                <View style={styles.promotionHeader}>
                  <Text style={styles.promotionTitle}>Khuyến mãi</Text>
                  {savedPromotions.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setShowPromotionModal(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.promotionChangeText}>
                        {selectedPromotion ? "Đổi" : "Chọn"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {selectedPromotion ? (
                  <View style={styles.selectedPromotion}>
                    <View style={styles.selectedPromotionInfo}>
                      <Text style={styles.selectedPromotionName}>
                        {(selectedPromotion.promotion || selectedPromotion).name}
                      </Text>
                      <Text style={styles.selectedPromotionCode}>
                        {(selectedPromotion.promotion || selectedPromotion).code}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedPromotion(null)}
                      activeOpacity={0.7}
                      style={styles.deletePromotionButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <FontAwesome5 name="times" size={14} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ) : savedPromotions.length > 0 ? (
                  <TouchableOpacity
                    style={styles.selectPromotionButton}
                    onPress={() => setShowPromotionModal(true)}
                    activeOpacity={0.7}
                  >
                    <FontAwesome5 name="tag" size={14} color="#2563EB" />
                    <Text style={styles.selectPromotionText}>
                      Chọn khuyến mãi
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.noPromotionContainer}>
                    <FontAwesome5 name="tag" size={16} color="#9CA3AF" />
                    <Text style={styles.noPromotionText}>
                      Chưa có khuyến mãi nào
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

        {/* Confirmation section for NEED_CUSTOMER_CONFIRMATION */}
        {isNeedCustomerConfirmation && onContinue && onReturn && (
          <View style={styles.confirmCard}>
            <View style={styles.confirmHeader}>
              <FontAwesome5 name="info-circle" size={14} color="#2563EB" />
              <Text style={styles.confirmHeaderText}>Xác nhận đơn hàng</Text>
            </View>
            <Text style={styles.confirmDescription}>
              Vui lòng xác nhận hoặc từ chối để cửa hàng tiếp tục xử lý đơn hàng
              này.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  isRejecting && styles.cancelButtonDisabled,
                ]}
                onPress={handleRejectSurcharge}
                activeOpacity={1}
                disabled={isRejecting}
              >
                <Text style={styles.cancelButtonText}>
                  {isRejecting ? "Đang xử lý..." : "Từ chối"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  isConfirming && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirmWithWallet}
                activeOpacity={1}
                disabled={isConfirming}
              >
                <Text style={styles.confirmButtonText}>
                  {isConfirming ? "Đang xử lý..." : "Xác nhận"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Exception Card - Only show for rejected / error states */}
        {isNeedCustomerConfirmation && incidents.length > 0 && onContinue && onReturn && (
          <View style={styles.exceptionCard}>
            <View style={styles.exceptionHeader}>
              <FontAwesome5
                name="exclamation-triangle"
                size={14}
                color="#B91C1C"
              />
              <Text style={styles.exceptionHeaderText}>Xác nhận sự cố</Text>
            </View>
            <View style={styles.exceptionBody}>
              <Text style={styles.exceptionDescription}>
                Đơn hàng của bạn cần xác nhận để tiếp tục xử lý.
              </Text>
              <View style={styles.exceptionActions}>
                <TouchableOpacity
                  style={styles.returnButton}
                  onPress={onReturn}
                  activeOpacity={1}
                >
                  <Text style={styles.returnButtonText}>
                    Trả lại (Hoàn tiền)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={onContinue}
                  activeOpacity={1}
                >
                  <Text style={styles.continueButtonText}>Tiếp tục</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.exceptionNote}>
                *Chọn Trả lại: Tiền dịch vụ sẽ được hoàn về Ví ngay lập tức.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Promotion Selection Modal */}
      <Modal
        visible={showPromotionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPromotionModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPromotionModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn khuyến mãi</Text>
              <TouchableOpacity
                onPress={() => setShowPromotionModal(false)}
                activeOpacity={1}
              >
                <FontAwesome5 name="times" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {promotionLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.modalLoadingText}>Đang tải khuyến mãi...</Text>
              </View>
            ) : savedPromotions.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <FontAwesome5 name="tag" size={48} color="#D1D5DB" />
                <Text style={styles.modalEmptyText}>Chưa có khuyến mãi nào</Text>
                <Text style={styles.modalEmptyText}>
                  Lưu khuyến mãi từ trang chủ để sử dụng
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <TouchableOpacity
                  style={[
                    styles.promotionOption,
                    !selectedPromotion && styles.promotionOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedPromotion(null);
                    setShowPromotionModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.promotionOptionContent}>
                    <Text style={styles.promotionOptionName}>Không sử dụng khuyến mãi</Text>
                  </View>
                  {!selectedPromotion && (
                    <FontAwesome5 name="check" size={14} color="#2563EB" />
                  )}
                </TouchableOpacity>

                {savedPromotions.map((savedPromo) => {
                  // Handle new response structure where promotion details are nested
                  const promotion = savedPromo.promotion || savedPromo;
                  const isSelected = selectedPromotion?.id === savedPromo.id;
                  const discountText = promotion.discount_type === DiscountType.PERCENTAGE
                    ? `${promotion.discount_value}%`
                    : formatCurrencyVND(promotion.discount_value);

                  return (
                    <TouchableOpacity
                      key={savedPromo.id}
                      style={[
                        styles.promotionOption,
                        isSelected && styles.promotionOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedPromotion(savedPromo);
                        setShowPromotionModal(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.promotionOptionContent}>
                        <View style={styles.promotionOptionHeader}>
                          <Text style={styles.promotionOptionName}>{promotion.name}</Text>
                          <View style={styles.promotionDiscountBadge}>
                            <Text style={styles.promotionDiscountText}>{discountText}</Text>
                          </View>
                        </View>
                        <Text style={styles.promotionOptionCode}>{promotion.code}</Text>
                        {promotion.min_order_value > 0 && (
                          <Text style={styles.promotionOptionDesc}>
                            Đơn tối thiểu {formatCurrencyVND(promotion.min_order_value)}
                          </Text>
                        )}
                      </View>
                      {isSelected && (
                        <FontAwesome5 name="check" size={14} color="#2563EB" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Fullscreen Image Modal */}
      <Modal
        visible={fullscreenImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
      >
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.fullscreenCloseButton}
            onPress={() => setFullscreenImage(null)}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="times" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.fullscreenImage}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>

      {isBatchProcessingIncidents && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingOverlayContent}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingOverlayText}>
              Đang xử lý tất cả sự cố...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 999,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  paymentText: {
    fontSize: 12,
    fontWeight: "700",
  },
  orderDate: {
    fontSize: 12,
    color: "#6B7280",
  },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  timelineHeaderText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  timelineHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timelineCount: {
    fontSize: 12,
    color: "#6B7280",
  },
  timeline: {
    paddingLeft: 16,
  },
  timelineItem: {
    position: "relative",
    paddingBottom: 24,
  },
  timelineDot: {
    position: "absolute",
    left: -21,
    top: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  dotCompleted: {
    backgroundColor: "#10B981",
  },
  dotCurrent: {
    backgroundColor: "#2563EB",
    width: 16,
    height: 16,
    borderRadius: 8,
    left: -23,
  },
  dotPending: {
    backgroundColor: "#D1D5DB",
  },
  dotException: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  timelineLine: {
    position: "absolute",
    left: -15,
    top: 12,
    width: 2,
    height: "100%",
    backgroundColor: "#E5E7EB",
  },
  linePending: {
    backgroundColor: "#E5E7EB",
  },
  timelineContent: {
    paddingLeft: 8,
  },
  timelineTime: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  exceptionLabel: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "700",
    marginBottom: 2,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  timelineTitleException: {
    color: "#DC2626",
  },
  timelineTitlePending: {
    color: "#9CA3AF",
  },
  timelineNote: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  infoContent: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  productCard: {
    flexDirection: "row",
    paddingVertical: 12,
    gap: 12,
  },
  productCardBorder: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  productImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  productInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    lineHeight: 18,
    marginBottom: 4,
  },
  productVariant: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  serviceQuantityContainer: {
    marginBottom: 8,
  },
  productAdjustedQuantity: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
    marginTop: 2,
  },
  productPricing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  productOriginalPrice: {
    fontSize: 12,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  serviceDetails: {
    backgroundColor: "rgba(239, 246, 255, 0.5)",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    marginTop: 12,
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1F2937",
    flex: 1,
  },
  packageBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  packageBadgeText: {
    fontSize: 10,
    color: "#1E40AF",
    fontWeight: "600",
  },
  weightsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  weightBox: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  actualWeightBox: {
    borderColor: "#BFDBFE",
  },
  actualWeightLabel: {
    fontSize: 9,
    color: "#3B82F6",
    fontWeight: "bold",
    marginBottom: 4,
  },
  weightInputRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  weightValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E40AF",
    textAlign: "center",
  },
  weightUnit: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
  },
  servicePricing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    justifyContent: "flex-end",
  },
  servicePriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  adjustedPriceLabel: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    minHeight: 24,
  },
  priceLabel: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
    marginRight: 12,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    flexShrink: 0,
  },
  discountValue: {
    color: "#059669",
  },
  serviceFeeRow: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginVertical: 2,
  },
  serviceFeeLabel: {
    color: "#2563EB",
    fontWeight: "700",
  },
  serviceFeeValue: {
    color: "#2563EB",
    fontWeight: "700",
  },
  additionalFeeRow: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginVertical: 2,
  },
  additionalFeeLabel: {
    color: "#2563EB",
    fontWeight: "700",
  },
  additionalFeeValue: {
    color: "#2563EB",
    fontWeight: "700",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
  },
  exceptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 80,
  },
  exceptionHeader: {
    backgroundColor: "#FEF2F2",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#FEE2E2",
  },
  exceptionHeaderText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B91C1C",
  },
  exceptionBody: {
    padding: 16,
  },
  exceptionDescription: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 16,
  },
  exceptionActions: {
    flexDirection: "row",
    gap: 12,
  },
  returnButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  returnButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  continueButton: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#FEE2E2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  exceptionNote: {
    fontSize: 10,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 12,
  },
  confirmCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    marginTop: 5,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  confirmHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  confirmHeaderText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  confirmDescription: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 12,
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  cancelButtonDisabled: {
    opacity: 0.7,
    borderColor: "#D1D5DB",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  incidentSectionCard: {
    backgroundColor: "#FEF2F2",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#FCA5A5",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  incidentSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#FCA5A5",
  },
  incidentSectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  incidentHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  incidentSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#DC2626",
    letterSpacing: 0.5,
  },
  incidentCountBadge: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: "center",
  },
  incidentCountText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  incidentWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
  },
  incidentWarningText: {
    flex: 1,
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "600",
    lineHeight: 18,
  },
  incidentCard: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  incidentCardBorder: {
    marginTop: 0,
  },
  incidentHeader: {
    marginBottom: 8,
  },
  incidentTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  incidentType: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  incidentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  incidentStatusCreated: {
    backgroundColor: "#FEF3C7",
  },
  incidentStatusAccepted: {
    backgroundColor: "#D1FAE5",
  },
  incidentStatusRejected: {
    backgroundColor: "#FEE2E2",
  },
  incidentStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1F2937",
  },
  incidentDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 8,
  },
  incidentImagesContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  incidentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  incidentActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  incidentRejectButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  incidentConfirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },
  incidentButtonDisabled: {
    opacity: 0.5,
  },
  incidentRejectButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  incidentConfirmButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  batchActionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: "#FCA5A5",
  },
  batchActionsLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
    marginBottom: 12,
  },
  batchActions: {
    flexDirection: "row",
    gap: 10,
  },
  batchRejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#B91C1C",
    shadowColor: "#B91C1C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  batchRejectButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  batchConfirmButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  batchConfirmButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  loadingOverlayContent: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  loadingOverlayText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  returnActionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  returnActionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  returnActionsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  returnActionsDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 16,
    lineHeight: 18,
  },
  returnActions: {
    flexDirection: "row",
    gap: 12,
  },
  returnShippingButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  returnShippingButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  returnStoreButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  returnStoreButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  packageCard: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  packageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  packageTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  packageHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "flex-end",
  },
  packageHeaderSummary: {
    fontSize: 12,
    color: "#6B7280",
    maxWidth: 150,
  },
  packageListContainer: {
    gap: 8,
  },
  packageOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginBottom: 8,
  },
  packageOptionSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  packageOptionDisabled: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    opacity: 0.6,
  },
  packageOptionContent: {
    flex: 1,
    gap: 4,
  },
  packageOptionName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  packageOptionRemaining: {
    fontSize: 10,
    color: "#059669",
  },
  packageOptionPrice: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  packageOptionDisabledText: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
    fontStyle: "italic",
  },
  promotionCard: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  promotionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  promotionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  promotionChangeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  selectedPromotion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  selectedPromotionInfo: {
    flex: 1,
  },
  selectedPromotionName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  selectedPromotionCode: {
    fontSize: 11,
    color: "#6B7280",
  },
  deletePromotionButton: {
    padding: 8,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  selectPromotionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
  },
  selectPromotionText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#2563EB",
  },
  noPromotionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
  },
  noPromotionText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalScrollView: {
    padding: 16,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalLoadingContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  modalLoadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  modalEmptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  modalEmptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  promotionOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  promotionOptionSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  promotionOptionContent: {
    flex: 1,
  },
  promotionOptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  promotionOptionName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  promotionDiscountBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  promotionDiscountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#F59E0B",
  },
  promotionOptionCode: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  promotionOptionDesc: {
    fontSize: 11,
    color: "#9CA3AF",
  },
});
