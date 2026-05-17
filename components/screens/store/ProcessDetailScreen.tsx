import { CustomerInfoCard } from "@/components/store/CustomerInfoCard";
import { Carrier } from "@/components/store/logistics/CarrierSelectionScreen";
import { StepperProgress } from "@/components/store/StepperProgress";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import {
  GoodsOrderItemStatus,
  IncidentStatus,
  OrderStatus,
  ProductType,
  ServiceOrderItemStatus,
} from "@/constants/enum";
import { storeMainContentPaddingTop } from "@/constants/storeWebLayout";
import { compatAlert } from "@/lib/compatAlert";
import { AddressLocation, goshipService } from "@/services/api/goshipService";
import { Order, orderService } from "@/services/api/orderService";
import { storeService } from "@/services/api/storeService";
import { formatCurrencyVND } from "@/utils/format";
import {
  buildOrderReceiptPdf,
  resolveOrderReceiptOptions,
  saveOrDownloadReceiptPdf,
} from "@/utils/orderReceiptPdf";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ProcessDetailScreenProps {
  order: Order;
  storeId: string;
  onBack: () => void;
  isWaitingReturn?: boolean;
  onReturnWithShipping?: () => void;
  onReturnWithStoreTransport?: () => void;
}

export const ProcessDetailScreen: React.FC<ProcessDetailScreenProps> = ({
  order: initialOrder,
  storeId,
  onBack,
  isWaitingReturn = false,
  onReturnWithShipping,
  onReturnWithStoreTransport,
}) => {
  const [retailChecked, setRetailChecked] = useState(false);
  const [actualWeights, setActualWeights] = useState<Record<string, string>>(
    {}
  );
  const [orderInfo, setOrderInfo] = useState<Order>(initialOrder);
  const [processingIncidents, setProcessingIncidents] = useState<Set<string>>(
    new Set()
  );

  const [retailItems, setRetailItems] = useState<any[]>([]);
  const [serviceItems, setServiceItems] = useState<any[]>([]);
  const [serviceFee, setServiceFee] = useState<string>("");
  const [serviceFeeDisplay, setServiceFeeDisplay] = useState<string>("");
  const [isChangesConfirmed, setIsChangesConfirmed] = useState(false);
  const [goodsAdditionalFee, setGoodsAdditionalFee] = useState<string>("");
  const [goodsAdditionalFeeDisplay, setGoodsAdditionalFeeDisplay] = useState<string>("");
  const [serviceAdditionalFee, setServiceAdditionalFee] = useState<string>("");
  const [serviceAdditionalFeeDisplay, setServiceAdditionalFeeDisplay] = useState<string>("");
  const [isGoodsFeeConfirmed, setIsGoodsFeeConfirmed] = useState(true);
  const [isServiceFeeConfirmed, setIsServiceFeeConfirmed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Return shipping modal state
  const [showReturnShippingModal, setShowReturnShippingModal] = useState(false);
  const [returnShippingCarriers, setReturnShippingCarriers] = useState<Carrier[]>([]);
  const [returnShippingRates, setReturnShippingRates] = useState<any[]>([]);
  const [selectedReturnCarrierId, setSelectedReturnCarrierId] = useState<string | null>(null);
  const [fetchingReturnRates, setFetchingReturnRates] = useState(false);
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [returnShippingParcel, setReturnShippingParcel] = useState({
    cod: "0",
    amount: "0",
    width: "10",
    height: "10",
    length: "10",
    weight: "1000",
  });
  const [storeAddress, setStoreAddress] = useState<any>(null);
  const [loadingStoreAddress, setLoadingStoreAddress] = useState(false);

  // Format number with thousand separators
  const formatNumberWithSeparators = (value: string): string => {
    // Remove all non-digit characters
    const numericValue = value.replace(/\D/g, "");
    if (!numericValue) return "";

    // Add thousand separators
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Handle service fee input change
  const handleServiceFeeChange = (text: string) => {
    // Remove all non-digit characters
    const numericValue = text.replace(/\D/g, "");
    setServiceFee(numericValue);
    setServiceFeeDisplay(formatNumberWithSeparators(numericValue));
  };

  // Handle goods additional fee input change
  const handleGoodsAdditionalFeeChange = (text: string) => {
    const numericValue = text.replace(/\D/g, "");
    setGoodsAdditionalFee(numericValue);
    setGoodsAdditionalFeeDisplay(formatNumberWithSeparators(numericValue));
  };

  // Handle service additional fee input change
  const handleServiceAdditionalFeeChange = (text: string) => {
    const numericValue = text.replace(/\D/g, "");
    setServiceAdditionalFee(numericValue);
    setServiceAdditionalFeeDisplay(formatNumberWithSeparators(numericValue));
  };

  // Handle goods fee confirmation toggle - only save value, no API call
  const handleGoodsFeeConfirm = () => {
    if (!isGoodsFeeConfirmed) {
      // Confirm: Save the fee value
      setIsGoodsFeeConfirmed(true);
    } else {
      // Unconfirm: Reset the state
      setIsGoodsFeeConfirmed(false);
    }
  };

  // Handle service fee confirmation toggle
  const handleServiceFeeConfirm = () => {
    setIsServiceFeeConfirmed(!isServiceFeeConfirmed);
  };

  const stepsRetail = [
    { label: "Tạo đơn" },
    { label: "Đang xử lý" },
    { label: "Giao" },
  ];

  const stepsService = [
    { label: "Tạo đơn" },
    { label: "Tiếp nhận" },
    { label: "Xử lý" },
    { label: "Xác nhận" },
    { label: "Trả" },
  ];

  // Get goods status from retail items (use first item's status or default)
  const getGoodsStatus = (): GoodsOrderItemStatus | null => {
    if (!retailItems || retailItems.length === 0) return null;
    const firstItem = retailItems[0];
    return (firstItem.goods_status as GoodsOrderItemStatus) ?? null;
  };

  // Get service status from service items (use first item's status or default)
  const getServiceStatus = (): ServiceOrderItemStatus | null => {
    if (!serviceItems || serviceItems.length === 0) return null;
    const firstItem = serviceItems[0];
    return (firstItem.service_status as ServiceOrderItemStatus) ?? null;
  };

  // Map goods status to retail step index
  const getRetailStepIndex = (): number => {
    const status = getGoodsStatus();
    if (status === null || status === undefined) return 0;

    // Map GoodsOrderItemStatus to step index
    if (orderInfo.status == OrderStatus.PROCESSING) {
      return 1;
    }
    switch (status) {
      case GoodsOrderItemStatus.CREATED:
        return 0; // Tiếp nhận
      case GoodsOrderItemStatus.PACKING:
        return 1; // Đóng hàng
      case GoodsOrderItemStatus.SHIPPING:
        return 2; // Giao
      case GoodsOrderItemStatus.COMPLETED:
        return 2; // Giao (completed)
      default:
        return 0;
    }
  };

  // Map service status to service step index
  const getServiceStepIndex = (): number => {
    const status = getServiceStatus();
    if (status === null || status === undefined) return 0;
    // Map ServiceOrderItemStatus to step index
    switch (status as ServiceOrderItemStatus) {
      case ServiceOrderItemStatus.CREATED:
        return 0; // Tạo đơn
      case ServiceOrderItemStatus.PICKING:
        return 1; // Tiếp nhận
      case ServiceOrderItemStatus.AT_FACTORY:
      case ServiceOrderItemStatus.WASHING:
        return 2; // Xử lý
      case ServiceOrderItemStatus.DELIVERING:
        return 3; // Xác nhận
      case ServiceOrderItemStatus.RETURNED:
        return 4; // Trả
      case ServiceOrderItemStatus.COMPLETED:
        return 4; // Trả (completed)
      default:
        return 0;
    }
  };

  // Convert step arrays to format expected by StepperProgress
  const getRetailSteps = () => {
    const activeIndex = getRetailStepIndex();
    return stepsRetail.map((step, index) => ({
      label: step.label,
      isActive: index <= activeIndex,
    }));
  };

  const getServiceSteps = () => {
    const activeIndex = getServiceStepIndex();

    return stepsService.map((step, index) => ({
      label: step.label,
      isActive: index <= activeIndex,
    }));
  };

  // Get confirm button text based on step label
  const getConfirmButtonText = (stepLabel: string): string => {
    const buttonTextMap: Record<string, string> = {
      "Tạo đơn": "Tiếp nhận & Báo giá",
      "Tiếp nhận": "Xác nhận tiếp nhận",
      "Xử lý": "Xác nhận xử lý",
      "Xác nhận": "Xác nhận hoàn tất",
      "Trả": "Xác nhận trả hàng",
      "Đang xử lý": "Xác nhận đóng hàng",
      "Giao": "Xác nhận giao hàng",
    };

    return buttonTextMap[stepLabel] || `Xác nhận ${stepLabel.toLowerCase()}`;
  };

  // Get current active step label
  const getCurrentRetailStepLabel = (): string => {
    const activeIndex = getRetailStepIndex();
    return stepsRetail[activeIndex]?.label || "";
  };

  const getCurrentServiceStepLabel = (): string => {
    const activeIndex = getServiceStepIndex();
    return stepsService[activeIndex]?.label || "";
  };

  // Get status tag text for goods
  const getGoodsStatusTag = (): string => {
    const status = getGoodsStatus();
    if (status === null) return "Chưa có";

    switch (status) {
      case GoodsOrderItemStatus.CREATED:
        return "Tiếp nhận";
      case GoodsOrderItemStatus.PACKING:
        return "Đóng hàng";
      case GoodsOrderItemStatus.SHIPPING:
        return "Đang giao";
      case GoodsOrderItemStatus.COMPLETED:
        return "Hoàn thành";
      case GoodsOrderItemStatus.CANCELLED:
        return "Đã hủy";
      default:
        return "Chưa xử lý";
    }
  };

  // Get status tag text for service
  const getServiceStatusTag = (): string => {
    const status = getServiceStatus();
    if (status === null) return "Chưa có";

    switch (status) {
      case ServiceOrderItemStatus.CREATED:
        return "Tạo đơn";
      case ServiceOrderItemStatus.PICKING:
        return "Tiếp nhận";
      case ServiceOrderItemStatus.AT_FACTORY:
        return "Ở Xưởng";
      case ServiceOrderItemStatus.WASHING:
        return "Đang giặt";
      case ServiceOrderItemStatus.DELIVERING:
        return "Đang giao";
      case ServiceOrderItemStatus.RETURNED:
        return "Đã trả";
      case ServiceOrderItemStatus.COMPLETED:
        return "Hoàn thành";
      case ServiceOrderItemStatus.CANCELLED:
        return "Đã hủy";
      default:
        return "Chưa xử lý";
    }
  };

  // Get order status display text
  const getOrderStatusText = (): string => {
    const status = orderInfo?.status;
    if (!status) return "Không xác định";

    switch (status) {
      case OrderStatus.CREATED:
        return "Đã tạo";
      case OrderStatus.PROCESSING:
        return "Đang xử lý";
      case OrderStatus.NEED_CUSTOMER_CONFIRMATION:
        return "Chờ xác nhận";
      case OrderStatus.FINISHED:
        return "Hoàn thành";
      case OrderStatus.CANCELLED:
        return "Đã hủy";
      case OrderStatus.CUSTOMER_REJECTED:
        return "Khách từ chối";
      default:
        return OrderStatus[status] || "Không xác định";
    }
  };

  function getItemsBy(productType: ProductType): any[] {
    return (
      orderInfo.order_items?.filter(
        (item) => (item.product_type as ProductType) === productType
      ) || []
    );
  }

  const fetchOrderDetails = async () => {
    console.log(
      "Fetching order details for",
      initialOrder.code,
      "in store",
      storeId
    );
    try {
      const response = await orderService.searchStoreOrders(
        {
          code: initialOrder.code,
          hub_id: storeId,
          fetch_order_items: true,
          fetch_incidents: true,
        },
        { page: 0, size: 10 }
      );

      setOrderInfo(response.data[0]);
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  };

  useEffect(() => {
    // Initialize with passed order, then refresh to get latest data
    setOrderInfo(initialOrder);
    fetchOrderDetails();
  }, [initialOrder.code]);

  // Update item lists when orderInfo changes
  useEffect(() => {
    setRetailItems(getItemsBy(ProductType.GOODS));
    setServiceItems(getItemsBy(ProductType.SERVICE));

    // Update service fee from order if status is not CREATED
    if (orderInfo?.status !== OrderStatus.CREATED && orderInfo?.service_fee) {
      const feeValue = String(orderInfo.service_fee);
      setServiceFee(feeValue);
      setServiceFeeDisplay(formatNumberWithSeparators(feeValue));
    }

    // Update product additional fee from order
    if (orderInfo?.product_additional_fee) {
      const feeValue = String(Math.floor(orderInfo.product_additional_fee));
      setGoodsAdditionalFee(feeValue);
      setGoodsAdditionalFeeDisplay(formatNumberWithSeparators(feeValue));
      // If fee exists and order is not CREATED, mark as confirmed
      if (orderInfo?.status !== OrderStatus.CREATED) {
        setIsGoodsFeeConfirmed(true);
      }
    }

    // Update service additional fee from order
    if (orderInfo?.service_additional_fee) {
      const feeValue = String(Math.floor(orderInfo.service_additional_fee));
      setServiceAdditionalFee(feeValue);
      setServiceAdditionalFeeDisplay(formatNumberWithSeparators(feeValue));
      // If fee exists and order is not CREATED, mark as confirmed
      if (orderInfo?.status !== OrderStatus.CREATED) {
        setIsServiceFeeConfirmed(true);
      }
    }
  }, [orderInfo]);

  const totalRetailPrice = retailItems.reduce((sum, item) => {
    const qty = Number(item.quantity ?? 1) || 0;
    const total =
      item.total_price != null
        ? Number(item.total_price)
        : Number(item.unit_price ?? 0) * qty;
    return sum + (isNaN(total) ? 0 : total);
  }, 0);

  useEffect(() => {
    // initialize per-item actual weights from serviceItems using adjust_quantity if available
    const map: Record<string, string> = {};
    (serviceItems || []).forEach((it, i) => {
      const id = it.id ?? String(i);
      // Use adjust_quantity if available, otherwise use quantity
      // If adjust_quantity exists, use it; otherwise keep existing value or use quantity
      const adjustQty = it.adjusted_quantity;
      const qty = it.quantity ?? "";
      // Prefer adjust_quantity if it exists, otherwise use quantity
      const value =
        adjustQty !== undefined && adjustQty !== null ? adjustQty : qty;
      map[id] = String(value);
    });
    // Always update with new values from API, but preserve user input if order status is CREATED
    if (orderInfo?.status === OrderStatus.CREATED) {
      setActualWeights((prev) => {
        // Merge: use existing values if they exist, otherwise use new values from API
        const merged: Record<string, string> = {};
        (serviceItems || []).forEach((it, i) => {
          const id = it.id ?? String(i);
          merged[id] =
            prev[id] || String(it.adjusted_quantity ?? it.quantity ?? "");
        });
        return merged;
      });
    } else {
      // For non-CREATED status (after confirmation), always use adjust_quantity from API
      // This ensures the "Thực tế" field shows the confirmed adjust_quantity value
      setActualWeights(map);
    }
  }, [serviceItems, orderInfo?.status]);

  const clampToStep = (v: number) => {
    const stepped = Math.round(v * 2) / 2; // step 0.5
    return Math.max(0, Math.min(100, stepped));
  };

  const setActualWeightFor = (id: string, raw: string) => {
    if (raw === "") {
      setActualWeights((prev) => ({ ...prev, [id]: "" }));
      return;
    }
    const normalized = raw.replace(/,/g, ".");
    const parsed = parseFloat(normalized);
    if (isNaN(parsed)) return;
    const val = clampToStep(parsed);
    const out = Number.isInteger(val) ? String(val) : String(val.toFixed(1));
    setActualWeights((prev) => ({ ...prev, [id]: out }));
  };

  const changeActualBy = (id: string, delta: number) => {
    const curRaw = actualWeights[id] ?? "";
    const cur = parseFloat(curRaw === "" ? "0" : curRaw) || 0;
    const next = clampToStep(cur + delta);
    const out = Number.isInteger(next) ? String(next) : String(next.toFixed(1));
    setActualWeights((prev) => ({ ...prev, [id]: out }));
  };

  const handleRetailShip = () => {
    compatAlert("Thành công", "Đã gọi shipper giao hàng ngay");
    setRetailChecked(true);
  };

  const handlePrintTag = async () => {
    const order = orderInfo ?? initialOrder;
    const orderCode = order.code?.trim();
    if (!orderCode) {
      compatAlert("Lỗi", "Không tìm thấy mã đơn hàng");
      return;
    }

    try {
      const receiptOptions = await resolveOrderReceiptOptions(storeId);
      const pdfBytes = await buildOrderReceiptPdf(order, receiptOptions);
      const safeCode = orderCode.replace(/[^\w.-]+/g, "_");
      const fileName = `Bien_nhan_${safeCode}.pdf`;
      await saveOrDownloadReceiptPdf(pdfBytes, fileName);
      if (Platform.OS === "web") {
        compatAlert("Thành công", `Đã tải file PDF: ${fileName}`);
      }
    } catch (error: unknown) {
      console.error("Error generating receipt PDF:", error);
      const msg =
        error instanceof Error ? error.message : "Không thể tạo file PDF. Vui lòng thử lại.";
      compatAlert("Lỗi", msg);
    }
  };

  const handleComplete = () => {
    compatAlert(
      "Hoàn tất",
      'Đơn hàng đã được chuyển sang trạng thái "Chờ đi Xưởng"',
      [
        {
          text: "OK",
          onPress: onBack,
        },
      ]
    );
  };

  const handleCallCustomer = () => {
    compatAlert("Gọi điện", "Đang gọi cho khách...");
  };

  // Function to update order status and adjust order items
  const updateOrderStatus = async (
    stepLabel: string,
    stepType: "retail" | "service",
    serviceFee?: string
  ) => {
    // Build updated_items from actualWeights for service items
    const updatedItems = serviceItems
      .filter((item) => {
        const orderItemId = item.id ?? "";
        const actualWeight = actualWeights[orderItemId];
        const currentAdjustQuantity =
          item.adjust_quantity ?? item.quantity ?? "";
        return (
          actualWeight !== undefined &&
          actualWeight !== "" &&
          actualWeight !== String(currentAdjustQuantity)
        );
      })
      .map((item) => {
        const orderItemId = item.id ?? "";
        const actualWeight = parseFloat(actualWeights[orderItemId] || "0");
        return {
          order_item_id: orderItemId,
          quantity: actualWeight,
        };
      });

    // Build request body
    const requestBody: {
      updated_items: Array<{ order_item_id: string; quantity: number }>;
      new_items: Array<{ product_id: string; quantity: number }>;
      service_fee?: number;
    } = {
      updated_items: updatedItems,
      new_items: [], // Empty for now, can be extended later
    };

    // Add service_fee if provided
    if (serviceFee && serviceFee !== "") {
      const feeValue = parseFloat(serviceFee);
      if (!isNaN(feeValue) && feeValue > 0) {
        requestBody.service_fee = feeValue;
      }
    }

    // Call adjustOrder API
    try {
      console.log("requestBody", requestBody);
      await orderService.adjustOrder(initialOrder.id, requestBody);
    } catch (error) {
      compatAlert("Lỗi", "Không thể cập nhật trạng thái đơn hàng");
      console.error("Error updating order status:", error);
      throw error;
    }
  };

  const handleRetailStepConfirm = async () => {
    const currentStepLabel = getCurrentRetailStepLabel();
    try {
      await updateOrderStatus(currentStepLabel, "retail");

      // Refresh order data to get updated status from API
      await fetchOrderDetails();

      compatAlert("Thành công", `Đã xác nhận ${currentStepLabel}`);
    } catch (error) {
      compatAlert("Lỗi", "Không thể cập nhật trạng thái đơn hàng");
      console.error("Error updating retail step:", error);
      throw error;
    }
  };

  const handleServiceStepConfirm = async () => {
    const currentStepLabel = getCurrentServiceStepLabel();
    try {
      await updateOrderStatus(currentStepLabel, "service", serviceFee);

      // Refresh order data to get updated status from API
      await fetchOrderDetails();

      compatAlert("Thành công", `Đã xác nhận ${currentStepLabel}`);
    } catch (error) {
      compatAlert("Lỗi", "Không thể cập nhật trạng thái đơn hàng");
      console.error("Error updating service step:", error);
      throw error;
    }
  };

  // Handle confirm changes - toggle lock state
  const handleConfirmChanges = () => {
    if (!isChangesConfirmed) {
      // Lock: Update serviceItems with adjust_quantity from actualWeights
      setServiceItems((prevItems) =>
        prevItems.map((item) => {
          const itemId = item.id ?? "";
          const actualWeight = actualWeights[itemId];
          if (actualWeight !== undefined && actualWeight !== "") {
            return {
              ...item,
              adjust_quantity: parseFloat(actualWeight) || item.quantity,
            };
          }
          return item;
        })
      );
      setIsChangesConfirmed(true);
    } else {
      // Unlock: Just toggle the state
      setIsChangesConfirmed(false);
    }
  };

  // Check if the main "Gửi báo giá" button should be enabled
  const isConfirmEnabled = (): boolean => {
    // If there are service items, both goods and service must be confirmed
    if (serviceItems && serviceItems.length > 0) {
      return isGoodsFeeConfirmed && isChangesConfirmed;
    }
    // If no service items, only goods confirmation is needed
    return isGoodsFeeConfirmed;
  };

  // Handle Báo giá - call adjust_order API
  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      // Build updated_items from actualWeights for ALL service items
      const updatedItems = serviceItems
        .map((item) => {
          const orderItemId = item.id ?? "";
          // Use actualWeight if available, otherwise use adjust_quantity, otherwise use quantity
          const actualWeight = actualWeights[orderItemId];
          const weightValue = actualWeight !== undefined && actualWeight !== ""
            ? parseFloat(actualWeight)
            : (item.adjust_quantity ?? item.quantity ?? 0);
          return {
            order_item_id: orderItemId,
            quantity: typeof weightValue === 'number' ? weightValue : parseFloat(String(weightValue)) || 0,
          };
        })
        .filter((item) => item.quantity > 0); // Only include items with valid quantity

      // Build request body
      const requestBody: {
        updated_items: Array<{ order_item_id: string; quantity: number }>;
        new_items: Array<{ product_id: string; quantity: number }>;
        service_fee?: number;
        product_additional_fee?: number;
        service_additional_fee?: number;
      } = {
        updated_items: updatedItems,
        new_items: [],
      };

      // Add service_fee if provided
      if (serviceFee && serviceFee !== "") {
        const feeValue = parseFloat(serviceFee);
        if (!isNaN(feeValue) && feeValue > 0) {
          requestBody.service_fee = feeValue;
        }
      }

      // Add goods additional_fee if confirmed
      if (isGoodsFeeConfirmed && goodsAdditionalFee && goodsAdditionalFee !== "") {
        const feeValue = parseFloat(goodsAdditionalFee);
        if (!isNaN(feeValue) && feeValue > 0) {
          requestBody.product_additional_fee = feeValue;
        }
      }

      // Add service additional_fee if confirmed
      if (isServiceFeeConfirmed && serviceAdditionalFee && serviceAdditionalFee !== "") {
        const feeValue = parseFloat(serviceAdditionalFee);
        if (!isNaN(feeValue) && feeValue > 0) {
          requestBody.service_additional_fee = feeValue;
        }
      }

      // Call adjustOrder API
      console.log("handleConfirm - requestBody", initialOrder.id, requestBody);
      await orderService.adjustOrder(initialOrder.id, requestBody);

      // Refresh order data to get updated status from API
      await fetchOrderDetails();

      compatAlert("Thành công", "Đã báo giá thành công");
    } catch (error) {
      compatAlert("Lỗi", "Không thể xử lí đơn hàng");
      console.error("Error adjusting order:", error);
    } finally {
      setIsConfirming(false);
    }
  };

  const getFullAddress = (order: Order) => {
    return `${order?.shipping_address_detail_snapshot}, ${order?.shipping_ward_snapshot}, ${order?.shipping_district_snapshot}, ${order?.shipping_province_snapshot}`;
  };

  const isSplitShipment = orderInfo?.is_split_shipment ?? true;

  // Handle return via store transport: confirm & mark order as FINISHED
  // Handle return with shipping - open modal
  const handleReturnWithShippingInternal = async () => {
    try {
      setLoadingStoreAddress(true);
      // Fetch store address
      const storeProfileResponse = await storeService.getStoreProfile(storeId);
      const storeProfile = storeProfileResponse.data;

      if (!storeProfile?.address) {
        compatAlert("Lỗi", "Không thể lấy địa chỉ cửa hàng");
        return;
      }

      setStoreAddress(storeProfile.address);
      setShowReturnShippingModal(true);
    } catch (error: any) {
      console.error("Failed to fetch store address:", error);
      compatAlert("Lỗi", "Không thể lấy địa chỉ cửa hàng");
    } finally {
      setLoadingStoreAddress(false);
    }
  };

  // Fetch return shipping rates
  const handleFetchReturnRates = async () => {
    if (!storeAddress || !orderInfo.shipping_province_snapshot || !orderInfo.shipping_district_snapshot) {
      compatAlert("Lỗi", "Thiếu thông tin địa chỉ");
      return;
    }

    const codNum = parseFloat(returnShippingParcel.cod) || 0;
    const amountNum = parseFloat(returnShippingParcel.amount) || 0;
    const widthNum = parseFloat(returnShippingParcel.width) || 0;
    const heightNum = parseFloat(returnShippingParcel.height) || 0;
    const lengthNum = parseFloat(returnShippingParcel.length) || 0;
    const weightNum = parseFloat(returnShippingParcel.weight) || 0;

    if (widthNum <= 0 || heightNum <= 0 || lengthNum <= 0 || weightNum <= 0) {
      compatAlert('Lỗi', 'Vui lòng nhập đầy đủ thông tin kích thước và trọng lượng');
      return;
    }

    setFetchingReturnRates(true);
    try {
      // Source address: Store address (from store profile)
      const storeAddr = typeof storeAddress === 'string' ? null : storeAddress;
      if (!storeAddr || (!storeAddr.district_id && !storeAddr.district) || (!storeAddr.province_id && !storeAddr.province)) {
        compatAlert("Lỗi", "Không thể lấy địa chỉ cửa hàng");
        setFetchingReturnRates(false);
        return;
      }

      const sourceAddress: AddressLocation = {
        // Prefer IDs over names for API compatibility
        district: storeAddr.district_id || storeAddr.district || '',
        city: storeAddr.province_id || storeAddr.province || '',
        ward: storeAddr.ward_id || storeAddr.ward,
      };

      // Destination address: Customer address (from order shipping snapshot)
      // Note: shipping_*_snapshot fields may contain names or IDs
      // The API should accept both, but we'll use them as-is
      const destinationAddress: AddressLocation = {
        district: orderInfo.shipping_district_id_snapshot || orderInfo.shipping_district_snapshot || '',
        city: orderInfo.shipping_province_id_snapshot || orderInfo.shipping_province_snapshot || '',
        ward: orderInfo.shipping_ward_id_snapshot || orderInfo.shipping_ward_snapshot,
      };

      const request = {
        shipment: {
          address_from: sourceAddress, // Store address (source)
          address_to: destinationAddress, // Customer address (destination)
          parcel: {
            cod: codNum,
            amount: amountNum,
            width: widthNum,
            height: heightNum,
            length: lengthNum,
            weight: weightNum,
          },
        },
      };

      const response = await goshipService.getRates(request);
      let ratesData = response?.data;
      if (ratesData && !Array.isArray(ratesData) && ratesData.data) {
        ratesData = ratesData.data;
      }

      if (ratesData && Array.isArray(ratesData) && ratesData.length > 0) {
        // Store original rates data for shipment creation
        setReturnShippingRates(ratesData);

        const carriersList: Carrier[] = ratesData.map((rate: any, index: number) => ({
          id: rate.id || rate.carrier_id || rate.carrier?.id || `carrier-${index}`,
          name: rate.carrier_name || rate.name || rate.carrier?.name || `Đơn vị vận chuyển ${index + 1}`,
          description: rate.service_name || rate.service?.name || rate.description || rate.expected,
          estimatedTime: rate.estimated_delivery_time || rate.estimated_time || rate.delivery_time || rate.expected,
          price: rate.total_fee || rate.fee || rate.price || rate.shipping_fee || 0,
          carrier_logo: rate.carrier_logo || null,
        }));
        setReturnShippingCarriers(carriersList);
      } else {
        compatAlert('Thông báo', 'Không tìm thấy đơn vị vận chuyển phù hợp');
        setReturnShippingCarriers([]);
        setReturnShippingRates([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch return rates:', error);
      compatAlert('Lỗi', error.message || 'Không thể lấy báo giá vận chuyển');
      setReturnShippingCarriers([]);
      setReturnShippingRates([]);
    } finally {
      setFetchingReturnRates(false);
    }
  };

  // Confirm return shipping
  const handleConfirmReturnShipping = async () => {
    if (!selectedReturnCarrierId) {
      compatAlert("Thông báo", "Vui lòng chọn đơn vị vận chuyển");
      return;
    }

    if (!storeAddress || !orderInfo.shipping_province_snapshot || !orderInfo.shipping_district_snapshot) {
      compatAlert("Lỗi", "Thiếu thông tin địa chỉ");
      return;
    }

    try {
      setIsCreatingShipment(true);
      // Find the selected rate
      const selectedRate = returnShippingRates.find(
        (rate: any) => rate.id === selectedReturnCarrierId || rate.carrier_id === selectedReturnCarrierId
      );

      if (!selectedRate || !selectedRate.id) {
        compatAlert("Lỗi", "Không tìm thấy thông tin đơn vị vận chuyển đã chọn");
        return;
      }

      // Prepare parcel data
      const codNum = parseFloat(returnShippingParcel.cod) || 0;
      const amountNum = parseFloat(returnShippingParcel.amount) || orderInfo.final_total || 0;
      const widthNum = parseFloat(returnShippingParcel.width) || 0;
      const heightNum = parseFloat(returnShippingParcel.height) || 0;
      const lengthNum = parseFloat(returnShippingParcel.length) || 0;
      const weightNum = parseFloat(returnShippingParcel.weight) || 0;

      // Fetch store profile to get name and phone
      const storeProfileResponse = await storeService.getStoreProfile(storeId);
      const storeProfile = storeProfileResponse.data;

      // Prepare store address (from)
      const storeAddr = typeof storeAddress === 'string' ? null : storeAddress;
      if (!storeAddr || (!storeAddr.district_id && !storeAddr.district) || (!storeAddr.province_id && !storeAddr.province)) {
        compatAlert("Lỗi", "Không thể lấy địa chỉ cửa hàng");
        return;
      }

      const addressFrom = {
        name: storeProfile.name || "",
        phone: storeProfile.phone_number || storeProfile.phone_contact || "",
        street: storeAddr.address_detail || "",
        ward: storeAddr.ward_id || storeAddr.ward || "",
        district: storeAddr.district_id || storeAddr.district || "",
        city: storeAddr.province_id || storeAddr.province || "",
      };

      // Prepare customer address (to)
      const addressTo = {
        name: orderInfo.shipping_full_name_snapshot,
        phone: orderInfo.shipping_phone_number_snapshot,
        street: orderInfo.shipping_address_detail_snapshot || "",
        ward: orderInfo.shipping_ward_id_snapshot || orderInfo.shipping_ward_snapshot || "",
        district: orderInfo.shipping_district_id_snapshot || orderInfo.shipping_district_snapshot || "",
        city: orderInfo.shipping_province_id_snapshot || orderInfo.shipping_province_snapshot || "",
      };

      // Create shipment request
      const shipmentRequest = {
        shipment: {
          rate: selectedRate.id.toString(),
          payer: 1 as 0 | 1,
          order_id: orderInfo.id,
          address_from: addressFrom,
          address_to: addressTo,
          parcel: {
            cod: codNum,
            amount: amountNum,
            weight: weightNum.toString(),
            width: widthNum.toString(),
            height: heightNum.toString(),
            length: lengthNum.toString(),
          },
        },
      };
      console.log('shipmentRequest', shipmentRequest);

      // Create shipment via goshipService
      const shipmentResponse = await goshipService.createShipment(shipmentRequest);

      compatAlert(
        "Thành công",
        `Đã tạo đơn vận chuyển thành công.\nMã vận đơn: ${shipmentResponse.tracking_number || 'N/A'}`
      );

      setShowReturnShippingModal(false);
      setSelectedReturnCarrierId(null);
      setReturnShippingCarriers([]);
      setReturnShippingRates([]);

      // Refresh order details
      await fetchOrderDetails();
    } catch (error: any) {
      console.error("Failed to create return shipment:", error);
      compatAlert("Lỗi", error.message || "Không thể đặt ship trả hàng");
    } finally {
      setIsCreatingShipment(false);
    }
  };

  const handleReturnWithStoreTransportInternal = () => {
    compatAlert(
      "Xác nhận trả hàng",
      "Xác nhận shop sẽ tự vận chuyển và hoàn thành đơn hàng này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          style: "default",
          onPress: async () => {
            try {
              const currentStatus = orderInfo.status;
              let nextStatus = currentStatus;
              if (currentStatus === OrderStatus.PROCESSING) {
                nextStatus = OrderStatus.FINISHED;
              }
              if (currentStatus === OrderStatus.CUSTOMER_INCIDENTS_REJECTED) {
                nextStatus = OrderStatus.CANCELLED;
              }

              // Update order status to FINISHED via staff API
              await orderService.updateOrderStatus(orderInfo.id, {
                status: nextStatus,
                note: "Hoàn thành bởi shop vận chuyển",
              });

              // Refresh order to get latest status
              await fetchOrderDetails();

              // Call optional callback from parent if provided
              if (onReturnWithStoreTransport) {
                onReturnWithStoreTransport();
              }

              compatAlert(
                "Thành công",
                "Đơn hàng đã được cập nhật hoàn thành.",
                [{ text: "OK", onPress: () => onBack() }]
              );
            } catch (error) {
              console.error(
                "Error completing order via store transport:",
                error
              );
              compatAlert(
                "Lỗi",
                "Không thể cập nhật trạng thái đơn hàng. Vui lòng thử lại."
              );
            }
          },
        },
      ]
    );
  };

  const handleConfirmIncident = async (incidentId: string) => {
    try {
      setProcessingIncidents((prev) => new Set(prev).add(incidentId));
      await storeService.confirmIncident(incidentId);
      await fetchOrderDetails();
    } catch (error: any) {
      compatAlert("Lỗi", error?.message || "Không thể xác nhận sự cố");
    } finally {
      setProcessingIncidents((prev) => {
        const next = new Set(prev);
        next.delete(incidentId);
        return next;
      });
    }
  };

  const handleRejectIncident = async (incidentId: string) => {
    compatAlert(
      "Từ chối sự cố",
      "Từ chối sự cố sẽ đồng thời huỷ đơn hàng này. Bạn có chắc?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Từ chối",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessingIncidents((prev) => new Set(prev).add(incidentId));
              await storeService.rejectIncident(incidentId);
              await orderService.updateOrderStatus(orderInfo.id, {
                status: OrderStatus.CANCELLED,
                note: "Từ chối sự cố",
              });
              await fetchOrderDetails();
            } catch (error: any) {
              compatAlert("Lỗi", error?.message || "Không thể từ chối sự cố");
            } finally {
              setProcessingIncidents((prev) => {
                const next = new Set(prev);
                next.delete(incidentId);
                return next;
              });
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="arrow-left" size={16} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              Đơn {orderInfo?.code || initialOrder.code}
            </Text>
          </View>

          <View style={styles.headerBadges}>
            <View style={styles.orderStatusBadge}>
              <Text style={styles.orderStatusBadgeText}>
                {getOrderStatusText()}
              </Text>
            </View>
            <View style={styles.splitBadge}>
              <FontAwesome5
                name="random"
                size={8}
                color="#7C3AED"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.splitBadgeText}>
                {isSplitShipment ? "Đơn Tách Chuyến" : "Gộp chuyến"}
              </Text>
            </View>
          </View>

          <CustomerInfoCard
            name={orderInfo?.shipping_full_name_snapshot || "Nguyễn Văn A"}
            phone={orderInfo?.shipping_phone_number_snapshot || "0912345678"}
            address={
              getFullAddress(orderInfo) || "Tòa R2, Royal City, 72 Nguyễn Trãi"
            }
            membershipTier={undefined}
            onCallPress={handleCallCustomer}
          />

          {/* Header no longer shows global stepper; each section has its own stepper below */}
        </View>

        {!!(orderInfo as any)?.incidents?.length && (
          <View style={styles.incidentCard}>
            {/* Section header – always show warning icon */}
            <View style={styles.incidentHeader}>
              <View style={styles.incidentHeaderLeft}>
                <FontAwesome5 name="exclamation-triangle" size={14} color="#DC2626" />
                <Text style={styles.incidentTitle}>
                  Sự cố ({((orderInfo as any).incidents as any[]).length})
                </Text>
              </View>
            </View>

            {((orderInfo as any).incidents as any[]).map((incident: any, idx: number) => {
              const id = String(incident?.id ?? idx);
              const images: string[] = Array.isArray(incident?.image_urls) ? incident.image_urls : [];
              const status: IncidentStatus = incident?.status as IncidentStatus;
              const isPending = status === IncidentStatus.CREATED;
              const isAccepted = status === IncidentStatus.USER_ACCEPTED;
              const isRejected = status === IncidentStatus.USER_REJECTED;
              const isProcessing = processingIncidents.has(id);

              const statusConfig = isAccepted
                ? { label: "Đã xác nhận", color: "#16A34A", bg: "#DCFCE7", icon: "check-circle" as const }
                : isRejected
                ? { label: "Đã từ chối", color: "#DC2626", bg: "#FEE2E2", icon: "times-circle" as const }
                : { label: "Chờ xử lý", color: "#D97706", bg: "#FEF3C7", icon: "clock" as const };

              return (
                <View key={id} style={[styles.incidentItem, idx > 0 && { marginTop: 12 }]}>
                  {/* Status pill */}
                  <View style={[styles.incidentStatusPill, { backgroundColor: statusConfig.bg }]}>
                    <FontAwesome5 name={statusConfig.icon} size={11} color={statusConfig.color} />
                    <Text style={[styles.incidentStatusLabel, { color: statusConfig.color }]}>
                      {statusConfig.label}
                    </Text>
                  </View>

                  <Text style={styles.incidentDesc}>
                    {incident?.description || "Sự cố"}
                  </Text>
                  {!!incident?.type && (
                    <Text style={styles.incidentMeta}>Loại: {String(incident.type)}</Text>
                  )}

                  {images.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginTop: 8 }}
                    >
                      {images.map((url, i) => (
                        <Image
                          key={`${url}-${i}`}
                          source={{ uri: url }}
                          style={styles.incidentImage}
                        />
                      ))}
                    </ScrollView>
                  )}

                  {isPending && (
                    <View style={styles.incidentActions}>
                      <TouchableOpacity
                        style={[
                          styles.incidentBtn,
                          styles.incidentBtnConfirm,
                          isProcessing && { opacity: 0.6 },
                        ]}
                        onPress={() => handleConfirmIncident(id)}
                        disabled={isProcessing}
                        activeOpacity={0.85}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <FontAwesome5 name="check" size={12} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.incidentBtnText}>Xác nhận</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.incidentBtn,
                          styles.incidentBtnReject,
                          isProcessing && { opacity: 0.6 },
                        ]}
                        onPress={() => handleRejectIncident(id)}
                        disabled={isProcessing}
                        activeOpacity={0.85}
                      >
                        {isProcessing ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <FontAwesome5 name="times" size={12} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.incidentBtnText}>Từ chối</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Retail Section */}
        {retailItems && retailItems.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionIcon}>
                  <FontAwesome5 name="shipping-fast" size={12} color="#7C3AED" />
                </View>
                <Text style={styles.sectionTitle}>Hàng hóa</Text>
              </View>
              <View style={styles.sectionStatus}>
                <Text style={styles.sectionStatusText}>
                  {getGoodsStatusTag()}
                </Text>
              </View>
            </View>

            <StepperProgress steps={getRetailSteps()} />

            {retailItems && retailItems.length > 0 ? (
              retailItems.map((item, idx) => {
                const thumb = item.product_thumbnail_url;

                return (
                  <TouchableOpacity
                    key={item.id || idx}
                    style={styles.checkboxCard}
                    activeOpacity={0.7}
                  >
                    <View style={styles.productImageContainer}>
                      {thumb ? (
                        <Image
                          source={{ uri: thumb }}
                          style={styles.productImage}
                        />
                      ) : (
                        <View style={styles.productImagePlaceholder}>
                          <Text style={{ color: "#6B7280", fontWeight: "700" }}>
                            {(item.product_name || item.name || "")
                              .charAt(0)
                              .toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.checkboxContent}>
                      <Text style={styles.checkboxTitle}>
                        {item.product_name || item.name || `Sản phẩm ${idx + 1}`}
                      </Text>
                      <Text style={styles.checkboxMeta}>
                        SL: {item.quantity || 1} •{" "}
                        <Text style={styles.checkboxPrice}>
                          {formatCurrencyVND(
                            item.total_price ?? item.unit_price ?? 0
                          )}
                        </Text>
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : null}

            <View style={styles.sectionFooter}>
              <View>
                <Text style={styles.codLabel}>Tổng hàng</Text>
                <Text style={styles.codAmount}>
                  {formatCurrencyVND(totalRetailPrice)}
                </Text>
              </View>
              {/* <TouchableOpacity
              style={[
                styles.shipButton,
                retailChecked && styles.shipButtonDisabled,
              ]}
              onPress={handleRetailShip}
              disabled={retailChecked}
              activeOpacity={1}
            >
              <FontAwesome5
                name={retailChecked ? "check" : "motorcycle"}
                size={10}
                color="#FFFFFF"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.shipButtonText}>
                {retailChecked ? "Đã gọi Ship" : "Gọi Ship Ngay"}
              </Text>
            </TouchableOpacity> */}
            </View>

            {/* Goods Additional Fee Input */}
            <View style={styles.additionalFeeContainer}>
              <View style={styles.additionalFeeHeader}>
                <Text style={styles.additionalFeeLabel}>
                  Phí bổ sung hàng hóa (VNĐ)
                </Text>
              </View>
              <View style={styles.additionalFeeInputContainer}>
                <View style={styles.additionalFeeInputWrapper}>
                  <TextInput
                    style={styles.additionalFeeInput}
                    value={goodsAdditionalFeeDisplay}
                    onChangeText={handleGoodsAdditionalFeeChange}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    editable={orderInfo?.status === OrderStatus.CREATED && !isGoodsFeeConfirmed}
                  />
                  <Text style={styles.additionalFeeCurrency}>VNĐ</Text>
                </View>
              </View>
            </View>

            {/* Goods Additional Fee Confirm Button - Toggle (only saves value, no API) */}
            {orderInfo?.status === OrderStatus.CREATED && (
              <View style={styles.stepConfirmContainer}>
                <TouchableOpacity
                  style={[
                    styles.stepConfirmButton,
                    isGoodsFeeConfirmed && styles.stepConfirmButtonUnlock
                  ]}
                  onPress={handleGoodsFeeConfirm}
                  activeOpacity={1}
                >
                  <FontAwesome5
                    name={isGoodsFeeConfirmed ? "times" : "check"}
                    size={12}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.stepConfirmButtonText}>
                    {isGoodsFeeConfirmed ? "Hủy báo giá" : "Báo giá phí bổ sung"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Confirm button for retail steps */}
            {/* {getRetailStepIndex() < stepsRetail.length && (
            <View style={styles.stepConfirmContainer}>
              <TouchableOpacity
                style={styles.stepConfirmButton}
                onPress={handleRetailStepConfirm}
                activeOpacity={1}
              >
                <FontAwesome5
                  name="check"
                  size={12}
                  color="#FFFFFF"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.stepConfirmButtonText}>
                  {getConfirmButtonText(getCurrentRetailStepLabel())}
                </Text>
              </TouchableOpacity>
            </View>
          )} */}
          </View>
        )}

        {/* Service Section */}
        {serviceItems && serviceItems.length > 0 && (
          <View style={[styles.sectionCard, styles.serviceCard]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIcon, styles.serviceIcon]}>
                  <FontAwesome5 name="tshirt" size={12} color="#2563EB" />
                </View>
                <Text style={styles.sectionTitle}>Dịch vụ</Text>
              </View>
              <View style={styles.sectionStatus}>
                <Text style={styles.sectionStatusText}>
                  {getServiceStatusTag()}
                </Text>
              </View>
            </View>

            <StepperProgress steps={getServiceSteps()} />

            {serviceItems && serviceItems.length > 0 && (
              <View style={styles.serviceDetails}>
                {serviceItems.map((item, idx) => (
                  <View key={item.id || idx} style={{ marginBottom: 12 }}>
                    <View style={styles.serviceRow}>
                      <Text style={styles.serviceName}>
                        {item.product_name || item.name || `Dịch vụ ${idx + 1}`}
                      </Text>
                      {(item.package_name || item.package_badge) && (
                        <View style={styles.packageBadge}>
                          <Text style={styles.packageBadgeText}>
                            {item.package_name || item.package_badge}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.weightsRow}>
                      <View style={[styles.weightBox, styles.actualWeightBox]}>
                        <Text style={styles.actualWeightLabel}>KHÁCH BÁO</Text>
                        <View style={styles.weightStepper}>
                          <View style={styles.weightStepBtnSpacer} />
                          <View style={styles.weightStepperCenter}>
                            <Text style={styles.weightStepValue}>
                              {String(item.quantity ?? "-")}
                            </Text>
                            <Text style={styles.weightUnit}>
                              {item.unit || "kg"}
                            </Text>
                          </View>
                          <View style={styles.weightStepBtnSpacer} />
                        </View>
                      </View>
                      <View style={[styles.weightBox, styles.actualWeightBox]}>
                        <Text style={styles.actualWeightLabel}>THỰC TẾ</Text>
                        <View style={styles.weightStepper}>
                          {orderInfo?.status === OrderStatus.CREATED &&
                          !isChangesConfirmed ? (
                            <TouchableOpacity
                              style={styles.weightStepBtn}
                              onPress={() =>
                                changeActualBy(item.id ?? String(idx), -0.5)
                              }
                              activeOpacity={0.7}
                            >
                              <FontAwesome5
                                name="minus"
                                size={10}
                                color="#6B7280"
                              />
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.weightStepBtnSpacer} />
                          )}

                          <View style={styles.weightStepperCenter}>
                            <TextInput
                              style={styles.weightStepInput}
                              value={
                                actualWeights[item.id ?? String(idx)] ??
                                String(
                                  item.adjust_quantity ?? item.quantity ?? ""
                                )
                              }
                              onChangeText={(text) =>
                                setActualWeightFor(item.id ?? String(idx), text)
                              }
                              keyboardType="decimal-pad"
                              placeholder="0"
                              editable={
                                orderInfo?.status === OrderStatus.CREATED &&
                                !isChangesConfirmed
                              }
                            />
                            <Text style={styles.weightUnit}>kg</Text>
                          </View>

                          {orderInfo?.status === OrderStatus.CREATED &&
                          !isChangesConfirmed ? (
                            <TouchableOpacity
                              style={styles.weightStepBtn}
                              onPress={() =>
                                changeActualBy(item.id ?? String(idx), 0.5)
                              }
                              activeOpacity={0.7}
                            >
                              <FontAwesome5
                                name="plus"
                                size={10}
                                color="#2563EB"
                              />
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.weightStepBtnSpacer} />
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Price after adjustment */}
                    <View style={styles.servicePriceContainer}>
                      {(() => {
                        const actualWeight =
                          parseFloat(
                            actualWeights[item.id ?? String(idx)] ??
                            String(
                              item.adjust_quantity ?? item.quantity ?? "0"
                            )
                          ) || 0;
                        const unitPrice = item.unit_price ?? 0;
                        const adjustedPrice = actualWeight * unitPrice;
                        const originalPrice = (item.quantity ?? 0) * unitPrice;
                        const hasAdjustment =
                          actualWeight !== (item.quantity ?? 0);

                        return (
                          <View style={styles.servicePriceRow}>
                            {hasAdjustment && originalPrice > 0 && (
                              <Text style={styles.serviceOriginalPrice}>
                                {formatCurrencyVND(originalPrice)}
                              </Text>
                            )}
                            {hasAdjustment && (
                              <Text style={styles.serviceAdjustedPriceLabel}>
                                Giá điều chỉnh:{" "}
                              </Text>
                            )}
                            <Text style={styles.serviceAdjustedPrice}>
                              {formatCurrencyVND(adjustedPrice)}
                            </Text>
                          </View>
                        );
                      })()}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Total Service Quantities */}
            {serviceItems && serviceItems.length > 0 && (
              <View style={styles.serviceTotalContainer}>
                <View style={styles.serviceTotalRow}>
                  <View style={styles.serviceTotalItem}>
                    <Text style={styles.serviceTotalLabel}>
                      Tổng SL khách báo:
                    </Text>
                    <Text style={styles.serviceTotalValue}>
                      {serviceItems
                        .reduce(
                          (sum, item) => sum + (Number(item.quantity) || 0),
                          0
                        )
                        .toFixed(1)}{" "}
                      kg
                    </Text>
                  </View>
                  <View style={styles.serviceTotalItem}>
                    <Text style={styles.serviceTotalLabel}>
                      Tổng SL thực tế:
                    </Text>
                    <Text style={styles.serviceTotalValue}>
                      {serviceItems
                        .reduce((sum, item) => {
                          const itemId = item.id ?? "";
                          const adjustedQty = actualWeights[itemId]
                            ? parseFloat(actualWeights[itemId])
                            : Number(item.adjusted_quantity) ||
                            Number(item.quantity) ||
                            0;
                          return sum + adjustedQty;
                        }, 0)
                        .toFixed(1)}{" "}
                      kg
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* <View>
            <TouchableOpacity
              style={styles.printButton}
              onPress={() => handlePrintTag()}
              activeOpacity={0.7}
            >
              <FontAwesome5
                name="print"
                size={12}
                color="#374151"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.printButtonText}>
                In Tem ({serviceItems.length ?? 1} cái)
              </Text>
            </TouchableOpacity>
          </View> */}

            {/* <View style={styles.serviceFooter}>
            <Text style={styles.serviceNote}>
              *COD chuyến này sẽ thu khi trả đồ sạch (nếu có)
            </Text>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleComplete}
              activeOpacity={0.8}
            >
              <FontAwesome5
                name="truck-loading"
                size={12}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.completeButtonText}>
                Hoàn tất & Chờ đi Xưởng
              </Text>
            </TouchableOpacity>
          </View> */}

            {/* Service Additional Fee Input */}
            <View style={styles.additionalFeeContainer}>
              <View style={styles.additionalFeeHeader}>
                <Text style={styles.additionalFeeLabel}>
                  Phí bổ sung dịch vụ (VNĐ)
                </Text>
              </View>
              <View style={styles.additionalFeeInputContainer}>
                <View style={styles.additionalFeeInputWrapper}>
                  <TextInput
                    style={styles.additionalFeeInput}
                    value={serviceAdditionalFeeDisplay}
                    onChangeText={handleServiceAdditionalFeeChange}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    editable={orderInfo?.status === OrderStatus.CREATED && !isChangesConfirmed}
                  />
                  <Text style={styles.additionalFeeCurrency}>VNĐ</Text>
                </View>
              </View>
            </View>

            {/* Merged: Confirm changes and service additional fee button - toggle lock state */}
            {orderInfo?.status === OrderStatus.CREATED && (
              <View style={styles.stepConfirmContainer}>
                <TouchableOpacity
                  style={[
                    styles.stepConfirmButton,
                    isChangesConfirmed && styles.stepConfirmButtonUnlock
                  ]}
                  onPress={() => {
                    handleConfirmChanges();
                    handleServiceFeeConfirm();
                  }}
                  activeOpacity={1}
                >
                  <FontAwesome5
                    name={isChangesConfirmed ? "times" : "check"}
                    size={12}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.stepConfirmButtonText}>
                    {isChangesConfirmed ? "Hủy xác nhận" : "Xác nhận thay đổi"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}


        {/* Print Tag Button */}
        <View style={styles.printTagContainer}>
          <TouchableOpacity
            style={styles.printTagButton}
            onPress={handlePrintTag}
            activeOpacity={1}
          >
            <FontAwesome5
              name="print"
              size={14}
              color="#374151"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.printTagButtonText}>
              In tem
            </Text>
          </TouchableOpacity>
        </View>

        {/* Báo giá / Xử lí ngay Button */}
        {orderInfo?.status === OrderStatus.CREATED && (
          <View style={styles.confirmContainer}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!isConfirmEnabled() && styles.confirmButtonDisabled)
              ]}
              onPress={handleConfirm}
              activeOpacity={1}
              disabled={!isConfirmEnabled()}
            >
              <FontAwesome5
                name="calculator"
                size={14}
                color={isConfirmEnabled() ? "#FFFFFF" : "#9CA3AF"}
                style={{ marginRight: 8 }}
              />
              <Text style={[
                styles.confirmButtonText,
                !isConfirmEnabled() && styles.confirmButtonTextDisabled
              ]}>
                Gửi báo giá
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Return buttons for waiting_return tab */}
        {isWaitingReturn && (
          <View style={styles.returnActionsCard}>
            <View style={styles.returnActionsHeader}>
              <FontAwesome5 name="undo-alt" size={16} color="#2563EB" />
              <Text style={styles.returnActionsTitle}>Trả hàng cho khách</Text>
            </View>
            <Text style={styles.returnActionsDescription}>
              Chọn phương thức vận chuyển để trả hàng cho khách hàng
            </Text>
            <View style={styles.returnActions}>

              <TouchableOpacity
                style={styles.returnShippingButton}
                onPress={handleReturnWithShippingInternal}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="shipping-fast" size={18} color="#FFFFFF" />
                <Text style={styles.returnShippingButtonText}>
                  Đặt ship
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.returnStoreButton}
                onPress={handleReturnWithStoreTransportInternal}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="store" size={18} color="#FFFFFF" />
                <Text style={styles.returnStoreButtonText}>
                  Shop vận chuyển
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Loading Screen */}
      {isConfirming && (
        <LoadingScreen message="Đang gửi báo giá..." fullScreen={false} />
      )}

      {/* Return Shipping Modal */}
      <Modal
        visible={showReturnShippingModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isCreatingShipment) {
            setShowReturnShippingModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          {isCreatingShipment && (
            <View style={styles.modalLoadingOverlay}>
              <View style={styles.modalLoadingContent}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.modalLoadingText}>
                  Đang tạo đơn vận chuyển và cập nhật trạng thái...
                </Text>
              </View>
            </View>
          )}
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đặt ship trả hàng</Text>
              <TouchableOpacity
                onPress={() => {
                  if (!isCreatingShipment) {
                    setShowReturnShippingModal(false);
                    setSelectedReturnCarrierId(null);
                    setReturnShippingCarriers([]);
                    setReturnShippingRates([]);
                  }
                }}
                activeOpacity={0.7}
                disabled={isCreatingShipment}
              >
                <FontAwesome5 name="times" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Parcel Information */}
              <View style={styles.parcelSection}>
                <Text style={styles.modalSectionTitle}>Thông tin gói hàng</Text>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>COD (VNĐ)</Text>
                    <TextInput
                      style={styles.parcelInput}
                      value={returnShippingParcel.cod}
                      onChangeText={(text) => setReturnShippingParcel({ ...returnShippingParcel, cod: text })}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Giá trị (VNĐ)</Text>
                    <TextInput
                      style={styles.parcelInput}
                      value={returnShippingParcel.amount}
                      onChangeText={(text) => setReturnShippingParcel({ ...returnShippingParcel, amount: text })}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Chiều rộng (cm)</Text>
                    <TextInput
                      style={styles.parcelInput}
                      value={returnShippingParcel.width}
                      onChangeText={(text) => setReturnShippingParcel({ ...returnShippingParcel, width: text })}
                      keyboardType="numeric"
                      placeholder="10"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Chiều cao (cm)</Text>
                    <TextInput
                      style={styles.parcelInput}
                      value={returnShippingParcel.height}
                      onChangeText={(text) => setReturnShippingParcel({ ...returnShippingParcel, height: text })}
                      keyboardType="numeric"
                      placeholder="10"
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Chiều dài (cm)</Text>
                    <TextInput
                      style={styles.parcelInput}
                      value={returnShippingParcel.length}
                      onChangeText={(text) => setReturnShippingParcel({ ...returnShippingParcel, length: text })}
                      keyboardType="numeric"
                      placeholder="10"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Trọng lượng (gam)</Text>
                    <TextInput
                      style={styles.parcelInput}
                      value={returnShippingParcel.weight}
                      onChangeText={(text) => setReturnShippingParcel({ ...returnShippingParcel, weight: text })}
                      keyboardType="numeric"
                      placeholder="1000"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.fetchButton, fetchingReturnRates && styles.fetchButtonDisabled]}
                  onPress={handleFetchReturnRates}
                  disabled={fetchingReturnRates}
                  activeOpacity={0.8}
                >
                  {fetchingReturnRates ? (
                    <Text style={styles.fetchButtonText}>Đang tải...</Text>
                  ) : (
                    <>
                      <FontAwesome5 name="search" size={16} color="#FFFFFF" />
                      <Text style={styles.fetchButtonText}>Lấy báo giá</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Carrier Selection */}
              {returnShippingCarriers.length > 0 && (
                <View style={styles.carrierSection}>
                  <Text style={styles.modalSectionTitle}>Chọn đơn vị vận chuyển</Text>
                  {returnShippingCarriers.map((carrier) => (
                    <TouchableOpacity
                      key={carrier.id}
                      style={[
                        styles.carrierCard,
                        selectedReturnCarrierId === carrier.id && styles.carrierCardSelected,
                      ]}
                      onPress={() => setSelectedReturnCarrierId(carrier.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.carrierCardContent}>
                        {carrier.carrier_logo && (
                          <Image
                            source={{ uri: carrier.carrier_logo }}
                            style={styles.carrierLogo}
                          />
                        )}
                        <View style={styles.carrierInfo}>
                          <Text style={styles.carrierName}>{carrier.name}</Text>
                          {carrier.description && (
                            <Text style={styles.carrierDescription}>{carrier.description}</Text>
                          )}
                          {carrier.estimatedTime && (
                            <Text style={styles.carrierTime}>Thời gian: {carrier.estimatedTime}</Text>
                          )}
                        </View>
                        <View style={styles.carrierPrice}>
                          <Text style={styles.carrierPriceText}>
                            {formatCurrencyVND(carrier.price || 0)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {returnShippingCarriers.length === 0 && !fetchingReturnRates && (
                <View style={styles.emptyState}>
                  <FontAwesome5 name="shipping-fast" size={32} color="#D1D5DB" />
                  <Text style={styles.emptyStateText}>
                    Nhập thông tin gói hàng và nhấn "Lấy báo giá" để xem các đơn vị vận chuyển
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowReturnShippingModal(false);
                  setSelectedReturnCarrierId(null);
                  setReturnShippingCarriers([]);
                  setReturnShippingRates([]);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelButtonText}>Hủy bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  (!selectedReturnCarrierId || isCreatingShipment) && styles.modalConfirmButtonDisabled,
                ]}
                onPress={handleConfirmReturnShipping}
                disabled={!selectedReturnCarrierId || isCreatingShipment}
                activeOpacity={0.8}
              >
                {isCreatingShipment ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.modalConfirmButtonText}>
                      Đang tạo đơn vận chuyển...
                    </Text>
                  </>
                ) : (
                  <Text
                    style={[
                      styles.modalConfirmButtonText,
                      !selectedReturnCarrierId && styles.modalConfirmButtonTextDisabled,
                    ]}
                  >
                    Xác nhận
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: storeMainContentPaddingTop(),
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    padding: 16,
    paddingTop: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  headerBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  orderStatusBadge: {
    backgroundColor: "#DBEAFE",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  orderStatusBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1E40AF",
  },
  splitBadge: {
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  splitBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#7C3AED",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  incidentCard: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
  },
  incidentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  incidentHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  incidentTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#991B1B",
  },
  incidentItem: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#FEE2E2",
  },
  incidentStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  incidentStatusLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  incidentDesc: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  incidentMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  incidentImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: "#F3F4F6",
  },
  incidentActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  incidentBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  incidentBtnConfirm: {
    backgroundColor: "#16A34A",
  },
  incidentBtnReject: {
    backgroundColor: "#DC2626",
  },
  incidentBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#7C3AED",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  serviceCard: {
    borderLeftColor: "#2563EB",
    // marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionIcon: {
    backgroundColor: "#F3E8FF",
    padding: 4,
    borderRadius: 4,
  },
  serviceIcon: {
    backgroundColor: "#EFF6FF",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#7C3AED",
    textTransform: "uppercase",
  },
  sectionStatus: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectionStatusText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#6B7280",
  },
  checkboxCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 12,
    marginTop: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  checkboxContent: {
    flex: 1,
  },
  checkboxTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1F2937",
  },
  checkboxMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  checkboxPrice: {
    color: "#7C3AED",
    fontWeight: "bold",
  },
  productImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
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
  sectionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  codLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  codAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2563EB",
  },
  codNote: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "normal",
  },
  shipButton: {
    backgroundColor: "#7C3AED",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  shipButtonDisabled: {
    backgroundColor: "#10B981",
  },
  shipButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  serviceDetails: {
    backgroundColor: "rgba(239, 246, 255, 0.5)",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    marginBottom: 12,
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
  },
  packageBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  packageBadgeText: {
    fontSize: 10,
    color: "#1E40AF",
  },
  weightsRow: {
    flexDirection: "row",
    gap: 12,
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
  weightLabel: {
    fontSize: 9,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  actualWeightLabel: {
    fontSize: 9,
    color: "#3B82F6",
    fontWeight: "bold",
    marginBottom: 4,
  },
  weightValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  weightStepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    minHeight: 32,
  },
  weightStepBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  weightStepBtnSpacer: {
    width: 28,
    height: 28,
    flexShrink: 0,
  },
  weightStepperCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 0,
  },
  weightStepValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
  },
  weightStepInput: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E40AF",
    padding: 0,
    minWidth: 36,
    maxWidth: 72,
    textAlign: "center",
    textAlignVertical: "center",
  },
  weightInput: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E40AF",
    padding: 0,
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
  },
  weightStepButtonContainer: {
    minWidth: 30,
    minHeight: 30,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  weightStepButton: {
    fontSize: 12,
    color: "#6B7280",
    paddingHorizontal: 4,
  },
  weightStepButtonActive: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "700",
    paddingHorizontal: 4,
  },
  weightUnit: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "bold",
    flexShrink: 0,
  },
  servicePriceContainer: {
    marginTop: 8,
    alignItems: "flex-end",
  },
  servicePriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  serviceOriginalPrice: {
    fontSize: 12,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  serviceAdjustedPriceLabel: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  serviceAdjustedPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  serviceFeeContainer: {
    marginTop: 16,
    marginBottom: 12,
  },
  serviceFeeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  serviceFeeLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1F2937",
  },
  serviceFeeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  serviceFeeBadgeText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2563EB",
  },
  serviceFeeInputContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  serviceFeeInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  serviceFeeInput: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    padding: 0,
    flex: 1,
  },
  serviceFeeCurrency: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  serviceFeeCard: {
    marginTop: 16,
    marginBottom: 12,
  },
  printButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  printButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151",
  },
  serviceFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  serviceNote: {
    fontSize: 10,
    color: "#6B7280",
    fontStyle: "italic",
    marginBottom: 8,
  },
  completeButton: {
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  completeButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  stepConfirmContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  stepConfirmButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stepConfirmButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  stepConfirmButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.6,
  },
  stepConfirmButtonUnlock: {
    backgroundColor: "#EF4444",
  },
  printTagContainer: {
    margin: 16,
    marginTop: 20,
    // marginBottom: 20,
  },
  printTagButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  printTagButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  serviceTotalContainer: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  serviceTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  serviceTotalItem: {
    flex: 1,
  },
  serviceTotalLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
  },
  serviceTotalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#16A34A",
  },
  confirmContainer: {
    marginHorizontal: 16,
    // marginTop: 8,
    marginBottom: 20,
  },
  confirmButton: {
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  confirmButtonDisabled: {
    backgroundColor: "#E5E7EB",
    opacity: 1,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonTextDisabled: {
    color: "#6B7280",
  },
  additionalFeeContainer: {
    marginTop: 16,
    marginBottom: 12,
  },
  additionalFeeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  additionalFeeLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1F2937",
  },
  feeToggleButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  feeToggleButtonActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  additionalFeeInputContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  additionalFeeInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  additionalFeeInput: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    padding: 0,
    flex: 1,
  },
  additionalFeeCurrency: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  returnActionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 20,
    marginBottom: 80,
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
  // Return Shipping Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "90%",
    maxWidth: 500,
    maxHeight: "90%",
    padding: 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalBody: {
    padding: 20,
    maxHeight: 500,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    backgroundColor: "#F3F4F6",
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  modalConfirmButton: {
    backgroundColor: "#2563EB",
  },
  modalConfirmButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  modalConfirmButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalConfirmButtonTextDisabled: {
    color: "#9CA3AF",
  },
  modalLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    borderRadius: 16,
  },
  modalLoadingContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 200,
  },
  modalLoadingText: {
    marginTop: 16,
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    textAlign: "center",
  },
  parcelSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  parcelInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  fetchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    marginTop: 8,
  },
  fetchButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  fetchButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  carrierSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  carrierCard: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  carrierCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  carrierCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  carrierLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    resizeMode: "contain",
  },
  carrierInfo: {
    flex: 1,
  },
  carrierName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  carrierDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  carrierTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  carrierPrice: {
    alignItems: "flex-end",
  },
  carrierPriceText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 20,
  },
});
