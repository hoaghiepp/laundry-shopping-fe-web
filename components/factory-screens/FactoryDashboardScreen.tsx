import { FactoryBatchMachineType, FactoryBatchStatus, IncidentStatus, LogisticTripItemType, OrderStatus, ProductType, ServiceOrderItemStatus } from '@/constants/enum';
import { factoryService } from '@/services/api/factoryService';
import { logisticService } from '@/services/api/logisticService';
import { Order } from '@/services/api/orderService';
import { storeService } from '@/services/api/storeService';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FilterButton } from '../factory/FilterButton';
import { ItemCard } from '../factory/ItemCard';

interface FactoryDashboardScreenProps {
  orders?: Order[];
  factoryId?: string;
  onScanPress: () => void;
  onItemPress: (trackingId: string, orderId: string, type: 'normal' | 'exception_wait' | 'return') => void;
  onTripPress?: (orderId: string, trackingId: string) => void;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  loadingMore?: boolean;
  hasMore?: boolean;
  loading?: boolean;
  refreshing?: boolean;
  refreshTrigger?: number;
}

// Tabs:
// - todo: in processing at factory
// - wait: completed or cancelled (waiting for return/hand-over)
// - done: completed
// - cancelled: cancelled
type DashboardTab = 'todo' | 'wait' | 'done' | 'cancelled';

export const FactoryDashboardScreen: React.FC<FactoryDashboardScreenProps> = ({
  orders = [],
  factoryId,
  onScanPress,
  onItemPress,
  onTripPress,
  onLoadMore,
  onRefresh,
  loadingMore = false,
  hasMore = false,
  loading = false,
  refreshing = false,
  refreshTrigger,
}) => {
  const [activeFilter, setActiveFilter] = useState<DashboardTab>('todo');
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [orderToTrackingMap, setOrderToTrackingMap] = useState<Record<string, string>>({});
  const [trackingToOrderMap, setTrackingToOrderMap] = useState<Record<string, string>>({});
  const [batchesMap, setBatchesMap] = useState<Record<string, any>>({});
  const [incidentsMap, setIncidentsMap] = useState<Record<string, any[]>>({});
  const [expandedWaitGroups, setExpandedWaitGroups] = useState<Record<string, boolean>>({});
  const [expandedTripGroups, setExpandedTripGroups] = useState<Record<string, boolean>>({});
  const [selectedWaitOrders, setSelectedWaitOrders] = useState<Record<string, boolean>>({});
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [ordersInTrips, setOrdersInTrips] = useState<Record<string, { tripId: string; tripCode: string }>>({});
  const [ordersInCurrentFactory, setOrdersInCurrentFactory] = useState<string[]>([]);

  // Fetch store names for all hub_ids in orders
  useEffect(() => {
    const fetchStoreNames = async () => {
      const uniqueHubIds = [...new Set(orders.map(order => order.hub_id).filter(Boolean))];
      const nameMap: Record<string, string> = {};

      await Promise.all(
        uniqueHubIds.map(async (hubId) => {
          try {
            const response = await storeService.getStoreProfile(hubId);
            if (response?.data?.name) {
              nameMap[hubId] = response.data.name;
            }
          } catch (error) {
            console.error(`Failed to fetch store name for ${hubId}:`, error);
            nameMap[hubId] = hubId; // Fallback to ID
          }
        })
      );

      const response = await logisticService.searchTrackingItems(
        {
          current_store_id: factoryId,
        },
        { page: 0, size: 1000 }
      );

      setOrdersInCurrentFactory(response.data.map((item: any) => item.order_id) as string[]);

      setStoreNames(nameMap);
    };

    if (orders.length > 0) {
      fetchStoreNames();
    }


  }, [orders]);

  // Fetch tracking items for all orders
  useEffect(() => {
    const fetchTrackingItems = async () => {
      if (!factoryId || orders.length === 0) return;

      try {
        const response = await logisticService.searchTrackingItems(
          {
            current_store_id: factoryId,
          },
          { page: 0, size: 1000 }
        );

        if (response?.data && Array.isArray(response.data)) {
          const trackingMap: Record<string, string> = {};
          const reverseMap: Record<string, string> = {};

          response.data.forEach((trackingItem: any) => {
            if (trackingItem.order_id && trackingItem.id) {
              // Map order_id to tracking_item_id
              trackingMap[trackingItem.order_id] = trackingItem.id;
              // Map tracking_item_id to order_id (reverse)
              reverseMap[trackingItem.id] = trackingItem.order_id;
            }
          });

          setOrderToTrackingMap(trackingMap);
          setTrackingToOrderMap(reverseMap);
        }
      } catch (error) {
        console.error('Failed to fetch tracking items:', error);
      }
    };

    fetchTrackingItems();
  }, [orders, factoryId, refreshTrigger]);

  // Fetch factory batches for tracking items
  useEffect(() => {
    const fetchFactoryBatches = async () => {
      if (!factoryId) return;

      try {
        const response = await factoryService.searchFactoryBatches(
          {
            factory_id: factoryId,
          },
          { page: 0, size: 1000, sort: 'lastModifiedDate,asc' }
        );

        if (response?.data && Array.isArray(response.data)) {
          const batches: Record<string, any> = {};

          response.data.forEach((batch: any) => {
            if (batch.service_item_tracking_id) {
              // Map service_item_tracking_id to batch info
              batches[batch.service_item_tracking_id] = batch;
            }
          });

          setBatchesMap(batches);
        }
      } catch (error) {
        console.error('Failed to fetch factory batches:', error);
      }
    };

    fetchFactoryBatches();
  }, [factoryId, refreshTrigger]);

  // Fetch incidents for tracking items
  useEffect(() => {
    const fetchIncidentsForTrackingItems = async () => {
      const trackingIds = Object.keys(trackingToOrderMap);
      if (trackingIds.length === 0) return;

      try {
        const newIncidentsMap: Record<string, any[]> = {};

        await Promise.all(
          trackingIds.map(async (trackingId) => {
            try {
              const response = await factoryService.searchIncidents(
                {
                  tracking_id: trackingId,
                },
                { page: 0, size: 100 }
              );

              if (response?.data && Array.isArray(response.data)) {
                newIncidentsMap[trackingId] = response.data;
              }
            } catch (error) {
              console.error('Failed to fetch incidents for trackingId', trackingId, error);
            }
          })
        );

        setIncidentsMap(newIncidentsMap);
      } catch (error) {
        console.error('Failed to fetch incidents for tracking items:', error);
      }
    };

    fetchIncidentsForTrackingItems();
  }, [trackingToOrderMap]);

  // Fetch outbound trips and map orders to trips
  const fetchOrdersInTrips = React.useCallback(async () => {
    if (!factoryId || Object.keys(orderToTrackingMap).length === 0) return;

    try {
      // Fetch outbound trips from factory
      const tripsResponse = await logisticService.searchTrips(
        {
          source_store_id: factoryId,
        },
        { page: 0, size: 1000 }
      );

      if (!tripsResponse?.data || tripsResponse.data.length === 0) {
        setOrdersInTrips({});
        return;
      }

      // Map tracking items to trips
      const orderToTripMap: Record<string, { tripId: string; tripCode: string }> = {};

      await Promise.all(
        tripsResponse.data.map(async (trip: any) => {
          try {
            const tripDetails = await logisticService.getTripDetails(trip.id);
            if (tripDetails?.data?.logistic_trip_items) {
              tripDetails.data.logistic_trip_items.forEach((item: any) => {
                if (item.service_item_tracking_id) {
                  // Find order ID from tracking item ID
                  const orderId = trackingToOrderMap[item.service_item_tracking_id];
                  if (orderId) {
                    orderToTripMap[orderId] = {
                      tripId: trip.id,
                      tripCode: trip.trip_code || trip.id,
                    };
                  }
                }
              });
            }
          } catch (error) {
            console.error(`Failed to fetch details for trip ${trip.id}:`, error);
          }
        })
      );

      setOrdersInTrips(orderToTripMap);
    } catch (error) {
      console.error('Failed to fetch orders in trips:', error);
      setOrdersInTrips({});
    }
  }, [factoryId, orderToTrackingMap, trackingToOrderMap]);

  useEffect(() => {
    fetchOrdersInTrips();
  }, [fetchOrdersInTrips]);

  // Filter orders by status for each tab
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!order.order_items || order.order_items.length === 0) return false;

      // console.log("order", order);
      const serviceItems = order.order_items.filter(
        (item: any) => item.product_type === ProductType.SERVICE
      );


      if (serviceItems.length === 0) return false;

      const trackingItemId = orderToTrackingMap[order.id];
      const incidents = trackingItemId ? incidentsMap[trackingItemId] || [] : [];
      const hasPendingIncident = incidents.some(
        (incident: any) => incident.status === IncidentStatus.CREATED
      );
      const batch = trackingItemId ? batchesMap[trackingItemId] : null;
      const hasCancelled = order.status === OrderStatus.CANCELLED;
      const allServiceItemsCompleted = serviceItems.every(
        (item: any) => item.service_status === ServiceOrderItemStatus.COMPLETED
      );
      const hasCompletedBatch = batch?.status === FactoryBatchStatus.COMPLETED;
      const isCompleted = allServiceItemsCompleted || hasCompletedBatch;

      const hasIncidents = incidents.length > 0;
      const needsCustomerConfirmation = order.status === OrderStatus.NEED_CUSTOMER_CONFIRMATION;
      const hasIncidentAndNeedsConfirmation = hasIncidents && needsCustomerConfirmation;
      const isCancelled = order.status === OrderStatus.CANCELLED;
      const hasIssueNote =
        !!order.note &&
        (order.note.toLowerCase().includes('lỗi') ||
          order.note.toLowerCase().includes('thiếu'));
      const isIssue = hasPendingIncident || hasIncidentAndNeedsConfirmation || hasIssueNote;

      // Priority: incidents (pending) -> cancelled -> completed -> others
      // if (hasPendingIncident) {
      //   return activeFilter === 'issue';
      // }

      // if (hasCancelled) {
      //   // Cancelled orders belong to both "Đã hủy" and "Chờ trả" tabs
      //   return activeFilter === 'cancelled';
      // }

      // if (isCompleted) {
      //   // Completed orders belong to both "Hoàn thành" and "Chờ trả" tabs
      //   return activeFilter === 'done';
      // }
      switch (activeFilter) {
        case 'cancelled':
          // Cancelled orders
          return isCancelled;
        case 'todo':
          // Orders currently being processed at factory (merged "Sự cố" here)
          const hasInFactoryStatus = serviceItems.some(
            (item: any) =>
              (item.service_status === ServiceOrderItemStatus.AT_FACTORY) && item.service_status !== ServiceOrderItemStatus.COMPLETED
          );

          const isInFactoryBatch = !!batch && !hasPendingIncident && serviceItems.some((item: any) => item.service_status === ServiceOrderItemStatus.WASHING); // any batch linked to tracking item means it's in factory process
          return !isCompleted && !isCancelled && (hasInFactoryStatus || isInFactoryBatch || isIssue);
        case 'wait':
          return (isCompleted || hasCancelled) && ordersInCurrentFactory.includes(order.id);

        case 'done':
          // Completed orders
          return isCompleted;
        default:
          return false;
      }
    });
  }, [orders, activeFilter, orderToTrackingMap, incidentsMap, batchesMap, ordersInCurrentFactory, ordersInTrips]);

  // Get counts for each tab
  const getTabCounts = useMemo(() => {
    const counts = { todo: 0, wait: 0, done: 0, cancelled: 0 };

    orders.forEach((order) => {
      if (!order.order_items || order.order_items.length === 0) return;

      const serviceItems = order.order_items.filter(
        (item: any) => item.product_type === ProductType.SERVICE
      );
      if (serviceItems.length === 0) return;

      const trackingItemId = orderToTrackingMap[order.id];
      const incidents = trackingItemId ? incidentsMap[trackingItemId] || [] : [];
      const hasPendingIncident = incidents.some(
        (incident: any) => incident.status === IncidentStatus.CREATED
      );
      const batch = trackingItemId ? batchesMap[trackingItemId] : null;
      const hasCancelled = order.status === OrderStatus.CANCELLED;
      const allServiceItemsCompleted = serviceItems.every(
        (item: any) => item.service_status === ServiceOrderItemStatus.COMPLETED
      );
      const hasCompletedBatch = batch?.status === FactoryBatchStatus.COMPLETED;
      const isCompleted = allServiceItemsCompleted || hasCompletedBatch;

      const hasIncidents = incidents.length > 0;
      const needsCustomerConfirmation = order.status === OrderStatus.NEED_CUSTOMER_CONFIRMATION;
      const hasIssueNote =
        !!order.note &&
        (order.note.toLowerCase().includes('lỗi') ||
          order.note.toLowerCase().includes('thiếu'));
      const isIssue = hasPendingIncident || (hasIncidents && needsCustomerConfirmation) || hasIssueNote;

      // 2) Cancelled -> "Đã hủy" + "Chờ trả" (only if in current factory)
      if (hasCancelled) {
        counts.cancelled++;
        if (ordersInCurrentFactory.includes(order.id)) {
          counts.wait++;
        }
        return;
      }

      // 3) Completed -> "Hoàn thành" + "Chờ trả" (only if in current factory)
      if (isCompleted) {
        counts.done++;
        if (ordersInCurrentFactory.includes(order.id)) {
          counts.wait++;
        }
        return;
      }

      // 4) In factory -> "Cần làm"
      const hasInFactoryStatus = serviceItems.some(
        (item: any) =>
          item.service_status === ServiceOrderItemStatus.AT_FACTORY ||
          item.service_status === ServiceOrderItemStatus.WASHING
      );
      const isInFactoryBatch = !!batch;
      if (hasInFactoryStatus || isInFactoryBatch || isIssue) {
        counts.todo++;
        return;
      }
    });

    return counts;
  }, [orders, orderToTrackingMap, incidentsMap, batchesMap, ordersInCurrentFactory]);

  const getOrderStatusInfo = useCallback((order: Order) => {
    if (!order.order_items || order.order_items.length === 0) {
      return { label: 'Chưa xử lý', variant: 'gray' as const, progress: 0 };
    }

    const serviceItems = order.order_items.filter(
      (item: any) => item.product_type === ProductType.SERVICE
    );

    if (serviceItems.length === 0) {
      return { label: 'Chưa xử lý', variant: 'gray' as const, progress: 0 };
    }

    // Get tracking item ID for this order
    const trackingItemId = orderToTrackingMap[order.id];

    // Get batch info from tracking item ID
    const batch = trackingItemId ? batchesMap[trackingItemId] : null;

    // If batch exists, use batch status and machine type
    if (batch) {
      if (batch.status === FactoryBatchStatus.CANCELLED) {
        return { label: 'Đã hủy', variant: 'red' as const, progress: 1 };
      }

      if (batch.status === FactoryBatchStatus.COMPLETED) {
        return { label: 'Hoàn thành', variant: 'green' as const, progress: 1 };
      }

      if (batch.status === FactoryBatchStatus.IN_PROCESS) {
        if (batch.machine_type === FactoryBatchMachineType.WASHER) {
          return { label: 'Đang giặt', variant: 'orange' as const, progress: 0.05 };
        }
        if (batch.machine_type === FactoryBatchMachineType.DRYER) {
          return { label: 'Đang sấy', variant: 'orange' as const, progress: 0.51 };
        }
      }

      // CREATED status
      return { label: 'Đã tạo lô', variant: 'blue' as const, progress: 0.25 };
    }

    // Fallback to service item status if no batch
    const statuses = serviceItems.map((item: any) => item.service_status);
    const primaryStatus = statuses[0];

    switch (primaryStatus) {
      case ServiceOrderItemStatus.PICKING:
        return { label: 'Đang lấy hàng', variant: 'blue' as const, progress: 0.25 };
      case ServiceOrderItemStatus.AT_FACTORY:
        return { label: 'Ở xưởng', variant: 'blue' as const, progress: 0.33 };
      case ServiceOrderItemStatus.WASHING:
        return { label: 'Đang giặt', variant: 'blue' as const, progress: 0.66 };
      case ServiceOrderItemStatus.DELIVERING:
        return { label: 'Chờ trả', variant: 'green' as const, progress: 1 };
      case ServiceOrderItemStatus.RETURNED:
        return { label: 'Đã trả', variant: 'green' as const, progress: 1 };
      case ServiceOrderItemStatus.COMPLETED:
        return { label: 'Hoàn thành', variant: 'green' as const, progress: 1 };
      case ServiceOrderItemStatus.CANCELLED:
        return { label: 'Đã hủy', variant: 'red' as const, progress: 0 };
      default:
        return { label: 'Chưa xử lý', variant: 'gray' as const, progress: 0 };
    }
  }, [orderToTrackingMap, batchesMap]);

  const getOrderTitle = (order: Order) => {
    if (!order.order_items || order.order_items.length === 0) {
      return 'Đơn hàng';
    }

    const serviceItems = order.order_items.filter(
      (item: any) => item.product_type === ProductType.SERVICE
    );

    if (serviceItems.length === 0) {
      return 'Đơn hàng';
    }

    // Get total quantity
    const totalQty = serviceItems.reduce(
      (sum, item: any) => sum + (item.adjusted_quantity || item.quantity || 0),
      0
    );

    // Get first service name or use generic
    const firstService = serviceItems[0];
    const serviceName = firstService?.product_name || 'Dịch vụ giặt ủi';

    if (serviceItems.length === 1) {
      return `${serviceName} ${totalQty}${firstService?.unit || 'kg'}`;
    }

    return `${serviceName} và ${serviceItems.length - 1} dịch vụ khác • ${totalQty} món`;
  };

  const getOrderSubtitle = (order: Order) => {
    const hubName = storeNames[order.hub_id] || order.hub_id || 'Chưa xác định';
    return `Từ: ${hubName}`;
  };

  const renderContent = () => {
    if (filteredOrders.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {activeFilter === 'todo'
              ? 'Không có đơn hàng cần xử lý'
              : activeFilter === 'wait'
                ? 'Không có đơn hàng chờ trả'
                : activeFilter === 'done'
                  ? 'Không có đơn hàng hoàn thành'
                  : 'Không có đơn hàng'}
          </Text>
        </View>
      );
    }

    switch (activeFilter) {
      case 'todo':
        return (
          <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>Đang trên chuyền</Text>
            {filteredOrders.map((order) => {
              const statusInfo = getOrderStatusInfo(order);
              const trackingItemId = orderToTrackingMap[order.id] || order.id;
              const batch = trackingItemId ? batchesMap[trackingItemId] : null;
              const incidents = trackingItemId ? incidentsMap[trackingItemId] || [] : [];
              const hasPendingIncident = incidents.some(
                (incident: any) => incident.status === IncidentStatus.CREATED
              );
              const hasIncidents = incidents.length > 0;
              const needsCustomerConfirmation = order.status === OrderStatus.NEED_CUSTOMER_CONFIRMATION;
              const hasIncidentAndNeedsConfirmation = hasIncidents && needsCustomerConfirmation;
              const hasIssueNote =
                order.note?.toLowerCase().includes('lỗi') ||
                order.note?.toLowerCase().includes('thiếu');
              const isIssue = hasPendingIncident || hasIncidentAndNeedsConfirmation || !!hasIssueNote;

              // Show progress if batch is in process or if status is blue
              const showProgress =
                (batch?.status === FactoryBatchStatus.IN_PROCESS);

              return (
                <View key={order.id} style={styles.orderCardWrapper}>
                  <ItemCard
                    id={`#${order.code} • ${order.shipping_full_name_snapshot || 'N/A'}`}
                    title={getOrderTitle(order)}
                    subtitle={getOrderSubtitle(order)}
                    extraInfo={
                      isIssue
                        ? hasIssueNote
                          ? `📷 ${order.note}`
                          : 'Có sự cố'
                        : undefined
                    }
                    statusLabel={statusInfo.label}
                    statusVariant={statusInfo.variant}
                    icon={isIssue ? 'exclamation-triangle' : 'tshirt'}
                    borderColor={
                      isIssue
                        ? '#ef4444'
                        : statusInfo.variant === 'blue'
                          ? '#3b82f6'
                          : statusInfo.variant === 'orange'
                            ? '#f59e0b'
                            : statusInfo.variant === 'green'
                              ? '#10b981'
                              : statusInfo.variant === 'red'
                                ? '#ef4444'
                                : '#e5e7eb'
                    }
                    iconBg={isIssue ? '#fef2f2' : undefined}
                    iconColor={isIssue ? '#ef4444' : undefined}
                    showProgress={showProgress}
                    progress={statusInfo.progress}
                    onPress={() =>
                      onItemPress(trackingItemId, order.id, isIssue ? 'exception_wait' : 'normal')
                    }
                  />
                </View>
              );
            })}
          </View>
        );

      case 'wait':
        // Group "wait" orders by hub_id (store), then by trip within each hub
        const hubGroups: Record<string, {
          trips: Record<string, { tripId: string; tripCode: string; orders: Order[] }>;
          ordersNotInTrips: Order[];
        }> = {};

        filteredOrders.forEach((order) => {
          const hubId = order.hub_id || 'UNKNOWN';
          if (!hubGroups[hubId]) {
            hubGroups[hubId] = {
              trips: {},
              ordersNotInTrips: [],
            };
          }

          const tripInfo = ordersInTrips[order.id];
          if (tripInfo) {
            const tripKey = tripInfo.tripId;
            if (!hubGroups[hubId].trips[tripKey]) {
              hubGroups[hubId].trips[tripKey] = {
                tripId: tripInfo.tripId,
                tripCode: tripInfo.tripCode,
                orders: [],
              };
            }
            hubGroups[hubId].trips[tripKey].orders.push(order);
          } else {
            hubGroups[hubId].ordersNotInTrips.push(order);
          }
        });
        const hubIds = Object.keys(hubGroups);

        return (
          <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>Đã đóng gói - Chờ xe</Text>
            {hubIds.map((hubId) => {
              const hubData = hubGroups[hubId];
              const isHubExpanded = expandedWaitGroups[hubId] ?? false;
              const hubName = storeNames[hubId] || hubId || 'Chưa xác định';
              const totalOrders = Object.values(hubData.trips).reduce((sum, trip) => sum + trip.orders.length, 0) + hubData.ordersNotInTrips.length;
              const tripKeys = Object.keys(hubData.trips);

              return (
                <View key={hubId} style={styles.waitGroupContainer}>
                  <TouchableOpacity
                    style={styles.waitGroupHeader}
                    activeOpacity={0.8}
                    onPress={() =>
                      setExpandedWaitGroups((prev) => ({
                        ...prev,
                        [hubId]: !isHubExpanded,
                      }))
                    }
                  >
                    <View style={styles.waitGroupHeaderLeft}>
                      <Text style={styles.waitGroupHubName}>{hubName}</Text>
                      <Text style={styles.waitGroupHubCount}>
                        {totalOrders} đơn
                      </Text>
                    </View>
                    <Text style={styles.waitGroupChevron}>
                      {isHubExpanded ? '−' : '+'}
                    </Text>
                  </TouchableOpacity>

                  {isHubExpanded && (
                    <>
                      {/* Trip groups */}
                      {tripKeys.map((tripKey) => {
                        const tripData = hubData.trips[tripKey];
                        const tripGroupKey = `${hubId}_${tripKey}`;
                        const isTripExpanded = expandedTripGroups[tripGroupKey] ?? false;

                        return (
                          <View key={tripKey} style={styles.tripGroupContainer}>
                            <TouchableOpacity
                              style={styles.tripGroupHeader}
                              activeOpacity={0.8}
                              onPress={() =>
                                setExpandedTripGroups((prev) => ({
                                  ...prev,
                                  [tripGroupKey]: !isTripExpanded,
                                }))
                              }
                            >
                              <View style={styles.tripGroupHeaderLeft}>
                                <Text style={styles.tripGroupTripCode}>
                                  Chuyến: {tripData.tripCode}
                                </Text>
                                <Text style={styles.tripGroupCount}>
                                  {tripData.orders.length} đơn
                                </Text>
                              </View>
                              <Text style={styles.tripGroupChevron}>
                                {isTripExpanded ? '−' : '+'}
                              </Text>
                            </TouchableOpacity>

                            {isTripExpanded &&
                              tripData.orders.map((order) => {
                                const trackingItemId =
                                  orderToTrackingMap[order.id] || order.id;

                                return (
                                  <View
                                    key={order.id}
                                    style={styles.waitOrderRow}
                                  >

                                    <View style={[styles.orderCardWrapper, { flex: 1, marginBottom: 0 }]}>
                                      <ItemCard
                                        id={`#${order.code} • ${order.shipping_full_name_snapshot || 'N/A'
                                          }`}
                                        title={getOrderTitle(order)}
                                        subtitle={getOrderSubtitle(order)}
                                        statusLabel="Đã tạo chuyến"
                                        statusVariant="green"
                                        icon="shopping-bag"
                                        borderColor="#10b981"
                                        onPress={() =>
                                          onItemPress(trackingItemId, order.id, 'normal')
                                        }
                                      />
                                    </View>
                                  </View>
                                );
                              })}
                          </View>
                        );
                      })}

                      {/* Orders not in trips */}
                      {hubData.ordersNotInTrips.map((order) => {
                        const trackingItemId =
                          orderToTrackingMap[order.id] || order.id;
                        const isChecked = !!selectedWaitOrders[order.id];

                        return (
                          <View
                            key={order.id}
                            style={styles.waitOrderRow}
                          >
                            <TouchableOpacity
                              style={[
                                styles.waitCheckbox,
                                isChecked && styles.waitCheckboxChecked,
                              ]}
                              activeOpacity={1}
                              onPress={() => {
                                // Check if we're trying to select from a different hub
                                if (!isChecked) {
                                  const currentlySelectedIds = Object.keys(selectedWaitOrders).filter(
                                    (id) => selectedWaitOrders[id]
                                  );

                                  if (currentlySelectedIds.length > 0) {
                                    // Get hub_id of currently selected orders
                                    const selectedHubs = new Set(
                                      currentlySelectedIds
                                        .map((id) => orders.find((o) => o.id === id)?.hub_id)
                                        .filter(Boolean)
                                    );

                                    // Check if this order's hub is different
                                    if (selectedHubs.size > 0 && order.hub_id && !selectedHubs.has(order.hub_id)) {
                                      Alert.alert(
                                        'Không thể chọn',
                                        'Không thể chọn đơn hàng từ nhiều tiệm khác nhau cùng lúc.'
                                      );
                                      return;
                                    }
                                  }
                                }

                                setSelectedWaitOrders((prev) => ({
                                  ...prev,
                                  [order.id]: !prev[order.id],
                                }));
                              }}
                            >
                              {isChecked && (
                                <Text style={styles.waitCheckboxLabel}>✓</Text>
                              )}
                            </TouchableOpacity>
                            <View style={[styles.orderCardWrapper, { flex: 1, marginBottom: 0 }]}>
                              <ItemCard
                                id={`#${order.code} • ${order.shipping_full_name_snapshot || 'N/A'
                                  }`}
                                title={getOrderTitle(order)}
                                subtitle={getOrderSubtitle(order)}
                                statusLabel="Chờ trả"
                                statusVariant="green"
                                icon="shopping-bag"
                                borderColor="#10b981"
                                onPress={() =>
                                  onItemPress(trackingItemId, order.id, 'normal')
                                }
                              />
                            </View>
                          </View>
                        );
                      })}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        );

      case 'done':
        return (
          <View style={styles.listContainer}>
            <Text style={styles.sectionTitle}>Đã hoàn thành</Text>
            {filteredOrders.map((order) => {
              const statusInfo = getOrderStatusInfo(order);
              const trackingItemId = orderToTrackingMap[order.id] || order.id;
              const batch = trackingItemId ? batchesMap[trackingItemId] : null;

              // Show progress bar with completed state
              const showProgress = true;

              return (
                <View key={order.id} style={styles.orderCardWrapper}>
                  <ItemCard
                    id={`#${order.code} • ${order.shipping_full_name_snapshot || 'N/A'}`}
                    title={getOrderTitle(order)}
                    subtitle={getOrderSubtitle(order)}
                    statusLabel={statusInfo.label}
                    statusVariant={statusInfo.variant}
                    icon="tshirt"
                    borderColor={
                      statusInfo.variant === 'blue'
                        ? '#3b82f6'
                        : statusInfo.variant === 'green'
                          ? '#10b981'
                          : statusInfo.variant === 'red'
                            ? '#ef4444'
                            : '#e5e7eb'
                    }
                    showProgress={showProgress}
                    progress={statusInfo.progress}
                    onPress={() => onItemPress(trackingItemId, order.id, 'normal')}
                  />
                </View>
              );
            })}
          </View>
        );

      case 'cancelled':
        return (
          <View style={styles.listContainer}>
            <Text style={[styles.sectionTitle, { color: '#ef4444' }]}>Đã hủy</Text>
            {filteredOrders.map((order) => {
              const statusInfo = getOrderStatusInfo(order);
              const trackingItemId = orderToTrackingMap[order.id] || order.id;

              return (
                <View key={order.id} style={styles.orderCardWrapper}>
                  <ItemCard
                    id={`#${order.code} • ${order.shipping_full_name_snapshot || 'N/A'}`}
                    title={getOrderTitle(order)}
                    subtitle={getOrderSubtitle(order)}
                    statusLabel={statusInfo.label}
                    statusVariant="red"
                    icon="times-circle"
                    borderColor="#ef4444"
                    iconBg="#fef2f2"
                    iconColor="#ef4444"
                    onPress={() => onItemPress(trackingItemId, order.id, 'normal')}
                  />
                </View>
              );
            })}
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* <SearchBarWithScan
          placeholder="Quét hoặc nhập mã món đồ..."
          onScanPress={onScanPress}
        /> */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <FilterButton
            label={`Cần làm (${getTabCounts.todo})`}
            active={activeFilter === 'todo'}
            onPress={() => setActiveFilter('todo')}
          />
          <View style={{ width: 8 }} />
          <FilterButton
            label={`Hoàn thành (${getTabCounts.done})`}
            active={activeFilter === 'done'}
            onPress={() => setActiveFilter('done')}
          />
          <View style={{ width: 8 }} />
          <FilterButton
            label={`Đã hủy (${getTabCounts.cancelled})`}
            active={activeFilter === 'cancelled'}
            onPress={() => setActiveFilter('cancelled')}
          />
          <View style={{ width: 8 }} />
          <FilterButton
            label={`Chờ trả (${getTabCounts.wait})`}
            active={activeFilter === 'wait'}
            onPress={() => setActiveFilter('wait')}
          />
        </ScrollView>
      </View>

      {/* <View style={styles.headerDivider} /> */}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom
          ) {
            if (onLoadMore && hasMore && !loadingMore) {
              onLoadMore();
            }
          }
        }}
        scrollEventThrottle={400}
      >
        {renderContent()}
        {loadingMore && (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={styles.loadingMoreText}>Đang tải thêm...</Text>
          </View>
        )}
      </ScrollView>

      {activeFilter === 'wait' &&
        Object.values(selectedWaitOrders).some((v) => v) && (
          <TouchableOpacity
            style={[
              styles.transportButton,
              isCreatingTrip && styles.transportButtonDisabled,
            ]}
            activeOpacity={0.8}
            disabled={isCreatingTrip}
            onPress={async () => {
              try {
                if (!factoryId) {
                  Alert.alert('Lỗi', 'Không tìm thấy thông tin xưởng.');
                  return;
                }

                const selectedIds = Object.keys(selectedWaitOrders).filter(
                  (id) => selectedWaitOrders[id]
                );

                if (selectedIds.length === 0) return;

                const selectedOrders = orders.filter((o) =>
                  selectedIds.includes(o.id)
                );

                // Validate all selected orders have the same hub_id
                const hubIds = Array.from(
                  new Set(
                    selectedOrders
                      .map((o) => o.hub_id)
                      .filter(Boolean) as string[]
                  )
                );

                if (hubIds.length === 0) {
                  Alert.alert('Lỗi', 'Không tìm thấy thông tin tiệm cho các đơn đã chọn.');
                  return;
                }

                if (hubIds.length > 1) {
                  Alert.alert(
                    'Không thể tạo chuyến',
                    'Các đơn hàng được chọn phải thuộc cùng một tiệm.'
                  );
                  return;
                }

                const destinationHubId = hubIds[0];

                // Build logistic_trip_items using tracking IDs
                const logistic_trip_items = selectedIds
                  .map((orderId) => {
                    const trackingId = orderToTrackingMap[orderId];
                    if (!trackingId) return null;
                    return {
                      type: LogisticTripItemType.BIN_OUTBOUND,
                      service_item_tracking_id: trackingId,
                    };
                  })
                  .filter(Boolean) as {
                    type: LogisticTripItemType;
                    service_item_tracking_id: string;
                  }[];

                if (logistic_trip_items.length === 0) {
                  Alert.alert(
                    'Lỗi',
                    'Không tìm thấy mã tracking cho các đơn đã chọn.'
                  );
                  return;
                }

                setIsCreatingTrip(true);

                await logisticService.createTrips({
                  source_store_id: factoryId,
                  destination_store_id: destinationHubId,
                  logistic_trip_items,
                });

                // Refresh trips data to update UI
                await fetchOrdersInTrips();

                // Refresh orders if callback is provided
                if (onRefresh) {
                  onRefresh();
                }

                Alert.alert(
                  'Thành công',
                  'Đã tạo chuyến vận chuyển thành công.'
                );

                // Clear selections
                setSelectedWaitOrders({});
              } catch (error: any) {
                console.error('Failed to create trip:', error);
                Alert.alert(
                  'Lỗi',
                  error?.message || 'Không thể tạo chuyến vận chuyển. Vui lòng thử lại.'
                );
              } finally {
                setIsCreatingTrip(false);
              }
            }}
          >
            <Text style={styles.transportButtonText}>
              {isCreatingTrip ? 'Đang tạo chuyến...' : 'Vận chuyển'}
            </Text>
          </TouchableOpacity>
        )}

      {/* Loading overlay to block input when searching orders */}
      <Modal
        transparent
        visible={loading}
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  content: {
    flex: 1,
    // backgroundColor: '#FCFCFC',
  },
  contentInner: {
    padding: 16,
    paddingBottom: 120,
  },
  listContainer: {
    gap: 5,
  },
  orderCardWrapper: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  waitCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waitCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  waitIconContainer: {
    backgroundColor: '#D1FAE5',
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitIconText: {
    color: '#059669',
    fontWeight: 'bold',
  },
  waitTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  waitSubtitle: {
    fontSize: 10,
    color: '#6B7280',
  },
  waitCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
  },
  waitGroupContainer: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  waitGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
  },
  waitGroupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waitGroupHubName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  waitGroupTripCode: {
    fontSize: 11,
    fontWeight: '500',
    color: '#3b82f6',
    marginLeft: 4,
  },
  waitGroupHubCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  waitGroupChevron: {
    fontSize: 18,
    color: '#6B7280',
    marginRight: 4,
  },
  waitOrderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  waitCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  waitCheckboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  waitCheckboxLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  tripGroupContainer: {
    marginLeft: 12,
    marginRight: 12,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
    overflow: 'hidden',
  },
  tripGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#DBEAFE',
  },
  tripGroupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripGroupTripCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  tripGroupCount: {
    fontSize: 11,
    color: '#3B82F6',
  },
  tripGroupChevron: {
    fontSize: 16,
    color: '#3B82F6',
    marginRight: 4,
  },
  transportButton: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#2563EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  transportButtonDisabled: {
    opacity: 0.6,
  },
  transportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  doneCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    opacity: 0.75,
  },
  doneId: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontSize: 12,
    color: '#4B5563',
  },
  doneSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  doneBadge: {
    fontSize: 9,
    backgroundColor: '#E5E7EB',
    color: '#4B5563',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
});
