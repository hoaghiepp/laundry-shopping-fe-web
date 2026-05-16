import {
  FactoryBatchMachineType,
  FactoryBatchStatus,
  IncidentStatus,
  IncidentType,
  ProductType,
  ServiceOrderItemStatus,
} from "@/constants/enum";
import { factoryService } from "@/services/api/factoryService";
import { logisticService } from "@/services/api/logisticService";
import { Order, orderService } from "@/services/api/orderService";
import { storeService } from "@/services/api/storeService";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { IncidentReport, IncidentReportSection } from "./IncidentReportSection";

interface FactoryItemDetailScreenProps {
  itemId: string; // tracking_item_id
  orderId?: string; // order_id (optional for backward compatibility)
  orderCode?: string;
  type: "normal" | "exception_wait" | "return";
  factoryId?: string;
  onBack: () => void;
  onUpdateStatus?: (status: string) => void;
  onReportIssue?: () => void;
  onReportSubmit?: (report: IncidentReport) => void;
  onBatchUpdate?: () => void; // Callback when batch is created or updated
}

export const FactoryItemDetailScreen: React.FC<
  FactoryItemDetailScreenProps
> = ({ itemId, orderId, type, factoryId, onBack, onReportSubmit, onBatchUpdate }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState<string>("");
  const [trackingItem, setTrackingItem] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [existingBatch, setExistingBatch] = useState<any>(null);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [isIncidentsExpanded, setIsIncidentsExpanded] = useState(true);

  const fetchIncidents = async (trackingIdToUse: string) => {
    try {
      setLoadingIncidents(true);
      const response = await factoryService.searchIncidents(
        {
          tracking_id: trackingIdToUse,
        },
        { page: 0, size: 100 }
      );

      if (response?.data && Array.isArray(response.data)) {
        setIncidents(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch incidents:", error);
    } finally {
      setLoadingIncidents(false);
    }
  };

  const fetchBatch = async (trackingItemIdToUse: string) => {
    try {
      setLoadingBatch(true);
      const response = await factoryService.searchFactoryBatches(
        {
          service_item_tracking_id: trackingItemIdToUse,
        },
        { page: 0, size: 1 }
      );

      if (response?.data && Array.isArray(response.data) && response.data.length > 0) {
        setExistingBatch(response.data[0]);
      } else {
        setExistingBatch(null);
      }
    } catch (error) {
      console.error("Failed to fetch batch:", error);
      setExistingBatch(null);
    } finally {
      setLoadingBatch(false);
    }
  };

  const canCreateBatch = () => {
    if (!incidents || incidents.length === 0) {
      // No incidents reported, allow creating batch
      return true;
    }

    // Only allow creating batch when all incidents have been accepted by user
    return incidents.every(
      (incident: any) => incident.status === IncidentStatus.USER_ACCEPTED
    );
  };

  // Helper: at least one washing service item in order
  const hasWashingServiceItem = () =>
    order?.order_items?.some(
      (item: any) =>
        item.product_type === ProductType.SERVICE &&
        item.service_status === ServiceOrderItemStatus.WASHING
    ) || false;

  // Helper: current batch is washer, in process, and item is in washing status
  const isWasherBatchInProcessForWashingItem = () => {
    if (!existingBatch) return false;
    const isWasher =
      existingBatch.machine_type === FactoryBatchMachineType.WASHER;
    const isInProcess = existingBatch.status === FactoryBatchStatus.IN_PROCESS;
    return isWasher && isInProcess && hasWashingServiceItem();
  };

  // Helper: current batch is dryer, in process, and item is in washing status
  const isDryerBatchInProcessForWashingItem = () => {
    if (!existingBatch) return false;
    const isDryer =
      existingBatch.machine_type === FactoryBatchMachineType.DRYER;
    const isInProcess = existingBatch.status === FactoryBatchStatus.IN_PROCESS;
    return isDryer && isInProcess && hasWashingServiceItem();
  };

  // Complete current washer batch and create a new dryer batch
  const completeWasherAndCreateDryerBatch = async () => {
    if (!existingBatch?.id || !factoryId || !trackingItem?.id) return;

    try {
      setIsCreatingBatch(true);

      // 1. Mark current washer batch as completed
      await factoryService.udpateFactoryBatchStatus(existingBatch.id, {
        status: FactoryBatchStatus.COMPLETED,
      });

      // 2. Create new dryer batch for the same tracking item
      const dryerBatchData = {
        factory_id: factoryId,
        machine_type: FactoryBatchMachineType.DRYER,
        service_item_tracking_id: trackingItem.id,
      };

      const response = await factoryService.createFactoryBatch(dryerBatchData);

      // Immediately mark dryer batch as in-process
      if (response?.data?.id) {
        await factoryService.udpateFactoryBatchStatus(response.data.id, {
          status: FactoryBatchStatus.IN_PROCESS,
        });
      }

      // 3. Refresh batch info
      await fetchBatch(trackingItem.id);

      Alert.alert(
        "Thành công",
        "Đã xác nhận giặt xong và tạo lô sấy cho món đồ này."
      );
      
      // Notify parent to refresh orders
      if (onBatchUpdate) {
        onBatchUpdate();
      }
    } catch (error) {
      console.error("Failed to complete washer batch and create dryer batch:", error);
      Alert.alert(
        "Lỗi",
        "Không thể chuyển sang sấy. Vui lòng thử lại."
      );
    } finally {
      setIsCreatingBatch(false);
    }
  };

  // Complete current dryer batch
  const completeDryerBatch = async () => {
    if (!existingBatch?.id || !trackingItem?.id) return;

    try {
      setIsCreatingBatch(true);

      await factoryService.udpateFactoryBatchStatus(existingBatch.id, {
        status: FactoryBatchStatus.COMPLETED,
      });

      // Refresh batch info
      await fetchBatch(trackingItem.id);

      Alert.alert("Thành công", "Đã xác nhận sấy xong cho món đồ này.");
      
      // Notify parent to refresh orders
      if (onBatchUpdate) {
        onBatchUpdate();
      }
    } catch (error) {
      console.error("Failed to complete dryer batch:", error);
      Alert.alert(
        "Lỗi",
        "Không thể cập nhật trạng thái lô sấy. Vui lòng thử lại."
      );
    } finally {
      setIsCreatingBatch(false);
    }
  };

  const handleCreateFactoryBatch = () => {
    if (!factoryId) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin xưởng");
      return;
    }

    if (!canCreateBatch()) {
      Alert.alert(
        "Không thể tạo lô",
        "Tất cả sự cố phải được khách hàng chấp nhận trước khi tạo lô giặt"
      );
      return;
    }

    console.log("existingBatch", existingBatch, trackingItem);

    // If batch already exists
    if (existingBatch) {
      // Case 1: dryer batch is in process and item is in washing status -> finish drying
      if (isDryerBatchInProcessForWashingItem()) {
        Alert.alert(
          "Đã sấy xong",
          "Xác nhận đã sấy xong món đồ này?",
          [
            {
              text: "Hủy",
              style: "cancel",
            },
            {
              text: "Xác nhận",
              onPress: () => {
                completeDryerBatch();
              },
            },
          ],
          { cancelable: true }
        );
      }
      // Case 2: washer batch is in process and item is washing -> finish wash and move to dryer
      else if (isWasherBatchInProcessForWashingItem()) {
        Alert.alert(
          "Giặt xong",
          "Xác nhận đã giặt xong và chuyển sang sấy?",
          [
            {
              text: "Hủy",
              style: "cancel",
            },
            {
              text: "Xác nhận",
              onPress: () => {
                completeWasherAndCreateDryerBatch();
              },
            },
          ],
          { cancelable: true }
        );
      } else {
        // Default: update batch status to IN_PROCESS
        Alert.alert(
          "Xác nhận giặt",
          `Xác nhận bắt đầu giặt với ${
            existingBatch.machine_type === FactoryBatchMachineType.WASHER
              ? "máy giặt"
              : "máy sấy"
          }?`,
          [
            {
              text: "Hủy",
              style: "cancel",
            },
            {
              text: "Xác nhận",
              onPress: () => updateBatchStatusToInProgress(),
            },
          ],
          { cancelable: true }
        );
      }
      return;
    }

    // If no batch exists, create new batch
    Alert.alert(
      "Tạo lô giặt",
      "Chọn loại máy:",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Máy giặt",
          onPress: () => createFactoryBatch(FactoryBatchMachineType.WASHER),
        },
        // {
        //   text: "Máy sấy",
        //   onPress: () => createFactoryBatch(FactoryBatchMachineType.DRYER),
        // },
      ],
      { cancelable: true }
    );
  };

  const createFactoryBatch = async (machineType: FactoryBatchMachineType) => {
    if (!factoryId) return;

    try {
      setIsCreatingBatch(true);
      const batchData = {
        factory_id: factoryId,
        machine_type: machineType,
        service_item_tracking_id: trackingItem?.id,
      }

      console.log("batchData", batchData);

      await factoryService.createFactoryBatch(batchData);

      // Refresh batch info
      if (trackingItem?.id) {
        await fetchBatch(trackingItem.id);
      }

      Alert.alert(
        "Thành công",
        `Đã tạo lô giặt cho ${
          machineType === FactoryBatchMachineType.WASHER
            ? "máy giặt"
            : "máy sấy"
        }`
      );
      
      // Notify parent to refresh orders
      if (onBatchUpdate) {
        onBatchUpdate();
      }
    } catch (error) {
      console.error("Failed to create factory batch:", error);
      Alert.alert("Lỗi", "Không thể tạo lô giặt. Vui lòng thử lại.");
    } finally {
      setIsCreatingBatch(false);
    }
  };

  const updateBatchStatusToInProgress = async () => {
    if (!existingBatch?.id) return;

    try {
      setIsCreatingBatch(true);
      console.log(existingBatch.id)
      await factoryService.udpateFactoryBatchStatus(existingBatch.id, {
        status: FactoryBatchStatus.IN_PROCESS,
      });

      // Refresh batch info
      if (trackingItem?.id) {
        await fetchBatch(trackingItem.id);
      }

      Alert.alert(
        "Thành công",
        `Đã xác nhận bắt đầu ${
          existingBatch.machine_type === FactoryBatchMachineType.WASHER
            ? "giặt"
            : "sấy"
        }`
      );
      
      // Notify parent to refresh orders
      if (onBatchUpdate) {
        onBatchUpdate();
      }
    } catch (error) {
      console.error("Failed to update batch status:", error);
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái lô. Vui lòng thử lại.");
    } finally {
      setIsCreatingBatch(false);
    }
  };

  useEffect(() => {
    // console.log("itemId", itemId);
    // console.log("orderId", orderId);
    // console.log("factoryId", factoryId);
    fetchOrderDetails();
  }, [itemId, orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);

      let actualOrderId = orderId;
      let foundTrackingItem = null;

      // Always fetch tracking item to get tracking_id for incidents
      if (factoryId) {
        try {
          const trackingResponse = await logisticService.searchTrackingItems(
            {
              current_store_id: factoryId,
            },
            { page: 0, size: 1000 }
          );

          if (trackingResponse?.data && Array.isArray(trackingResponse.data)) {
            foundTrackingItem = trackingResponse.data.find(
              (item: any) => item.id === itemId
            );

            // console.log("foundTrackingItem", foundTrackingItem);

            if (foundTrackingItem) {
              // Use order_id from tracking item if not provided
              if (!actualOrderId) {
                actualOrderId = foundTrackingItem.order_id;
              }
              setTrackingItem(foundTrackingItem);

              // Fetch incidents using tracking_id
              if (foundTrackingItem.id) {
                fetchIncidents(foundTrackingItem.id);
                // Fetch batch using service_item_tracking_id
                fetchBatch(foundTrackingItem.id);
              }
            }
          }
        } catch (error) {
          console.error("Failed to fetch tracking item:", error);
        }
      }

      if (!actualOrderId) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin đơn hàng");
        return;
      }

      // Use searchStoreOrders to find order by ID
      const searchParams: any = {
        fetch_order_items: true,
      };

      if (factoryId) {
        searchParams.factory_id = factoryId;
      }

      const response = await orderService.searchStoreOrders(searchParams, {
        page: 0,
        size: 100,
      });

      // Find the specific order by order_id from the search results
      const foundOrder = response?.data?.find(
        (o: Order) => o.id === actualOrderId
      );

      if (foundOrder) {
        setOrder(foundOrder);
        // Fetch store name
        if (foundOrder.hub_id) {
          try {
            const storeResponse = await storeService.getStoreProfile(
              foundOrder.hub_id
            );
            if (storeResponse?.data?.name) {
              setStoreName(storeResponse.data.name);
            }
          } catch (error) {
            console.error("Failed to fetch store name:", error);
          }
        }
      } else {
        Alert.alert("Lỗi", "Không tìm thấy đơn hàng");
      }
    } catch (error) {
      console.error("Failed to fetch order details:", error);
      Alert.alert("Lỗi", "Không thể tải thông tin đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: ServiceOrderItemStatus) => {
    switch (status) {
      case ServiceOrderItemStatus.PICKING:
      case ServiceOrderItemStatus.AT_FACTORY:
      case ServiceOrderItemStatus.WASHING:
        return "#3b82f6";
      case ServiceOrderItemStatus.DELIVERING:
      case ServiceOrderItemStatus.RETURNED:
      case ServiceOrderItemStatus.COMPLETED:
      case ServiceOrderItemStatus.WASHED:
        return "#10b981";
      case ServiceOrderItemStatus.CANCELLED:
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusLabel = (status: ServiceOrderItemStatus) => {
    console.log("status", status);
    switch (status) {
      case ServiceOrderItemStatus.PICKING:
        return "Đang lấy hàng";
      case ServiceOrderItemStatus.AT_FACTORY:
        return "Ở xưởng";
      case ServiceOrderItemStatus.WASHING:
        return "Đang giặt";
      case ServiceOrderItemStatus.DELIVERING:
        return "Đang giao";
      case ServiceOrderItemStatus.RETURNED:
        return "Đã trả";
      case ServiceOrderItemStatus.COMPLETED:
      case ServiceOrderItemStatus.WASHED:
        return "Đã giặt xong";
      case ServiceOrderItemStatus.CANCELLED:
        return "Đã hủy";
      default:
        return "Chưa xử lý";
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={onBack}>
            <FontAwesome5 name="arrow-left" size={20} color="#1F2937" />
          </Pressable>
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={onBack}>
            <FontAwesome5 name="arrow-left" size={20} color="#1F2937" />
          </Pressable>
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không tìm thấy đơn hàng</Text>
        </View>
      </View>
    );
  }

  const serviceItems =
    order.order_items?.filter(
      (item: any) => item.product_type === ProductType.SERVICE
    ) || [];

  // Check if order is completed
  const allServiceItemsCompleted = serviceItems.every(
    (item: any) => item.service_status === ServiceOrderItemStatus.COMPLETED
  );
  const hasCompletedBatch = existingBatch?.status === FactoryBatchStatus.COMPLETED;
  const isCompleted = allServiceItemsCompleted || hasCompletedBatch;

  const confirmButtonLabel = isCreatingBatch
    ? existingBatch
      ? "Đang xác nhận..."
      : "Đang tạo lô..."
    : existingBatch
    ? isDryerBatchInProcessForWashingItem()
      ? "Đã sấy xong"
      : isWasherBatchInProcessForWashingItem()
      ? "Giặt xong, chuyển sang sấy"
      : "Xác nhận giặt"
    : "Tạo lô giặt";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <FontAwesome5 name="arrow-left" size={20} color="#1F2937" />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
          <Text style={styles.headerSubtitle}>#{order.code}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
      >
        {/* Customer Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="user" size={16} color="#3b82f6" />
            <Text style={styles.cardTitle}>Thông tin khách hàng</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tên:</Text>
            <Text style={styles.infoValue}>
              {order.shipping_full_name_snapshot}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SĐT:</Text>
            <Text style={styles.infoValue}>
              {order.shipping_phone_number_snapshot}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Địa chỉ:</Text>
            <Text style={styles.infoValue}>
              {order.shipping_address_detail_snapshot},{" "}
              {order.shipping_ward_snapshot}, {order.shipping_district_snapshot}
              , {order.shipping_province_snapshot}
            </Text>
          </View>
        </View>

        {/* Store Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="store" size={16} color="#3b82f6" />
            <Text style={styles.cardTitle}>Thông tin tiệm</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Từ tiệm:</Text>
            <Text style={styles.infoValue}>{storeName || order.hub_id}</Text>
          </View>
        </View>

        {/* Batch Status Card */}
        {existingBatch && (
          <View style={[styles.card, styles.batchStatusCard]}>
            <View style={styles.batchStatusHeader}>
              <FontAwesome5 name="industry" size={16} color="#3b82f6" />
              <Text style={styles.cardTitle}>Trạng thái lô giặt</Text>
            </View>
            <View style={styles.batchStatusContent}>
              <View style={styles.batchInfoRow}>
                <Text style={styles.batchLabel}>Loại máy:</Text>
                <Text style={styles.batchValue}>
                  {existingBatch.machine_type === FactoryBatchMachineType.WASHER
                    ? "Máy giặt"
                    : "Máy sấy"}
                </Text>
              </View>
              <View style={styles.batchInfoRow}>
                <Text style={styles.batchLabel}>Trạng thái:</Text>
                <View style={[
                  styles.batchStatusBadge,
                  existingBatch.status === FactoryBatchStatus.CREATED && styles.batchStatusCreated,
                  existingBatch.status === FactoryBatchStatus.IN_PROCESS && styles.batchStatusInProcess,
                  existingBatch.status === FactoryBatchStatus.COMPLETED && styles.batchStatusCompleted,
                  existingBatch.status === FactoryBatchStatus.CANCELLED && styles.batchStatusCancelled,
                ]}>
                  <Text style={styles.batchStatusText}>
                    {existingBatch.status === FactoryBatchStatus.CREATED && "Đã tạo lô"}
                    {existingBatch.status === FactoryBatchStatus.IN_PROCESS && "Đang xử lý"}
                    {existingBatch.status === FactoryBatchStatus.COMPLETED && "Hoàn thành"}
                    {existingBatch.status === FactoryBatchStatus.CANCELLED && "Đã hủy"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Service Items */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="list" size={16} color="#3b82f6" />
            <Text style={styles.cardTitle}>Danh sách dịch vụ</Text>
          </View>
          {serviceItems.map((item: any, index: number) => (
            <View key={item.id || index} style={styles.serviceItem}>
              <View style={styles.serviceItemHeader}>
                <Text style={styles.serviceItemName}>{item.product_name}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        getStatusColor(item.service_status) + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(item.service_status) },
                    ]}
                  >
                    {getStatusLabel(item.service_status)}
                  </Text>
                </View>
              </View>
              <View style={styles.serviceItemDetails}>
                <Text style={styles.serviceItemQty}>
                  Số lượng: {item.adjusted_quantity || item.quantity}{" "}
                  {item.unit}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Reported Incidents Section */}
        {incidents.length > 0 && (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              activeOpacity={0.8}
              onPress={() => setIsIncidentsExpanded((prev) => !prev)}
            >
              <View style={styles.incidentsHeaderLeft}>
                <FontAwesome5
                  name="exclamation-triangle"
                  size={16}
                  color="#ef4444"
                />
                <Text style={styles.cardTitle}>
                  Sự cố đã báo cáo ({incidents.length})
                </Text>
              </View>
              <FontAwesome5
                name={isIncidentsExpanded ? "chevron-up" : "chevron-down"}
                size={14}
                color="#6B7280"
              />
            </TouchableOpacity>
            {isIncidentsExpanded &&
              incidents.map((incident: any, index: number) => (
                <View key={incident.id || index} style={styles.incidentCard}>
                  <View style={styles.incidentHeader}>
                    <View style={styles.incidentTypeContainer}>
                      <Text style={styles.incidentType}>
                        {incident.type === IncidentType.TEAR && "🔴 Rách/Hỏng"}
                        {incident.type === IncidentType.COLOR_FADE &&
                          "🟡 Phai màu"}
                        {incident.type === IncidentType.LOST && "⚫ Mất hàng"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.incidentStatusBadge,
                        incident.status === IncidentStatus.USER_ACCEPTED &&
                          styles.incidentStatusAccepted,
                        incident.status === IncidentStatus.USER_REJECTED &&
                          styles.incidentStatusRejected,
                      ]}
                    >
                      <Text style={styles.incidentStatusText}>
                        {incident.status === IncidentStatus.CREATED &&
                          "Chờ xử lý"}
                        {incident.status === IncidentStatus.USER_ACCEPTED &&
                          "Đã chấp nhận"}
                        {incident.status === IncidentStatus.USER_REJECTED &&
                          "Đã từ chối"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.incidentDescription}>
                    {incident.description}
                  </Text>

                  {incident.image_urls && incident.image_urls.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.incidentImagesContainer}
                    >
                      {incident.image_urls.map(
                        (url: string, imgIndex: number) => (
                          <Image
                            key={imgIndex}
                            source={{ uri: url }}
                            style={styles.incidentImage}
                          />
                        )
                      )}
                    </ScrollView>
                  )}

                  {incident.created_date && (
                    <Text style={styles.incidentDate}>
                      Báo cáo lúc:{" "}
                      {new Date(incident.created_date).toLocaleString("vi-VN")}
                    </Text>
                  )}
                </View>
              ))}
          </View>
        )}

      {/* Incident Report Section - disabled when order is already in a batch */}
      {!existingBatch && (
        <IncidentReportSection
          orderId={order.id}
          orderCode={order.code}
          customerId={order.customer_id}
          trackingId={itemId} // itemId is the tracking_item_id passed from FactoryDashboardScreen
          onReportSubmit={(report) => {
            if (onReportSubmit) {
              onReportSubmit(report);
            }
            // Refresh incidents list after submitting new report
            if (trackingItem?.id) {
              fetchIncidents(trackingItem.id);
            }
            // Refetch order to update UI
            fetchOrderDetails();
          }}
        />
      )}
      </ScrollView>

      {/* Create Factory Batch Button - Hide if completed */}
      {!isCompleted && (
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={[
              styles.createBatchButton,
              (isCreatingBatch || !canCreateBatch()) &&
                styles.createBatchButtonDisabled,
            ]}
            onPress={handleCreateFactoryBatch}
            disabled={isCreatingBatch || !canCreateBatch()}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="industry" size={16} color="#FFFFFF" />
            <Text style={styles.createBatchButtonText}>
              {confirmButtonLabel}
            </Text>
          </TouchableOpacity>
          {!canCreateBatch() && incidents.length > 0 && (
            <Text style={styles.disabledHintText}>
              Tất cả sự cố phải được khách hàng chấp nhận
            </Text>
          )}
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
    backgroundColor: "#fff",
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  incidentsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  serviceItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  serviceItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  serviceItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  serviceItemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  serviceItemQty: {
    fontSize: 12,
    color: "#6B7280",
  },
  serviceItemPrice: {
    fontSize: 12,
    color: "#1F2937",
    fontWeight: "500",
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
    fontSize: 16,
    fontWeight: "700",
    color: "#3b82f6",
  },
  incidentCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  incidentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  incidentTypeContainer: {
    flex: 1,
  },
  incidentType: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991B1B",
  },
  incidentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
    color: "#92400E",
  },
  incidentDescription: {
    fontSize: 13,
    color: "#991B1B",
    marginBottom: 8,
    lineHeight: 18,
  },
  incidentImagesContainer: {
    marginVertical: 8,
    flexGrow: 0,
  },
  incidentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  incidentDate: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
  },
  bottomButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 4,
  },
  createBatchButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createBatchButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
  },
  createBatchButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  disabledHintText: {
    fontSize: 12,
    color: "#EF4444",
    textAlign: "center",
    marginTop: 8,
  },
  batchStatusCard: {
    backgroundColor: "#EFF6FF",
    borderWidth: 2,
    borderColor: "#3b82f6",
  },
  batchStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#BFDBFE",
  },
  batchStatusContent: {
    gap: 8,
  },
  batchInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  batchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  batchValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
  batchStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  batchStatusCreated: {
    backgroundColor: "#FEF3C7",
  },
  batchStatusInProcess: {
    backgroundColor: "#DBEAFE",
  },
  batchStatusCompleted: {
    backgroundColor: "#D1FAE5",
  },
  batchStatusCancelled: {
    backgroundColor: "#FEE2E2",
  },
  batchStatusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
  },
});
