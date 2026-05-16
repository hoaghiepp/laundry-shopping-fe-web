import { PromotionBanner } from "@/components/home/PromotionBanner";
import {
    BatchGroupCard,
    FactorySelectionDialog,
    FloatingActionButtons,
    OrderTab,
    OrderTabs,
    areAllServicesDone,
    isOnlyGoodsOrder,
    mapOrderStatusToTab,
    mapOrderToCardData
} from "@/components/orders";
import { OrderCardData, OrderCardStore } from "@/components/store/OrderCard";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import {
    GoodsOrderItemStatus,
    IncidentStatus,
    LogisticTripItemType,
    OrderStatus,
    ProductType,
    ServiceOrderItemStatus,
    StoreType,
} from "@/constants/enum";
import {
  storeMainContentMarginBottom,
  storeMainContentPaddingTop,
} from "@/constants/storeWebLayout";
import { compatAlert } from "@/lib/compatAlert";
import {
    CreateTripsRequest,
    LogisticsTripItem,
    logisticService,
} from "@/services/api/logisticService";
import { Order, orderService } from "@/services/api/orderService";
import { StoreListItem, storeService } from "@/services/api/storeService";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

/** CUSTOMER_REJECTED with no SERVICE line items behaves like CANCELLED (no return flow). */
function orderHasServiceItems(order: Order): boolean {
  const serviceItems =
    order.order_items?.filter(
      (item: any) => item.product_type === ProductType.SERVICE
    ) || [];
  return serviceItems.length > 0;
}

interface OrdersScreenProps {
  storeId?: string;
  onOrderPress: (order: Order) => void;
  onQRScan: () => void;
  onCreateBatchShipment?: (orderIds: string[]) => void;
  promotions?: any[];
  onPromotionPress?: () => void;
  refreshKey?: number; // Key to trigger refresh when changed
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({
  storeId,
  onOrderPress,
  onQRScan,
  onCreateBatchShipment,
  promotions = [],
  onPromotionPress,
  refreshKey,
}) => {
  const PAGE_SIZE = 20;
  const [activeTab, setActiveTab] = useState<OrderTab>("new");
  const [searchText, setSearchText] = useState("");
  const [orders, setOrders] = useState<OrderCardData[]>([]);
  const [orderMap, setOrderMap] = useState<Map<string, Order>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [groupedOrders, setGroupedOrders] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [batches, setBatches] = useState<Map<string, string[]>>(new Map()); // barcode -> order codes
  const [batchTrackingItemIds, setBatchTrackingItemIds] = useState<
    Map<string, string[]>
  >(new Map()); // barcode -> tracking item IDs (item_tracking_id)
  const [trackingItemsMap, setTrackingItemsMap] = useState<Map<string, any>>(
    new Map()
  ); // order_id -> tracking item (to get service_item_tracking_id)
  const [trackingItemsCache, setTrackingItemsCache] = useState<any[] | null>(
    null
  ); // Cache tracking items to avoid duplicate API calls
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(
    new Set()
  ); // selected batch barcodes
  const [showFactoryDialog, setShowFactoryDialog] = useState(false);
  const [factories, setFactories] = useState<StoreListItem[]>([]);
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | null>(
    null
  );
  const [tabCounts, setTabCounts] = useState({
    new: 0,
    processing: 0,
    waiting_transport: 0,
    waiting_return: 0,
    finished: 0,
    cancelled: 0,
  });
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  const tabCacheRef = React.useRef<Map<OrderTab, OrderCardData[]>>(new Map());
  const tabPageRef = React.useRef<Map<OrderTab, number>>(new Map());
  const tabHasMoreRef = React.useRef<Map<OrderTab, boolean>>(new Map());
  const loadMoreLockRef = React.useRef(false);

  const mergeIntoCache = (
    tab: OrderTab,
    pageItems: OrderCardData[],
    page: number
  ) => {
    const prev = tabCacheRef.current.get(tab) || [];

    if (page === 0) {
      // Refresh: apply server page first (add/update), keep extra pages already loaded below.
      const incomingIds = new Set(pageItems.map((x) => x.id));
      const tail = prev.filter((x) => !incomingIds.has(x.id));
      const merged = [...pageItems, ...tail];
      tabCacheRef.current.set(tab, merged);
      return merged;
    }

    // Append behavior (dedupe): keep existing order, append new unique items at the end.
    const existingIds = new Set(prev.map((x) => x.id));
    const appended = [...prev, ...pageItems.filter((x) => !existingIds.has(x.id))];
    tabCacheRef.current.set(tab, appended);
    return appended;
  };

  // Fetch tracking items (shared function to avoid duplicate calls)
  const fetchTrackingItems = async (forceRefresh = false): Promise<any[]> => {
    if (!forceRefresh && trackingItemsCache) {
      return trackingItemsCache;
    }
    const trackingResponse = await logisticService.searchTrackingItems(
      {
        current_store_id: storeId!,
      },
      { page: 0, size: 1000 }
    );
    const trackingItems = trackingResponse.data || [];
    setTrackingItemsCache(trackingItems);
    return trackingItems;
  };

  // Fetch batches that are already in trips
  const fetchBatchesInTrips = async (trackingItemsForMapping?: any[]): Promise<Set<string>> => {
    if (!storeId) return new Set();

    try {
      // Fetch all trips from this store (paginate)
      const trips: any[] = [];
      const pageSize = 200;
      let page = 0;
      while (true) {
        const tripsResponse = await logisticService.searchTrips(
          {
            source_store_id: storeId,
          },
          { page, size: pageSize }
        );

        const pageData: any[] = tripsResponse?.data || [];
        if (pageData.length === 0) break;
        trips.push(...pageData);

        if (pageData.length < pageSize) break;
        page += 1;
      }

      if (trips.length === 0) {
        return new Set();
      }

      // Get all tracking item IDs from trips
      const trackingItemIdsInTrips = new Set<string>();
      for (const trip of trips) {
        try {
          const tripDetails = await logisticService.getTripDetails(trip.id);
          if (tripDetails?.data?.logistic_trip_items) {
            tripDetails.data.logistic_trip_items.forEach((item: any) => {
              if (item.service_item_tracking_id) {
                trackingItemIdsInTrips.add(item.service_item_tracking_id);
              }
            });
          }
        } catch (error) {
          console.error(`Failed to fetch details for trip ${trip.id}:`, error);
          // Continue with other trips
        }
      }

      // Map tracking item IDs to barcodes using provided tracking items or cache
      const barcodesInTrips = new Set<string>();
      const itemsToUse = trackingItemsForMapping || trackingItemsCache;
      if (itemsToUse && Array.isArray(itemsToUse)) {
        itemsToUse.forEach((item: any) => {
          if (trackingItemIdsInTrips.has(item.id) && item.barcode) {
            barcodesInTrips.add(item.barcode);
          }
        });
      }

      return barcodesInTrips;
    } catch (error) {
      console.error("Failed to fetch batches in trips:", error);
      return new Set();
    }
  };

  // Fetch tracking items and group by batch for waiting_transport tab
  const fetchTrackingItemsForBatch = async (useCache = false) => {
    if (!storeId) return;

    try {
      const wtCached = tabCacheRef.current.get("waiting_transport")?.length ?? 0;
      if (wtCached === 0) setLoading(true);

      // Use cached tracking items if available and requested, otherwise fetch
      const trackingItems = await fetchTrackingItems(!useCache);
      // Fetch batches that are already in trips (pass tracking items directly)
      const barcodesInTrips = await fetchBatchesInTrips(trackingItems);

      // Group tracking items by barcode (batch)
      const batchMap = new Map<string, string[]>(); // barcode -> order codes (only batches NOT in trips)
      const allBatchesMap = new Map<string, string[]>(); // barcode -> order codes (ALL batches including those in trips)
      const batchTrackingIdsMap = new Map<string, string[]>(); // barcode -> tracking item IDs
      const orderIdToCodeMap = new Map<string, string>(); // order_id -> order_code

      // First, fetch orders with PROCESSING status to map order_id to order_code
      const ordersResponse = await orderService.searchStoreOrders(
        {
          hub_id: storeId,
          status: OrderStatus.PROCESSING,
          fetch_order_items: true,
        },
        { page: 0, size: 1000 }
      );

      // Create order_id to order_code mapping
      console.log('ordersResponse.data', ordersResponse.data);
      ordersResponse.data.filter((order) => !order.factory_id || order.factory_id === "").forEach((order) => {
        orderIdToCodeMap.set(order.id, order.code);
      });

      // Store tracking items map and group by barcode
      const newTrackingItemsMap = new Map<string, any>();
      if (trackingItems && Array.isArray(trackingItems)) {
        trackingItems.forEach((item: any) => {
          const barcode = item.barcode;
          const orderId = item.order_id;
          const trackingItemId = item.id; // This is the item_tracking_id
          const orderCode = orderIdToCodeMap.get(orderId);

          // Store tracking item by order_id for later use
          if (orderId && trackingItemId) {
            newTrackingItemsMap.set(orderId, item);
          }

          if (barcode && orderCode && trackingItemId) {
            // Build all batches map (including those in trips) to track order codes
            if (!allBatchesMap.has(barcode)) {
              allBatchesMap.set(barcode, []);
            }
            const allOrderCodes = allBatchesMap.get(barcode)!;
            if (!allOrderCodes.includes(orderCode)) {
              allOrderCodes.push(orderCode);
            }

            // Only add to batchMap if batch is NOT in trips
            if (!barcodesInTrips.has(barcode)) {
              // Group order codes by barcode
              if (!batchMap.has(barcode)) {
                batchMap.set(barcode, []);
              }
              const orderCodes = batchMap.get(barcode)!;
              if (!orderCodes.includes(orderCode)) {
                orderCodes.push(orderCode);
              }

              // Group tracking item IDs by barcode
              if (!batchTrackingIdsMap.has(barcode)) {
                batchTrackingIdsMap.set(barcode, []);
              }
              const trackingIds = batchTrackingIdsMap.get(barcode)!;
              if (!trackingIds.includes(trackingItemId)) {
                trackingIds.push(trackingItemId);
              }
            }
          }
        });
      }
      setTrackingItemsMap(newTrackingItemsMap);
      setBatchTrackingItemIds(batchTrackingIdsMap);
      setBatches(batchMap);

      // Get all order codes from batches NOT in trips (for display)
      const allOrderCodesInBatches = Array.from(batchMap.values()).flat();
      const uniqueOrderCodesInBatches = Array.from(
        new Set(allOrderCodesInBatches)
      );

      // Get all order codes from batches that ARE in trips (to exclude them)
      const orderCodesInTripsBatches = new Set<string>();
      barcodesInTrips.forEach((barcode) => {
        const orderCodes = allBatchesMap.get(barcode) || [];
        orderCodes.forEach((code) => orderCodesInTripsBatches.add(code));
      });

      // Filter orders: get orders with services (waiting_transport) that are NOT in batches
      // Only include PROCESSING status orders
      // Exclude orders that are delivering (have order_items with PICKING status)
      // Exclude orders that are in batches already in trips
      // Exclude orders with factory_id (they belong in factory tab)
      // Note: Goods-only orders with CREATED items go to waiting_return, not waiting_transport
      const ordersNotInBatches = ordersResponse.data.filter((order) => {
        if (order.status !== OrderStatus.PROCESSING) return false;
        if (isOnlyGoodsOrder(order)) return false; // Must have services for waiting_transport
        if (order.factory_id && order.factory_id !== "") return false; // Exclude orders with factory_id
        if (uniqueOrderCodesInBatches.includes(order.code)) return false; // Not in any batch (that's not in trips)
        if (orderCodesInTripsBatches.has(order.code)) return false; // Not in batches that are in trips

        // Check if order is delivering (has order_items with PICKING status) or at factory (AT_FACTORY status)
        const hasPickingItems = order.order_items?.some(
          (item: any) => item.service_status === ServiceOrderItemStatus.PICKING
        );
        if (hasPickingItems) return false; // Exclude delivering orders

        // Check if order has items at factory (AT_FACTORY status)
        const hasAtFactoryItems = order.order_items?.some(
          (item: any) =>
            item.service_status === ServiceOrderItemStatus.AT_FACTORY ||
            item.status === ServiceOrderItemStatus.AT_FACTORY
        );
        if (hasAtFactoryItems) return false; // Exclude orders at factory (they belong in factory tab)

        // For orders with services, include them
        return true;
      });

      // Also include orders that are in batches (for batch display)
      // Only include PROCESSING status orders
      // Only include orders with services (goods-only orders with CREATED items go to waiting_return)
      // Exclude orders that are delivering (have order_items with PICKING status)
      // Exclude orders with factory_id (they belong in factory tab)
      const ordersInBatches = ordersResponse.data.filter((order) => {
        if (order.status !== OrderStatus.PROCESSING) return false;
        if (isOnlyGoodsOrder(order)) return false; // Must have services for waiting_transport
        if (order.factory_id && order.factory_id !== "") return false; // Exclude orders with factory_id
        if (!uniqueOrderCodesInBatches.includes(order.code)) return false;

        // Check if order is delivering (has order_items with PICKING status) or at factory (AT_FACTORY status)
        const hasPickingItems = order.order_items?.some(
          (item: any) => item.status === ServiceOrderItemStatus.PICKING
        );
        if (hasPickingItems) return false; // Exclude delivering orders

        // Check if order has items at factory (AT_FACTORY status)
        const hasAtFactoryItems = order.order_items?.some(
          (item: any) =>
            item.service_status === ServiceOrderItemStatus.AT_FACTORY ||
            item.status === ServiceOrderItemStatus.AT_FACTORY
        );
        if (hasAtFactoryItems) return false; // Exclude orders at factory (they belong in factory tab)

        // For orders with services, include them
        return true;
      });

      // Combine all orders for the waiting_transport tab
      const allFilteredOrders = [...ordersInBatches, ...ordersNotInBatches];

      // Map orders with waiting_transport status
      const cardDataList = allFilteredOrders
        .map((order) =>
          mapOrderToCardData(order, onOrderPress, "waiting_transport")
        )
        .filter((card): card is OrderCardData => card !== null);

      // Store order objects in a map for easy lookup
      setOrderMap((prev) => {
        const merged = new Map(prev);
        allFilteredOrders.forEach((order) => merged.set(order.code, order));
        return merged;
      });

      const mergedCards = mergeIntoCache("waiting_transport", cardDataList, 0);
      setOrders(mergedCards);
    } catch (error) {
      console.error("Failed to fetch tracking items:", error);
      setOrders((prev) => prev);
      setBatches(new Map());
      setBatchTrackingItemIds(new Map());
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders for a specific tab
  const fetchOrdersForTab = async (tab: OrderTab, page = 0) => {
    if (!storeId) return;

    // For waiting_transport tab, use tracking items (don't use cache here, fetch fresh)
    if (tab === "waiting_transport") {
      await fetchTrackingItemsForBatch(false);
      return;
    }

    try {
      if (page === 0) {
        const cachedLen = tabCacheRef.current.get(tab)?.length ?? 0;
        if (cachedLen === 0) setLoading(true);
      } else setLoadingMore(true);

      // For waiting_return tab, fetch PROCESSING, CANCELLED, CUSTOMER_REJECTED, CUSTOMER_INCIDENTS_REJECTED
      if (tab === "waiting_return") {
        const [
          processingResponse,
          // cancelledResponse,
          customerRejectedResponse,
          customerIncidentsRejectedResponse,
        ] = await Promise.all([
          orderService.searchStoreOrders(
            {
              hub_id: storeId,
              status: OrderStatus.PROCESSING,
              fetch_order_items: true,
            },
            { page, size: PAGE_SIZE }
          ),
          // orderService.searchStoreOrders(
          //   {
          //     hub_id: storeId,
          //     status: OrderStatus.CANCELLED,
          //     fetch_order_items: true,
          //   },
          //   { page, size: PAGE_SIZE }
          // ),
          orderService.searchStoreOrders(
            {
              hub_id: storeId,
              status: OrderStatus.CUSTOMER_REJECTED,
              fetch_order_items: true,
            },
            { page, size: PAGE_SIZE }
          ),
          orderService.searchStoreOrders(
            {
              hub_id: storeId,
              status: OrderStatus.CUSTOMER_INCIDENTS_REJECTED,
              fetch_order_items: true,
            },
            { page, size: PAGE_SIZE }
          ),
        ]);

        console.log("Processing response:", processingResponse.data);
        console.log("Customer Rejected response:", customerRejectedResponse.data);

        // Filter PROCESSING orders: 
        // 1. Orders with services where ALL service items must be DELIVERING
        // 2. Orders with only goods that have CREATED status items
        // 3. Orders with is_split_shipment = true (show in waiting_return)
        const processingOrders = processingResponse.data.filter((order) => {
          // Check if split shipment order
          if (order.is_split_shipment) {
            return true; // Include all split shipment orders
          }

          // Check if goods-only order with CREATED items
          if (isOnlyGoodsOrder(order)) {
            const hasCreatedGoodsItems = order.order_items?.some(
              (item: any) => item.goods_status === GoodsOrderItemStatus.CREATED
            );
            return hasCreatedGoodsItems;
          }

          // For orders with services: ALL service items must be DELIVERING
          const serviceItems =
            order.order_items?.filter(
              (item: any) => item.product_type === ProductType.SERVICE
            ) || [];

          return (
            serviceItems.length > 0 &&
            serviceItems.every(
              (item: any) =>
                item.service_status === ServiceOrderItemStatus.DELIVERING
            )
          );
        });

        // Filter CANCELLED orders: must have service items
        // We'll filter by tracking items later, but first filter by service items
        const customerRejectedOrders = customerIncidentsRejectedResponse.data.filter((order) => {
          const serviceItems =
            order.order_items?.filter(
              (item: any) => item.product_type === ProductType.SERVICE
            ) || [];

          return serviceItems.length > 0;
        });

        // Filter CUSTOMER_REJECTED: only orders with services need waiting_return (returns flow)
        // const customerRejectedOrders = customerRejectedResponse.data.filter((order) =>
        //   orderHasServiceItems(order)
        // );

        // CUSTOMER_INCIDENTS_REJECTED: always goes to waiting_return (not cancelled)
        const customerIncidentsRejectedOrders =
          customerIncidentsRejectedResponse.data.filter((order) => true);

        // Combine all (before tracking filter)
        let filteredOrders = [
          ...processingOrders,
          // ...cancelledOrdersWithServices,
          ...customerRejectedOrders,
          ...customerIncidentsRejectedOrders,
        ];

        // Filter out orders where tracking items are at a different store
        // For CANCELLED orders: only include if they have tracking items at current store
        try {
          // Get all order IDs from filtered orders
          const orderIds = filteredOrders.map((order) => order.id);

          if (orderIds.length > 0) {
            // Fetch tracking items for all orders
            const trackingItemsByOrderId = new Map<string, any[]>();

            // Search tracking items for each order_id
            for (const orderId of orderIds) {
              try {
                const trackingResponse = await logisticService.searchTrackingItems(
                  {
                    order_id: orderId,
                  },
                  { page: 0, size: 1000 }
                );

                if (trackingResponse?.data && Array.isArray(trackingResponse.data)) {
                  trackingItemsByOrderId.set(orderId, trackingResponse.data);
                }
              } catch (error) {
                console.error(`Failed to fetch tracking items for order ${orderId}:`, error);
                // Continue with other orders
              }
            }

            // Filter orders based on tracking items
            filteredOrders = filteredOrders.filter((order) => {
              const trackingItems = trackingItemsByOrderId.get(order.id);

              // For CANCELLED orders: only include if they have tracking items at current store
              if (order.status === OrderStatus.CANCELLED) {
                if (!trackingItems || trackingItems.length === 0) {
                  return false; // Exclude CANCELLED orders without tracking items
                }
                // Check if any tracking item has current_store_id == storeId
                const hasTrackingItemsAtCurrentStore = trackingItems.some(
                  (item: any) => item.current_store_id && item.current_store_id === storeId
                );
                return hasTrackingItemsAtCurrentStore;
              }

              // CUSTOMER_INCIDENTS_REJECTED: show in waiting_return only if service tracking is at current store
              if (order.status === OrderStatus.CUSTOMER_INCIDENTS_REJECTED) {
                if (!trackingItems || trackingItems.length === 0) {
                  return false;
                }
                return trackingItems.some(
                  (item: any) =>
                    item.current_store_id && item.current_store_id === storeId
                );
              }

              // For other orders: exclude if tracking items are at a different store
              if (!trackingItems || trackingItems.length === 0) {
                return true; // Include orders without tracking items (non-CANCELLED)
              }

              // Check if any tracking item has current_store_id != storeId
              const hasTrackingItemsAtOtherStore = trackingItems.some(
                (item: any) => item.current_store_id && item.current_store_id !== storeId
              );

              // Exclude orders that have tracking items at a different store
              return !hasTrackingItemsAtOtherStore;
            });
          }
        } catch (error) {
          console.error("Failed to filter orders by tracking items:", error);
          // Continue with original filtered orders if error occurs
        }

        // Map orders with waiting_return status (cancelled and customer_rejected orders get special status)
        const cardDataList = filteredOrders
          .map((order) => {
            // Use special status for cancelled and customer_rejected orders in waiting_return tab
            const statusOverride =
              order.status === OrderStatus.CANCELLED
                ? "cancelled_waiting_return"
                : order.status === OrderStatus.CUSTOMER_REJECTED
                  ? "customer_rejected_waiting_return"
                  : "waiting_return";

            // For split shipment orders: show only goods if not all services are done
            // Show full order if all services are done
            const filterGoodsOnly =
              order.is_split_shipment &&
              !areAllServicesDone(order);

            return mapOrderToCardData(order, onOrderPress, statusOverride, filterGoodsOnly);
          })
          .filter((card): card is OrderCardData => card !== null);

        // Store order objects in a map for easy lookup
        const newOrderMap = new Map<string, Order>();
        filteredOrders.forEach((order) => {
          newOrderMap.set(order.code, order);
        });
        // Merge into existing orderMap (pagination)
        setOrderMap((prev) => {
          const merged = new Map(prev);
          filteredOrders.forEach((order) => merged.set(order.code, order));
          return merged;
        });

        const mergedOrders = mergeIntoCache(tab, cardDataList, page);
        setOrders(mergedOrders);
        setBatches(new Map());
        setBatchTrackingItemIds(new Map());
        tabPageRef.current.set(tab, page);
        tabHasMoreRef.current.set(tab, cardDataList.length >= PAGE_SIZE);
        return;
      }

      // Map tab to OrderStatus for other tabs
      let statusFilter: OrderStatus | undefined;
      switch (tab) {
        case "new":
          // Fetch multiple statuses for "new" tab
          statusFilter = OrderStatus.CREATED; // Will filter in code
          break;
        case "processing":
          statusFilter = OrderStatus.PROCESSING;
          // Note: We'll filter out waiting_transport orders below
          break;
        case "finished":
          statusFilter = OrderStatus.FINISHED;
          break;
        case "cancelled":
          // For cancelled tab, we need to fetch both CANCELLED and CUSTOMER_REJECTED orders
          // But we'll handle the filtering separately since we need to check service items for CUSTOMER_REJECTED
          statusFilter = OrderStatus.CANCELLED;
          break;
      }

      const response = await orderService.searchStoreOrders(
        {
          hub_id: storeId,
          status: statusFilter,
          fetch_order_items: true,
          fetch_incidents: true,
        },
        { page, size: PAGE_SIZE, sort: "createdDate,desc" }
      );

      // Filter and map orders
      let filteredOrders = response.data;

      if (tab === "new") {
        // For "new" tab, include CREATED, CONFIRMED, AT_HUB
        filteredOrders = response.data.filter((order) => true);
      } else if (tab === "processing") {
        // "processing" now includes:
        // - Normal processing (goods-only, excluding waiting_transport)
        // - Orders at factory (factory_id present) - keep status text "factory"
        // - Orders waiting customer confirmation - keep status text "wait_confirm"
        const [needConfirmResponse] = await Promise.all([
          orderService.searchStoreOrders(
            {
              hub_id: storeId,
              status: OrderStatus.NEED_CUSTOMER_CONFIRMATION,
              fetch_order_items: true,
              fetch_incidents: true,
            },
            { page, size: PAGE_SIZE, sort: "createdDate,desc" }
          ),
        ]);

        const [cancelledOrdersResponse] = await Promise.all([
          orderService.searchStoreOrders(
            {
              hub_id: storeId,
              status: OrderStatus.CANCELLED,
              fetch_order_items: true,
              fetch_incidents: true,
            },
            { page, size: PAGE_SIZE, sort: "createdDate,desc" }
          ),
        ]);

        const processingOrders = response.data || [];
        const needConfirmOrders = needConfirmResponse.data || [];

        // CANCELLED orders:
        // - if tracking item is already at this store -> show in "chờ trả" (waiting_return) only
        // - if tracking item still at factory -> keep visible in processing (factory section)
        const cancelledOrdersWithFactory = (cancelledOrdersResponse.data || []).filter(
          (order: any) => !!order?.factory_id && order.factory_id !== ""
        );
        const cancelledOrdersInFactory: any[] = [];
        if (cancelledOrdersWithFactory.length > 0) {
          await Promise.all(
            cancelledOrdersWithFactory.map(async (order: any) => {
              try {
                const trackingResponse = await logisticService.searchTrackingItems(
                  { order_id: order.id },
                  { page: 0, size: 1000 }
                );
                const trackingItems = Array.isArray(trackingResponse?.data)
                  ? trackingResponse.data
                  : [];

                const isAtStore = trackingItems.some(
                  (item: any) =>
                    item?.current_store_id && item.current_store_id === storeId
                );
                if (isAtStore) return;

                const isAtFactory = trackingItems.some(
                  (item: any) =>
                    item?.current_store_id &&
                    item.current_store_id === order.factory_id
                );
                if (isAtFactory) cancelledOrdersInFactory.push(order);
              } catch (error) {
                console.error(
                  `Failed to fetch tracking items for cancelled order ${order?.id}:`,
                  error
                );
              }
            })
          );
        }
        const normalProcessingOrders = processingOrders.filter((order) => {
          if (order.factory_id && order.factory_id !== "") return false;
          if (!isOnlyGoodsOrder(order)) return false;

          const hasCreatedGoodsItems = order.order_items?.some(
            (item: any) => item.goods_status === GoodsOrderItemStatus.CREATED
          );
          return !hasCreatedGoodsItems;
        });

        let factoryOrders = processingOrders.filter(
          (order) => !!order.factory_id && order.factory_id !== ""
        );

        // if (factoryOrders.length > 0) {
        //   const factoryIds = Array.from(
        //     new Set(
        //       factoryOrders
        //         .map((order) => order.factory_id)
        //         .filter((id) => id && id !== "")
        //     )
        //   );

        //   const trackingItemsByFactoryId = new Map<string, any[]>();
        //   try {
        //     const trackingPromises = factoryIds.map((factoryId) =>
        //       logisticService
        //         .searchTrackingItems(
        //           {
        //             current_store_id: factoryId,
        //           },
        //           { page: 0, size: 1000 }
        //         )
        //         .then((response) => ({ factoryId, response }))
        //         .catch((error) => {
        //           console.error(
        //             `Failed to fetch tracking items for factory ${factoryId}:`,
        //             error
        //           );
        //           return { factoryId, response: null };
        //         })
        //     );

        //     const results = await Promise.all(trackingPromises);
        //     results.forEach(({ factoryId, response }) => {
        //       if (response?.data && Array.isArray(response.data)) {
        //         trackingItemsByFactoryId.set(factoryId, response.data);
        //       }
        //     });
        //   } catch (error) {
        //     console.error(
        //       "Failed to fetch tracking items for factory in processing tab:",
        //       error
        //     );
        //   }

        //   factoryOrders = factoryOrders.filter((order) => {
        //     const trackingItems = trackingItemsByFactoryId.get(order.factory_id);
        //     if (!trackingItems || trackingItems.length === 0) return false;
        //     return trackingItems.some((item: any) => item.order_id === order.id);
        //   });
        // }

        filteredOrders = [
          ...needConfirmOrders,
          ...normalProcessingOrders,
          ...factoryOrders,
          ...cancelledOrdersInFactory,
        ].sort((a: any, b: any) => {
          const aHasIssue =
            Array.isArray(a?.incidents) &&
            a.incidents.some((i: any) => i?.status === IncidentStatus.CREATED);
          const bHasIssue =
            Array.isArray(b?.incidents) &&
            b.incidents.some((i: any) => i?.status === IncidentStatus.CREATED);
          if (aHasIssue !== bHasIssue) return aHasIssue ? -1 : 1;

          const aTime = a?.createdDate ? new Date(a.createdDate).getTime() : 0;
          const bTime = b?.createdDate ? new Date(b.createdDate).getTime() : 0;
          return bTime - aTime;
        });
      } else if (tab === "cancelled") {
        console.log("Cancelled orders:", response.data);
        // For "cancelled" tab, show orders with CANCELLED status
        // Also fetch and include CUSTOMER_REJECTED orders with service items
        const cancelledOrders = response.data.filter((order) => true);

        // Fetch CUSTOMER_REJECTED orders
        try {
          const customerRejectedResponse = await orderService.searchStoreOrders(
            {
              hub_id: storeId,
              status: OrderStatus.CUSTOMER_REJECTED,
              fetch_order_items: true,
            },
            { page, size: PAGE_SIZE, sort: "createdDate,desc" }
          );

          // Filter CUSTOMER_REJECTED orders: must have service items
          const customerRejectedOrders = customerRejectedResponse.data.filter((order) => {
            const serviceItems =
              order.order_items?.filter(
                (item: any) => item.product_type === ProductType.SERVICE
              ) || [];
            return serviceItems.length === 0;
          });

          filteredOrders = [...cancelledOrders, ...customerRejectedOrders];

          // Filter CANCELLED orders: only include if they have tracking items at current store
          try {
            const cancelledOrderIds = cancelledOrders.map((order) => order.id);
            const trackingItemsByOrderId = new Map<string, any[]>();

            // Fetch tracking items for CANCELLED orders
            for (const orderId of cancelledOrderIds) {
              try {
                const trackingResponse = await logisticService.searchTrackingItems(
                  {
                    order_id: orderId,
                  },
                  { page: 0, size: 1000 }
                );

                if (trackingResponse?.data && Array.isArray(trackingResponse.data)) {
                  trackingItemsByOrderId.set(orderId, trackingResponse.data);
                }
              } catch (error) {
                console.error(`Failed to fetch tracking items for order ${orderId}:`, error);
              }
            }

            // Filter CANCELLED orders: only include if they have tracking items at current store
            const filteredCancelledOrders = cancelledOrders.filter((order) => {
              const trackingItems = trackingItemsByOrderId.get(order.id);
              if (!trackingItems || trackingItems.length === 0) {
                return false; // Exclude CANCELLED orders without tracking items
              }
              // Check if any tracking item has current_store_id == storeId
              const hasTrackingItemsAtCurrentStore = trackingItems.some(
                (item: any) => item.current_store_id && item.current_store_id === storeId
              );
              return hasTrackingItemsAtCurrentStore;
            });

            filteredOrders = [...filteredCancelledOrders, ...customerRejectedOrders];
          } catch (error) {
            console.error("Failed to filter CANCELLED orders by tracking items:", error);
            // Continue with original filtered orders if error occurs
          }
        } catch (error) {
          console.error("Failed to fetch CUSTOMER_REJECTED orders for cancelled tab:", error);
          // For CANCELLED orders only, filter by tracking items
          try {
            const cancelledOrderIds = cancelledOrders.map((order) => order.id);
            const trackingItemsByOrderId = new Map<string, any[]>();

            // Fetch tracking items for CANCELLED orders
            for (const orderId of cancelledOrderIds) {
              try {
                const trackingResponse = await logisticService.searchTrackingItems(
                  {
                    order_id: orderId,
                  },
                  { page: 0, size: 1000 }
                );

                if (trackingResponse?.data && Array.isArray(trackingResponse.data)) {
                  trackingItemsByOrderId.set(orderId, trackingResponse.data);
                }
              } catch (error) {
                console.error(`Failed to fetch tracking items for order ${orderId}:`, error);
              }
            }

            // Filter CANCELLED orders: only include if they have tracking items at current store
            filteredOrders = cancelledOrders.filter((order) => {
              const trackingItems = trackingItemsByOrderId.get(order.id);
              if (!trackingItems || trackingItems.length === 0) {
                return false; // Exclude CANCELLED orders without tracking items
              }
              // Check if any tracking item has current_store_id == storeId
              const hasTrackingItemsAtCurrentStore = trackingItems.some(
                (item: any) => item.current_store_id && item.current_store_id === storeId
              );
              return hasTrackingItemsAtCurrentStore;
            });
          } catch (error) {
            console.error("Failed to filter CANCELLED orders by tracking items:", error);
            filteredOrders = cancelledOrders;
          }
        }
      }

      // Map orders with override status for specific tabs
      const cardDataList = filteredOrders
        .map((order) => {
          if (tab === "processing") {
            if (order.status === OrderStatus.NEED_CUSTOMER_CONFIRMATION) {
              return mapOrderToCardData(order, onOrderPress, "wait_confirm");
            }
            if (order.factory_id && order.factory_id !== "") {
              return mapOrderToCardData(order, onOrderPress, "factory");
            }
            return mapOrderToCardData(order, onOrderPress);
          } else if (tab === "finished") {
            return mapOrderToCardData(order, onOrderPress, "finished");
          } else if (tab === "cancelled") {
            return mapOrderToCardData(order, onOrderPress, "cancelled");
          }
          return mapOrderToCardData(order, onOrderPress);
        })
        .filter((card): card is OrderCardData => card !== null);

      setOrderMap((prev) => {
        const merged = new Map(prev);
        filteredOrders.forEach((order) => merged.set(order.code, order));
        return merged;
      });

      const mergedOrders = mergeIntoCache(tab, cardDataList, page);
      setOrders(mergedOrders);
      setBatches(new Map()); // Clear batches for other tabs
      setBatchTrackingItemIds(new Map()); // Clear batch tracking item IDs for other tabs
      tabPageRef.current.set(tab, page);
      tabHasMoreRef.current.set(tab, cardDataList.length >= PAGE_SIZE);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      if (page === 0) {
        tabPageRef.current.delete(tab);
        tabHasMoreRef.current.delete(tab);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      loadMoreLockRef.current = false;
    }
  };

  // Fetch all orders to get counts
  const fetchAllOrdersCounts = async () => {
    if (!storeId) return;

    try {
      const counts = {
        new: 0,
        processing: 0,
        waiting_transport: 0,
        waiting_return: 0,
        finished: 0,
        cancelled: 0,
      };

      // For waiting_transport, we need to count orders that match the same filtering logic
      // as fetchTrackingItemsForBatch: PROCESSING orders with services, not delivering, not in trips
      try {
        // Fetch tracking items to get batches info (this will populate the cache)
        const trackingItems = await fetchTrackingItems(false);

        // Fetch batches that are already in trips (pass tracking items directly to avoid cache timing issues)
        const barcodesInTrips = await fetchBatchesInTrips(trackingItems);

        // Group tracking items by barcode to identify orders in batches
        const batchMap = new Map<string, string[]>(); // barcode -> order IDs
        const allBatchesMap = new Map<string, string[]>(); // barcode -> order IDs (all batches)
        const orderIdToCodeMap = new Map<string, string>(); // order_id -> order_code

        // First, fetch PROCESSING orders to map order_id to order_code
        const processingOrdersResponse = await orderService.searchStoreOrders(
          {
            hub_id: storeId,
            status: OrderStatus.PROCESSING,
            fetch_order_items: true,
          },
          { page: 0, size: 1000 }
        );

        processingOrdersResponse.data.forEach((order) => {
          orderIdToCodeMap.set(order.id, order.code);
        });

        // Group tracking items by barcode
        if (trackingItems && Array.isArray(trackingItems)) {
          trackingItems.forEach((item: any) => {
            const barcode = item.barcode;
            const orderId = item.order_id;
            const orderCode = orderIdToCodeMap.get(orderId);

            if (barcode && orderCode) {
              // Build all batches map (including those in trips)
              if (!allBatchesMap.has(barcode)) {
                allBatchesMap.set(barcode, []);
              }
              const allOrderCodes = allBatchesMap.get(barcode)!;
              if (!allOrderCodes.includes(orderCode)) {
                allOrderCodes.push(orderCode);
              }

              // Only add to batchMap if batch is NOT in trips
              if (!barcodesInTrips.has(barcode)) {
                if (!batchMap.has(barcode)) {
                  batchMap.set(barcode, []);
                }
                const orderCodes = batchMap.get(barcode)!;
                if (!orderCodes.includes(orderCode)) {
                  orderCodes.push(orderCode);
                }
              }
            }
          });
        }

        // Get all order codes from batches NOT in trips
        const allOrderCodesInBatches = Array.from(batchMap.values()).flat();
        const uniqueOrderCodesInBatches = Array.from(new Set(allOrderCodesInBatches));

        // Get all order codes from batches that ARE in trips (to exclude them)
        const orderCodesInTripsBatches = new Set<string>();
        barcodesInTrips.forEach((barcode) => {
          const orderCodes = allBatchesMap.get(barcode) || [];
          orderCodes.forEach((code) => orderCodesInTripsBatches.add(code));
        });

        // Count waiting_transport orders using the same filtering logic as fetchTrackingItemsForBatch
        // Only include orders with services (goods-only orders with CREATED items go to waiting_return)
        // Exclude orders with factory_id (they belong in factory tab)
        const waitingTransportOrders = processingOrdersResponse.data.filter((order) => {
          if (order.status !== OrderStatus.PROCESSING) return false;
          if (isOnlyGoodsOrder(order)) return false; // Must have services for waiting_transport
          if (order.factory_id && order.factory_id !== "") return false; // Exclude orders with factory_id
          if (orderCodesInTripsBatches.has(order.code)) return false; // Not in batches that are in trips

          // Check if order is delivering (has order_items with PICKING, DELIVERING, or WASHING status) or order is at factory
          const hasPickingOrDeliveringOrWashingOrAtFactoryItems = order.order_items?.some(
            (item: any) =>
              item.service_status === ServiceOrderItemStatus.PICKING ||
              item.service_status === ServiceOrderItemStatus.DELIVERING ||
              item.service_status === ServiceOrderItemStatus.WASHING
          ) || order.order_items?.some(
            (item: any) => item.service_status === ServiceOrderItemStatus.AT_FACTORY
          );
          if (hasPickingOrDeliveringOrWashingOrAtFactoryItems) return false; // Exclude delivering/washing orders

          // For orders with services, include them
          return true;
        });

        counts.waiting_transport = waitingTransportOrders.length;
      } catch (error) {
        console.error("Failed to fetch tracking items for count:", error);
      }

      // Fetch with order_items to properly determine product types for other tabs
      const response = await orderService.searchStoreOrders(
        {
          hub_id: storeId,
          fetch_order_items: true, // Need items to check if order has services
        },
        { page: 0, size: 1000 }
      );

      // Fetch tracking items for CANCELLED orders to check if they're at current store
      const cancelledOrderIds = response.data
        .filter((order) => order.status === OrderStatus.CANCELLED)
        .map((order) => order.id);
      const trackingItemsByOrderId = new Map<string, any[]>();

      if (cancelledOrderIds.length > 0) {
        try {
          for (const orderId of cancelledOrderIds) {
            try {
              const trackingResponse = await logisticService.searchTrackingItems(
                {
                  order_id: orderId,
                },
                { page: 0, size: 1000 }
              );

              if (trackingResponse?.data && Array.isArray(trackingResponse.data)) {
                trackingItemsByOrderId.set(orderId, trackingResponse.data);
              }
            } catch (error) {
              console.error(`Failed to fetch tracking items for order ${orderId}:`, error);
            }
          }
        } catch (error) {
          console.error("Failed to fetch tracking items for CANCELLED orders:", error);
        }
      }

      response.data.forEach((order) => {
        // Check if order has service items
        const serviceItems =
          order.order_items?.filter(
            (item: any) => item.product_type === ProductType.SERVICE
          ) || [];
        const hasServiceItems = serviceItems.length > 0;

        // Check if order has factory_id (for factory tab counting)
        const hasFactoryId = order.factory_id && order.factory_id !== "";

        // Skip if order is in factory tab (orders with factory_id should only be counted in factory tab)
        const isInFactory = hasFactoryId;

        // Skip if order is in waiting_transport (already counted above)
        // Check if order should be in waiting_transport (only orders with services, not goods-only)
        const isInWaitingTransport = (() => {
          if (order.status !== OrderStatus.PROCESSING) return false;
          // Exclude orders with factory_id (they belong in factory tab)
          if (isInFactory) return false;
          if (isOnlyGoodsOrder(order)) return false; // Goods-only orders don't go to waiting_transport

          // Check if order is delivering (has order_items with PICKING or DELIVERING status) or at factory
          const hasPickingOrDeliveringOrAtFactoryItems = order.order_items?.some(
            (item: any) =>
              item.service_status === ServiceOrderItemStatus.PICKING ||
              item.service_status === ServiceOrderItemStatus.DELIVERING ||
              item.service_status === ServiceOrderItemStatus.WASHING
          ) || order.order_items?.some(
            (item: any) =>
              item.service_status === ServiceOrderItemStatus.AT_FACTORY
          );
          if (hasPickingOrDeliveringOrAtFactoryItems) return false;

          // For orders with services, include them
          return true;
        })();

        // Check if order is in waiting_return tab
        // CUSTOMER_INCIDENTS_REJECTED OR
        // CANCELLED orders with service items OR 
        // CUSTOMER_REJECTED with service items OR
        // PROCESSING orders with all service items DELIVERING OR
        // PROCESSING orders with only goods that have CREATED status items OR
        // PROCESSING orders with is_split_shipment = true
        const isWaitingReturn = (() => {
          // Exclude orders with factory_id (they belong in factory tab)
          if (isInFactory) return false;
          if (order.status === OrderStatus.CUSTOMER_INCIDENTS_REJECTED) {
            return true;
          }
          if (order.status === OrderStatus.CUSTOMER_REJECTED && hasServiceItems) {
            return true;
          }
          if (order.status === OrderStatus.PROCESSING) {
            // Goods-only orders with CREATED items go to waiting_return
            if (isOnlyGoodsOrder(order)) {
              const hasCreatedGoodsItems = order.order_items?.some(
                (item: any) => item.goods_status === GoodsOrderItemStatus.CREATED
              );
              return hasCreatedGoodsItems;
            }
            // Orders with services: all service items must be DELIVERING
            return (
              hasServiceItems &&
              serviceItems.every(
                (item: any) =>
                  item.service_status === ServiceOrderItemStatus.DELIVERING
              )
            );
          }
          return false;
        })();


        // Check if order is cancelled or customer rejected
        if (order.status === OrderStatus.CANCELLED) {
          counts.cancelled++;
          // Only count CANCELLED orders if they have tracking items at current store
          const trackingItems = trackingItemsByOrderId.get(order.id);
          const hasTrackingItemsAtCurrentStore = trackingItems && trackingItems.length > 0 && trackingItems.some(
            (item: any) => item.current_store_id && item.current_store_id === storeId
          );

          if (hasTrackingItemsAtCurrentStore) {
            // Also count cancelled orders with service items in waiting_return (if not in factory)
            if (hasServiceItems && !isInFactory) {
              counts.waiting_return++;
            }
          }
        } else if (order.status === OrderStatus.CUSTOMER_INCIDENTS_REJECTED) {
          const trackingItems = trackingItemsByOrderId.get(order.id);
          const hasTrackingItemsAtCurrentStore =
            trackingItems &&
            trackingItems.length > 0 &&
            trackingItems.some(
              (item: any) =>
                item.current_store_id && item.current_store_id === storeId
            );
          if (hasTrackingItemsAtCurrentStore) {
            counts.waiting_return++;
          }
        } else if (order.status === OrderStatus.CUSTOMER_REJECTED) {
          // CUSTOMER_REJECTED orders go to waiting_return (if not in factory)
          if (hasServiceItems && !isInFactory) {
            counts.waiting_return++;
          }
          if (!hasServiceItems) {
            counts.cancelled++;
          }
        } else if (order.status === OrderStatus.FINISHED) {
          counts.finished++;
        } else if (isWaitingReturn) {
          counts.waiting_return++;
        } else if (order.status === OrderStatus.PROCESSING) {
          // For PROCESSING orders, check if they should be in processing tab
          // Only count if NOT in waiting_transport AND NOT in waiting_return AND NOT at factory
          // Only count goods-only orders that don't have CREATED status items
          // (goods-only orders with CREATED items are in waiting_return)
          if (!isInWaitingTransport && !isWaitingReturn) {
            if (isOnlyGoodsOrder(order)) {
              const hasCreatedGoodsItems = order.order_items?.some(
                (item: any) => item.goods_status === GoodsOrderItemStatus.CREATED
              );
              // Only count if it doesn't have CREATED items
              if (!hasCreatedGoodsItems) {
                counts.processing++;
              }
            }

            if (isInFactory) {
              counts.processing++;
            }
            // Note: Orders with services that are PROCESSING but not in waiting_transport
            // (i.e., they are delivering - have PICKING status items) should NOT be in processing tab
            // They should be in waiting_return or other tabs, so we don't count them here
          }
          // If isInWaitingTransport is true, the order is already counted in waiting_transport above
          // If isWaitingReturn is true, the order is already counted in waiting_return above
        } else {
          // For other statuses (CREATED, NEED_CUSTOMER_CONFIRMATION, etc.), use the standard mapping
          const tabStatus = mapOrderStatusToTab(order.status, order);
          if (tabStatus === "new") counts.new++;
          else if (tabStatus === "processing") counts.processing++;
          // Don't count factory here as it's already counted above for PROCESSING orders
          // Don't count waiting_transport here as it's already counted above
        }
      });

      setTabCounts(counts);
    } catch (error) {
      console.error("Failed to fetch order counts:", error);
    }
  };

  useEffect(() => {
    if (storeId) {
      // Clear cache when storeId changes
      setTrackingItemsCache(null);
      tabCacheRef.current.clear();
      tabPageRef.current.clear();
      tabHasMoreRef.current.clear();
      loadMoreLockRef.current = false;
      setOrders([]);

      // If on waiting_transport tab, fetch tracking items once and use for both counts and orders
      if (activeTab === "waiting_transport") {
        fetchTrackingItems(false).then(() => {
          fetchAllOrdersCounts();
          fetchTrackingItemsForBatch(true);
        });
      } else {
        fetchAllOrdersCounts();
        fetchOrdersForTab(activeTab, 0);
      }
    }
  }, [storeId]);

  useEffect(() => {
    if (storeId) {
      // When switching tabs, show cache first (if any), then fetch only if needed
      if (activeTab === "waiting_transport") {
        fetchTrackingItemsForBatch(false);
      } else {
        const cached = tabCacheRef.current.get(activeTab);
        if (cached && cached.length > 0) {
          setOrders(cached);
        } else {
          fetchOrdersForTab(activeTab, 0);
        }
      }
      // Clear selection when switching tabs
      setSelectedOrders(new Set());
      setSelectedBatches(new Set());
    }
  }, [activeTab]);

  // Refresh when refreshKey changes (e.g., when closing process detail) — merge into list, no cache wipe
  useEffect(() => {
    if (storeId && refreshKey !== undefined && refreshKey > 0) {
      if (activeTab === "waiting_transport") {
        setTrackingItemsCache(null);
      }
      tabPageRef.current.set(activeTab, 0);
      tabHasMoreRef.current.set(activeTab, true);

      // Refresh orders and counts
      if (activeTab === "waiting_transport") {
        fetchTrackingItems(true).then(() => {
          fetchAllOrdersCounts();
          fetchTrackingItemsForBatch(true);
        });
      } else {
        fetchAllOrdersCounts();
        fetchOrdersForTab(activeTab, 0);
      }
    }
  }, [refreshKey]);

  const handleOrderSelect = (orderId: string, selected: boolean) => {
    setSelectedOrders((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  const isOrderSelected = (orderId: string) => {
    // Orders in batches cannot be selected individually
    if (activeTab === "waiting_transport" && batches.size > 0) {
      const isInBatch = Array.from(batches.values()).some((codes) =>
        codes.includes(orderId)
      );
      if (isInBatch) return false;
    }
    return selectedOrders.has(orderId);
  };

  const isBatchSelected = (barcode: string) => {
    return selectedBatches.has(barcode);
  };

  // Get count of selected orders excluding batch orders
  const getSelectedOrdersCount = () => {
    if (activeTab !== "waiting_transport" || batches.size === 0) {
      return selectedOrders.size;
    }
    // Exclude orders that are in batches
    const allBatchOrderCodes = Array.from(batches.values()).flat();
    return Array.from(selectedOrders).filter(
      (code) => !allBatchOrderCodes.includes(code)
    ).length;
  };

  const handleCreateBatchShipment = async () => {
    if (selectedOrders.size === 0) return;

    setIsCreatingBatch(true);

    try {
      // Convert order codes to order IDs (UUIDs)
      const orderIds = Array.from(selectedOrders)
        .map((orderCode) => {
          const order = orderMap.get(orderCode);
          return order?.id || orderCode; // Fallback to code if order not found
        })
        .filter((id) => id); // Remove any undefined values

      if (onCreateBatchShipment && orderIds.length > 0) {
        await onCreateBatchShipment(orderIds);

        // Refresh the UI to show the newly created batch
        if (activeTab === "waiting_transport") {
          // Force refresh to fetch fresh data
          await fetchTrackingItemsForBatch(false);
          await fetchAllOrdersCounts();
        }

        // Clear selections
        setSelectedOrders(new Set());

        // Hide loading screen to show updated UI
        setIsCreatingBatch(false);
      } else {
        setIsCreatingBatch(false);
      }
    } catch (error) {
      console.error("Error creating batch shipment:", error);
      setIsCreatingBatch(false);
      // Error is already handled in parent, just log here
    }
  };

  const handleGroupToggle = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handlePrintOrderCode = (orderId: string) => {
    compatAlert("In mã đơn", `In mã đơn cho đơn hàng: ${orderId}`);
    // TODO: Implement print functionality
  };

  const handleGroupCheckbox = (groupId: string, checked: boolean) => {
    // Toggle all orders in the group
    const groupOrderIds = Array.from(groupedOrders);
    if (checked) {
      setSelectedOrders((prev) => {
        const newSet = new Set(prev);
        groupOrderIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    } else {
      setSelectedOrders((prev) => {
        const newSet = new Set(prev);
        groupOrderIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    }
  };

  const handleConfirmGroupShipment = () => {
    const orderIds = Array.from(groupedOrders);
    if (onCreateBatchShipment) {
      onCreateBatchShipment(orderIds);
      setGroupedOrders(new Set());
    }
  };

  // Check if any batch is selected
  const hasSelectedBatch = () => {
    if (activeTab !== "waiting_transport" || batches.size === 0) return false;
    return selectedBatches.size > 0;
  };

  // Fetch factories for dialog
  const fetchFactories = async () => {
    try {
      const response = await storeService.searchStore(
        { deleted: false, type: StoreType.FACTORY },
        { page: 0, size: 100 }
      );
      if (response?.data) {
        setFactories(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch factories:", error);
      compatAlert("Lỗi", "Không thể tải danh sách nhà máy");
    }
  };

  // Build createTrips body
  const buildCreateTripsBody = (): CreateTripsRequest | null => {
    if (!storeId || !selectedFactoryId || selectedBatches.size === 0) {
      return null;
    }

    // Get all tracking item IDs from selected batches
    const logisticTripItems: LogisticsTripItem[] = [];
    Array.from(selectedBatches).forEach((barcode) => {
      const trackingItemIds = batchTrackingItemIds.get(barcode) || [];
      trackingItemIds.forEach((trackingItemId) => {
        logisticTripItems.push({
          type: LogisticTripItemType.BIN_OUTBOUND,
          service_item_tracking_id: trackingItemId, // Use the actual tracking item ID
        });
      });
    });

    if (logisticTripItems.length === 0) {
      return null;
    }

    return {
      source_store_id: storeId,
      destination_store_id: selectedFactoryId,
      logistic_trip_items: logisticTripItems,
    };
  };

  // Handle batch shipment (for selected batches)
  const handleBatchShipment = async () => {
    if (selectedBatches.size === 0) {
      console.log("No batches selected");
      return;
    }

    console.log("Opening factory dialog for", selectedBatches.size, "batches");
    setSelectedFactoryId(null);
    await fetchFactories();
    setShowFactoryDialog(true);
  };

  // Handle confirm shipment with factory
  const handleConfirmBatchShipment = async () => {
    if (!selectedFactoryId) {
      compatAlert("Thông báo", "Vui lòng chọn nhà máy");
      return;
    }

    const tripBody = buildCreateTripsBody();
    if (!tripBody) {
      compatAlert("Lỗi", "Không thể tạo body cho chuyến vận chuyển");
      return;
    }

    setIsCreatingTrip(true);
    setShowFactoryDialog(false);

    console.log("CreateTrips Body:", tripBody);
    try {
      const response = await logisticService.createTrips(tripBody);
      // console.log("CreateTrips Response:", response);

      // Refresh the UI to remove batches that were sent in trips
      if (activeTab === "waiting_transport") {
        // Force refresh to fetch fresh data
        await fetchTrackingItemsForBatch(false);
        await fetchAllOrdersCounts();
      }

      // Clear selections
      setSelectedBatches(new Set());
      setSelectedFactoryId(null);

      // Hide loading screen before showing alert so user can see the updated UI
      setIsCreatingTrip(false);

      // Small delay to ensure UI renders before showing alert
      setTimeout(() => {
        compatAlert("Thành công", "Đã tạo chuyến vận chuyển");
      }, 100);
    } catch (error) {
      console.error("Failed to create trips:", error);
      setIsCreatingTrip(false);
      setSelectedBatches(new Set());
      setSelectedFactoryId(null);
      compatAlert("Lỗi", "Không thể tạo chuyến vận chuyển");
    }
  };

  const handleCancelBatchShipment = () => {
    setShowFactoryDialog(false);
    setSelectedFactoryId(null);
  };

  const handleTabChange = (tab: OrderTab) => {
    setActiveTab(tab);
  };

  const handleRefresh = async () => {
    if (!storeId) return;
    setRefreshing(true);

    tabPageRef.current.set(activeTab, 0);
    tabHasMoreRef.current.set(activeTab, true);

    await fetchAllOrdersCounts();
    await fetchOrdersForTab(activeTab, 0);
  };

  const loadMore = async () => {
    if (!storeId) return;
    if (activeTab === "waiting_transport") return;
    if (loading || loadingMore || refreshing) return;
    if (loadMoreLockRef.current) return;

    const hasMore = tabHasMoreRef.current.get(activeTab);
    if (hasMore === false) return;

    const currentPage = tabPageRef.current.get(activeTab) || 0;
    const nextPage = currentPage + 1;

    loadMoreLockRef.current = true;
    await fetchOrdersForTab(activeTab, nextPage);
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } =
      event?.nativeEvent || {};
    if (!layoutMeasurement || !contentOffset || !contentSize) return;

    const paddingToBottom = 120;
    const isNearBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    if (isNearBottom) {
      loadMore();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchSection}>
        {/* <OrderSearchBar
          searchText={searchText}
          onSearchChange={setSearchText}
          onQRScan={onQRScan}
        /> */}
        <OrderTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabCounts={tabCounts}
        />
      </View>

      <ScrollView
        style={styles.ordersList}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.ordersContent}>
          {promotions && promotions.length > 0 && (
            <View style={styles.promotionBannerContainer}>
              <PromotionBanner
                promotions={promotions}
                onPromotionPress={(id) => {
                  if (onPromotionPress) {
                    onPromotionPress();
                  }
                }}
                onSeeAllPress={() => {
                  if (onPromotionPress) {
                    onPromotionPress();
                  }
                }}
              />
            </View>
          )}
          {loading && orders.length > 0 && (
            <View style={styles.inlineRefreshRow}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.inlineRefreshText}>Đang cập nhật danh sách...</Text>
            </View>
          )}
          {loading && orders.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
            </View>
          ) : orders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="inbox" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Không có đơn hàng nào</Text>
            </View>
          ) : (
            <>
              {/* Batch Groups for waiting_transport tab */}
              {activeTab === "waiting_transport" && batches.size > 0 && (
                <>
                  {Array.from(batches.entries()).map(
                    ([barcode, orderCodes]) => (
                      <BatchGroupCard
                        key={barcode}
                        barcode={barcode}
                        orderCodes={orderCodes}
                        orders={orders}
                        orderMap={orderMap}
                        isSelected={isBatchSelected(barcode)}
                        isExpanded={expandedGroups.has(barcode)}
                        onSelect={(selected) => {
                          if (selected) {
                            setSelectedBatches((prev) => {
                              const newSet = new Set(prev);
                              newSet.add(barcode);
                              return newSet;
                            });
                          } else {
                            setSelectedBatches((prev) => {
                              const newSet = new Set(prev);
                              newSet.delete(barcode);
                              return newSet;
                            });
                          }
                        }}
                        onToggleExpand={() => handleGroupToggle(barcode)}
                        onOrderPress={onOrderPress}
                        onPrintOrderCode={handlePrintOrderCode}
                      />
                    )
                  )}
                </>
              )}

              {/* Grouped Orders Card (for manual grouping) */}
              {groupedOrders.size > 0 && (
                <View style={styles.groupCard}>
                  <View style={styles.groupCardHeader}>
                    <TouchableOpacity
                      style={styles.groupCheckbox}
                      onPress={() => {
                        const isAllSelected = Array.from(groupedOrders).every(
                          (id) => isOrderSelected(id)
                        );
                        handleGroupCheckbox("batch", !isAllSelected);
                      }}
                      activeOpacity={1}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          Array.from(groupedOrders).every((id) =>
                            isOrderSelected(id)
                          ) && styles.checkboxSelected,
                        ]}
                      >
                        {Array.from(groupedOrders).every((id) =>
                          isOrderSelected(id)
                        ) && (
                            <FontAwesome5
                              name="check"
                              size={10}
                              color="#FFFFFF"
                            />
                          )}
                      </View>
                    </TouchableOpacity>
                    <View style={styles.groupCardHeaderContent}>
                      <Text style={styles.groupCardTitle}>
                        Lô vận chuyển ({groupedOrders.size} đơn)
                      </Text>
                      <Text style={styles.groupCardSubtitle}>
                        {Array.from(groupedOrders)
                          .map((id) => id)
                          .join(", ")}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.printButton}
                      onPress={() => {
                        Array.from(groupedOrders).forEach((id) =>
                          handlePrintOrderCode(id)
                        );
                      }}
                      activeOpacity={1}
                    >
                      <FontAwesome5 name="print" size={14} color="#2563EB" />
                      <Text style={styles.printButtonText}>In mã đơn</Text>
                    </TouchableOpacity>
                  </View>
                  {groupedOrders.size > 0 && (
                    <TouchableOpacity
                      style={styles.expandButton}
                      onPress={() => handleGroupToggle("batch")}
                      activeOpacity={1}
                    >
                      <Text style={styles.expandButtonText}>
                        {expandedGroups.has("batch") ? "Thu gọn" : "Mở rộng"} (
                        {groupedOrders.size})
                      </Text>
                      <FontAwesome5
                        name={
                          expandedGroups.has("batch")
                            ? "chevron-up"
                            : "chevron-down"
                        }
                        size={12}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  )}
                  {expandedGroups.has("batch") && (
                    <View style={styles.groupedOrdersContainer}>
                      {Array.from(groupedOrders).map((orderId) => {
                        const orderCard = orders.find((o) => o.id === orderId);
                        const order = orderMap.get(orderId);

                        if (!orderCard) return null;

                        return (
                          <View key={orderId} style={styles.shrunkOrderCard}>
                            <OrderCardStore
                              order={orderCard}
                              onPress={() => order && onOrderPress(order)}
                              isSelected={isOrderSelected(orderId)}
                              onSelect={(selected) =>
                                handleOrderSelect(orderId, selected)
                              }
                              expandable
                            />
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Regular Orders (only show if not in batches for waiting_transport tab) */}
              {orders
                .filter((orderCard) => {
                  // For waiting_transport tab, hide orders that are in batches
                  if (activeTab === "waiting_transport") {
                    const isInBatch = Array.from(batches.values()).some(
                      (codes) => codes.includes(orderCard.id)
                    );
                    return !isInBatch && !groupedOrders.has(orderCard.id);
                  }
                  return !groupedOrders.has(orderCard.id);
                })
                .map((orderCard) => {
                  const order = orderMap.get(orderCard.id);
                  const isWaitingTransportTab =
                    activeTab === "waiting_transport";
                  const showSelection = isWaitingTransportTab;

                  return (
                    <OrderCardStore
                      key={orderCard.id}
                      order={orderCard}
                      onPress={() => order && onOrderPress(order)}
                      expandable
                      isSelected={
                        showSelection
                          ? isOrderSelected(orderCard.id)
                          : undefined
                      }
                      onSelect={
                        showSelection
                          ? (selected) =>
                            handleOrderSelect(orderCard.id, selected)
                          : undefined
                      }
                    />
                  );
                })}
            </>
          )}
        </View>
      </ScrollView>

      <FloatingActionButtons
        selectedOrdersCount={getSelectedOrdersCount()}
        selectedBatchesCount={selectedBatches.size}
        hasSelectedBatch={hasSelectedBatch()}
        onCreateBatch={handleCreateBatchShipment}
        onBatchShipment={handleBatchShipment}
        onConfirmGroupShipment={handleConfirmGroupShipment}
        showGroupConfirm={groupedOrders.size > 0}
      />

      <FactorySelectionDialog
        visible={showFactoryDialog}
        factories={factories}
        selectedFactoryId={selectedFactoryId}
        onSelectFactory={setSelectedFactoryId}
        onConfirm={handleConfirmBatchShipment}
        onCancel={handleCancelBatchShipment}
      />

      {/* Loading Screen for Batch Creation */}
      {isCreatingBatch && (
        <LoadingScreen message="Đang tạo lô..." fullScreen={false} />
      )}

      {/* Loading Screen for Trip Creation */}
      {isCreatingTrip && (
        <LoadingScreen
          message="Đang tạo chuyến vận chuyển..."
          fullScreen={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: storeMainContentMarginBottom(),
    paddingTop: storeMainContentPaddingTop(),
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  searchSection: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  groupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  groupCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  groupCheckbox: {
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#2563EB",
  },
  groupCardHeaderContent: {
    flex: 1,
  },
  groupCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  groupCardSubtitle: {
    fontSize: 11,
    color: "#6B7280",
  },
  printButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  printButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 6,
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  groupedOrdersContainer: {
    marginTop: 12,
    gap: 8,
  },
  shrunkOrderCard: {
    opacity: 1,
  },
  ordersList: {
    flex: 1,
  },
  ordersContent: {
    padding: 16,
    gap: 12,
  },
  promotionBannerContainer: {
    marginBottom: 8,
  },
  inlineRefreshRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  inlineRefreshText: {
    fontSize: 13,
    color: "#4B5563",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  emptyContainer: {
    padding: 60,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: "#9CA3AF",
  },
});
