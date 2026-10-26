import { PromotionBanner } from "@/components/home/PromotionBanner";
import { useOrderStream } from "@/hooks/useOrderStream";
import {
    FactorySelectionDialog,
    FloatingActionButtons,
    OrderTab,
    OrderTabs,
    areAllServicesDone,
    isOnlyGoodsOrder,
    mapOrderStatusToTab,
    mapOrderToCardData
} from "@/components/orders";
import { loadTransportOrders } from "@/components/orders/loadTransportOrders";
import { WaitingTransportPanel } from "@/components/orders/WaitingTransportPanel";
import { OrderCardData, OrderCardStore } from "@/components/store/OrderCard";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import {
    GoodsOrderItemStatus,
    IncidentStatus,
    LogisticTripItemType,
    OrderStatus,
    PaymentStatus,
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
  buildCombinedOrderReceiptsPdf,
  buildOrderReceiptPdf,
  resolveOrderReceiptOptions,
  saveOrDownloadReceiptPdf,
} from "@/utils/orderReceiptPdf";
import {
    CreateTripsRequest,
    LogisticsTripItem,
    logisticService,
} from "@/services/api/logisticService";
import { applyOrderStreamPatch } from "@/services/api/orderStream";
import { Order, orderService } from "@/services/api/orderService";
import { isStorePaymentConfirm } from "@/components/orders/utils/orderUtils";
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

const WAITING_CONFIRM_LABEL = "Chờ xác nhận tiền";

async function searchStoreCashToConfirm(
  storeId: string,
  size: number
): Promise<Order[]> {
  const [storeConfirm, legacyConfirm] = await Promise.all([
    orderService.searchStoreOrders(
      {
        hub_id: storeId,
        payment_status: PaymentStatus.WAITING_STORE_CONFIRM,
        fetch_order_items: true,
        fetch_incidents: true,
      },
      { page: 0, size, sort: "createdDate,desc" }
    ),
    orderService.searchStoreOrders(
      {
        hub_id: storeId,
        payment_status: PaymentStatus.WAITING_CONFIRM,
        fetch_order_items: true,
        fetch_incidents: true,
      },
      { page: 0, size, sort: "createdDate,desc" }
    ),
  ]);
  const byId = new Map<string, Order>();
  for (const order of [...(storeConfirm.data ?? []), ...(legacyConfirm.data ?? [])]) {
    byId.set(order.id, order);
  }
  return Array.from(byId.values());
}

function sortWaitingConfirmFirst(cards: OrderCardData[]): OrderCardData[] {
  return [...cards].sort((a, b) => {
    const aWait = a.paymentStatusBadge?.text === WAITING_CONFIRM_LABEL ? 0 : 1;
    const bWait = b.paymentStatusBadge?.text === WAITING_CONFIRM_LABEL ? 0 : 1;
    if (aWait !== bWait) return aWait - bWait;
    return 0;
  });
}

const STORE_TABS: OrderTab[] = [
  "new",
  "processing",
  "waiting_transport",
  "waiting_return",
  "finished",
  "cancelled",
];

function orderMatchesStoreTab(tab: OrderTab, order: Order): boolean {
  switch (tab) {
    case "new":
      return (
        order.status === OrderStatus.CREATED ||
        (isStorePaymentConfirm(order.payment_status) &&
          order.status !== OrderStatus.FINISHED &&
          order.status !== OrderStatus.CANCELLED &&
          order.status !== OrderStatus.CUSTOMER_REJECTED)
      );
    case "finished":
      return order.status === OrderStatus.FINISHED;
    case "cancelled":
      return (
        order.status === OrderStatus.CANCELLED ||
        order.status === OrderStatus.CUSTOMER_REJECTED
      );
    case "processing":
      if (order.status === OrderStatus.NEED_CUSTOMER_CONFIRMATION) return true;
      if (order.status === OrderStatus.CANCELLED) return !!order.factory_id;
      if (order.status !== OrderStatus.PROCESSING) return false;
      if (order.factory_id) return true;
      if (!isOnlyGoodsOrder(order)) return false;
      return !order.order_items?.some(
        (item) => item.goods_status === GoodsOrderItemStatus.CREATED
      );
    case "waiting_transport":
      if (order.status !== OrderStatus.PROCESSING) return false;
      if (order.factory_id) return false;
      if (isOnlyGoodsOrder(order)) return false;
      return !order.order_items?.some((item) => {
        const status = item.service_status;
        return (
          status === ServiceOrderItemStatus.PICKING ||
          status === ServiceOrderItemStatus.DELIVERING ||
          status === ServiceOrderItemStatus.WASHING ||
          status === ServiceOrderItemStatus.AT_FACTORY
        );
      });
    case "waiting_return":
      if (order.status === OrderStatus.CUSTOMER_INCIDENTS_REJECTED) return true;
      if (order.status === OrderStatus.CUSTOMER_REJECTED) {
        return orderHasServiceItems(order);
      }
      if (order.status !== OrderStatus.PROCESSING) return false;
      if (order.is_split_shipment) return true;
      if (isOnlyGoodsOrder(order)) {
        return !!order.order_items?.some(
          (item) => item.goods_status === GoodsOrderItemStatus.CREATED
        );
      }
      {
        const serviceItems =
          order.order_items?.filter(
            (item) => item.product_type === ProductType.SERVICE
          ) ?? [];
        return (
          serviceItems.length > 0 &&
          serviceItems.every(
            (item) => item.service_status === ServiceOrderItemStatus.DELIVERING
          )
        );
      }
    default:
      return false;
  }
}

function cardStatusForTab(
  tab: OrderTab,
  order: Order
): OrderCardData["status"] | undefined {
  if (tab === "processing") {
    if (
      order.status === OrderStatus.NEED_CUSTOMER_CONFIRMATION &&
      order.payment_status === PaymentStatus.WAITING_CUSTOMER_CONFIRM
    ) {
      return "wait_confirm";
    }
    if (order.factory_id) return "factory";
    return undefined;
  }
  if (tab === "finished") return "finished";
  if (tab === "cancelled") return "cancelled";
  if (tab === "waiting_transport") return "waiting_transport";
  if (tab === "waiting_return") {
    if (order.status === OrderStatus.CANCELLED) return "cancelled_waiting_return";
    if (order.status === OrderStatus.CUSTOMER_REJECTED) {
      return "customer_rejected_waiting_return";
    }
    return "waiting_return";
  }
  return undefined;
}

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
  const PAGE_SIZE = 50;
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
  const [pageByTab, setPageByTab] = useState<Partial<Record<OrderTab, number>>>({});
  const [moreByTab, setMoreByTab] = useState<Partial<Record<OrderTab, boolean>>>({});
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [isPrintingReceipts, setIsPrintingReceipts] = useState(false);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  const tabCacheRef = React.useRef<Map<OrderTab, OrderCardData[]>>(new Map());
  const orderTabRef = React.useRef<Map<string, OrderTab>>(new Map());
  const visitedTabsRef = React.useRef<Set<OrderTab>>(new Set());
  const tabPageRef = React.useRef<Map<OrderTab, number>>(new Map());
  const tabPage0IdsRef = React.useRef<Map<OrderTab, Set<string>>>(new Map());
  const tabHasMoreRef = React.useRef<Map<OrderTab, boolean>>(new Map());
  const loadMoreLockRef = React.useRef(false);
  const activeTabRef = React.useRef(activeTab);
  activeTabRef.current = activeTab;
  const syncingRef = React.useRef(false);

  const mergeIntoCache = (
    tab: OrderTab,
    pageItems: OrderCardData[],
    page: number
  ) => {
    const prev = tabCacheRef.current.get(tab) || [];

    if (page === 0) {
      // Replace the previous first page (moved or new orders) and keep later pages.
      const incomingIds = new Set(pageItems.map((card) => card.id));
      const previousFirstPage = tabPage0IdsRef.current.get(tab) ?? new Set<string>();
      tabPage0IdsRef.current.set(tab, incomingIds);
      const rest = prev.filter(
        (card) => !incomingIds.has(card.id) && !previousFirstPage.has(card.id)
      );
      const merged = [...pageItems, ...rest];
      tabCacheRef.current.set(tab, merged);
      return merged;
    }

    const existingIds = new Set(prev.map((x) => x.id));
    const appended = [...prev, ...pageItems.filter((x) => !existingIds.has(x.id))];
    tabCacheRef.current.set(tab, appended);
    return appended;
  };

  /** Apply fetch results to list, orderMap, and selection (prune stale orders on page-0 refresh). */
  const applyTabOrderResults = (
    tab: OrderTab,
    cardDataList: OrderCardData[],
    filteredOrders: Order[],
    page: number
  ) => {
    const prevTabCards = page === 0 ? tabCacheRef.current.get(tab) || [] : [];
    const mergedOrders = sortWaitingConfirmFirst(
      mergeIntoCache(tab, cardDataList, page)
    );
    tabCacheRef.current.set(tab, mergedOrders);
    if (activeTabRef.current === tab) setOrders(mergedOrders);

    setOrderMap((prev) => {
      const next = new Map(prev);
      const incomingCodes = new Set(filteredOrders.map((o) => o.code));

      if (page === 0) {
        const codesInOtherTabs = new Set<string>();
        tabCacheRef.current.forEach((cards, otherTab) => {
          if (otherTab !== tab) {
            cards.forEach((c) => codesInOtherTabs.add(c.id));
          }
        });
        const stillOnThisTab = new Set(mergedOrders.map((card) => card.id));
        prevTabCards.forEach((card) => {
          if (!stillOnThisTab.has(card.id) && !codesInOtherTabs.has(card.id)) {
            next.delete(card.id);
            orderTabRef.current.delete(card.id);
          }
        });
      }

      filteredOrders.forEach((order) => {
        next.set(order.code, order);
        orderTabRef.current.set(order.code, tab);
      });
      return next;
    });

    if (page === 0) {
      const visibleIds = new Set(mergedOrders.map((c) => c.id));
      setSelectedOrders((prev) => {
        const next = new Set<string>();
        prev.forEach((id) => {
          if (visibleIds.has(id)) next.add(id);
        });
        return next;
      });
    }
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
      if (wtCached === 0 && activeTabRef.current === "waiting_transport") setLoading(true);

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
      applyTabOrderResults("waiting_transport", cardDataList, allFilteredOrders, 0);
    } catch (error) {
      console.error("Failed to fetch tracking items:", error);
      setOrders((prev) => prev);
      setBatches(new Map());
      setBatchTrackingItemIds(new Map());
    } finally {
      if (activeTabRef.current === "waiting_transport") setLoading(false);
    }
  };

  // Fetch orders for a specific tab
  const fetchOrdersForTab = async (tab: OrderTab, page = 0) => {
    if (!storeId) return;

    if (tab === "waiting_transport") return;

    try {
      if (page === 0) {
        const cachedLen = tabCacheRef.current.get(tab)?.length ?? 0;
        if (cachedLen === 0 && activeTabRef.current === tab) setLoading(true);
      } else if (activeTabRef.current === tab) setLoadingMore(true);

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

        applyTabOrderResults(tab, cardDataList, filteredOrders, page);
        setBatches(new Map());
        setBatchTrackingItemIds(new Map());
        tabPageRef.current.set(tab, page);
        const hasMore = cardDataList.length >= PAGE_SIZE;
        tabHasMoreRef.current.set(tab, hasMore);
        setMoreByTab((prev) => (prev[tab] === hasMore ? prev : { ...prev, [tab]: hasMore }));
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
        const cashToConfirm =
          page === 0 ? await searchStoreCashToConfirm(storeId, PAGE_SIZE) : [];
        const byId = new Map<string, Order>();
        for (const order of [...cashToConfirm, ...response.data]) {
          byId.set(order.id, order);
        }
        filteredOrders = Array.from(byId.values()).filter((order) =>
          orderMatchesStoreTab("new", order)
        );
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
            if (
              order.status === OrderStatus.NEED_CUSTOMER_CONFIRMATION &&
              order.payment_status === PaymentStatus.WAITING_CUSTOMER_CONFIRM
            ) {
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

      applyTabOrderResults(tab, cardDataList, filteredOrders, page);
      if (activeTabRef.current === tab) {
        setBatches(new Map());
        setBatchTrackingItemIds(new Map());
      }
      tabPageRef.current.set(tab, page);
      const hasMore = cardDataList.length >= PAGE_SIZE;
      tabHasMoreRef.current.set(tab, hasMore);
      setMoreByTab((prev) => (prev[tab] === hasMore ? prev : { ...prev, [tab]: hasMore }));
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      if (page === 0) {
        tabPageRef.current.delete(tab);
        tabHasMoreRef.current.delete(tab);
        setMoreByTab((prev) => ({ ...prev, [tab]: false }));
      }
    } finally {
      if (activeTabRef.current === tab) {
        setLoading(false);
        setLoadingMore(false);
      }
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

      let waitingOrderIds = new Set<string>();
      try {
        const transportGroups = await loadTransportOrders(storeId, "hub");
        waitingOrderIds = new Set(transportGroups.map((group) => group.orderId));
        counts.waiting_transport = transportGroups.length;
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
        const isInWaitingTransport = waitingOrderIds.has(order.id);

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
          if (tabStatus !== "new" && isStorePaymentConfirm(order.payment_status)) {
            counts.new++;
          }
          // Don't count factory here as it's already counted above for PROCESSING orders
          // Don't count waiting_transport here as it's already counted above
        }
      });

      setTabCounts(counts);
    } catch (error) {
      console.error("Failed to fetch order counts:", error);
    }
  };

  const refreshAllTabs = async () => {
    if (!storeId || syncingRef.current) return;
    syncingRef.current = true;
    try {
      await Promise.all([
        fetchOrdersForTab("new", 0),
        fetchOrdersForTab("processing", 0),
        fetchOrdersForTab("waiting_transport", 0),
        fetchOrdersForTab("waiting_return", 0),
        fetchOrdersForTab("finished", 0),
        fetchOrdersForTab("cancelled", 0),
        fetchAllOrdersCounts(),
      ]);
      STORE_TABS.forEach((tab) => visitedTabsRef.current.add(tab));
    } finally {
      syncingRef.current = false;
    }
  };
  const refreshAllTabsRef = React.useRef(refreshAllTabs);
  refreshAllTabsRef.current = refreshAllTabs;

  useEffect(() => {
    if (!storeId) return;
    setTrackingItemsCache(null);
    tabCacheRef.current.clear();
    orderTabRef.current.clear();
    visitedTabsRef.current.clear();
    tabPageRef.current.clear();
    tabPage0IdsRef.current.clear();
    tabHasMoreRef.current.clear();
    loadMoreLockRef.current = false;
    setOrders([]);
    setPageByTab({});
    setMoreByTab({});
    void refreshAllTabsRef.current();
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    setSelectedOrders(new Set());
    setSelectedBatches(new Set());
    const cached = tabCacheRef.current.get(activeTab);
    setOrders(cached ?? []);
    setLoading(!cached);
  }, [activeTab]);

  // Refresh when refreshKey changes (e.g., after process detail)
  useEffect(() => {
    if (storeId && refreshKey !== undefined && refreshKey > 0) {
      setTrackingItemsCache(null);
      void refreshAllTabs();
    }
  }, [refreshKey]);

  const orderMapRef = React.useRef(orderMap);
  orderMapRef.current = orderMap;
  const onOrderPressRef = React.useRef(onOrderPress);
  onOrderPressRef.current = onOrderPress;
  const ingestingOrderIds = React.useRef<Set<string>>(new Set());

  const placeOrder = (patched: Order) => {
    const code = patched.code;
    const active = activeTabRef.current;
    let visibleSomewhere = false;
    const countDelta: Partial<Record<OrderTab, number>> = {};

    STORE_TABS.forEach((tab) => {
      const isActive = tab === active;
      const list = tabCacheRef.current.get(tab) ?? [];
      const has = list.some((card) => card.id === code);
      const belongs = orderMatchesStoreTab(tab, patched);
      if (belongs) visibleSomewhere = true;
      if (!belongs && !has) return;

      let nextList: OrderCardData[];
      if (!belongs) {
        nextList = list.filter((card) => card.id !== code);
      } else {
        const filterGoodsOnly =
          tab === "waiting_return" &&
          !!patched.is_split_shipment &&
          !areAllServicesDone(patched);
        const card = mapOrderToCardData(
          patched,
          onOrderPressRef.current,
          cardStatusForTab(tab, patched),
          filterGoodsOnly
        );
        if (!card) {
          nextList = list.filter((item) => item.id !== code);
        } else {
          nextList = sortWaitingConfirmFirst(
            has
              ? list.map((item) => (item.id === code ? card : item))
              : [card, ...list]
          );
        }
      }

      tabCacheRef.current.set(tab, nextList);
      const stillThere = nextList.some((card) => card.id === code);
      if (has && !stillThere) countDelta[tab] = (countDelta[tab] ?? 0) - 1;
      if (!has && stillThere) countDelta[tab] = (countDelta[tab] ?? 0) + 1;
      const firstPageIds = new Set(tabPage0IdsRef.current.get(tab) ?? []);
      if (!belongs) firstPageIds.delete(code);
      else if (!has) firstPageIds.add(code);
      tabPage0IdsRef.current.set(tab, firstPageIds);
      if (isActive) setOrders(nextList);
    });

    setOrderMap((prev) => {
      const next = new Map(prev);
      if (visibleSomewhere || STORE_TABS.some((tab) => orderMatchesStoreTab(tab, patched))) {
        next.set(code, patched);
        const home =
          orderTabRef.current.get(code) ??
          STORE_TABS.find((tab) => orderMatchesStoreTab(tab, patched));
        if (home) orderTabRef.current.set(code, home);
      } else {
        next.delete(code);
        orderTabRef.current.delete(code);
      }
      return next;
    });
    if (STORE_TABS.some((tab) => countDelta[tab])) {
      setTabCounts((prev) => {
        const next = { ...prev };
        STORE_TABS.forEach((tab) => {
          const delta = countDelta[tab];
          if (!delta) return;
          next[tab] = Math.max(0, next[tab] + delta);
        });
        return next;
      });
    }
  };

  useOrderStream({
    onOrderUpdated: (event) => {
      if (!storeId) return;
      if (event.hub_id && event.hub_id !== storeId) return;

      let existing: Order | undefined;
      orderMapRef.current.forEach((order) => {
        if (order.id === event.order_id) existing = order;
      });

      if (!existing) {
        if (ingestingOrderIds.current.has(event.order_id)) return;
        ingestingOrderIds.current.add(event.order_id);
        void orderService
          .searchStoreOrders(
            {
              code: event.order_code,
              hub_id: storeId,
              fetch_order_items: true,
              fetch_incidents: true,
            },
            { page: 0, size: 1 }
          )
          .then((response) => {
            const order =
              response.data?.find((item) => item.id === event.order_id) ??
              response.data?.[0];
            if (!order) return;
            placeOrder(applyOrderStreamPatch(order, event));
          })
          .catch(() => {
            /* the next manual refresh will load the order */
          })
          .finally(() => {
            ingestingOrderIds.current.delete(event.order_id);
          });
        return;
      }

      placeOrder(applyOrderStreamPatch(existing, event));
    },
  });

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

  // Get count of selected orders excluding batch orders
  const getSelectedOrderCodes = (): string[] => {
    if (activeTab !== "waiting_transport" || batches.size === 0) {
      return Array.from(selectedOrders);
    }
    const allBatchOrderCodes = Array.from(batches.values()).flat();
    return Array.from(selectedOrders).filter(
      (code) => !allBatchOrderCodes.includes(code)
    );
  };

  const getSelectedOrdersCount = () => getSelectedOrderCodes().length;

  const printReceiptsForOrders = async (orderCodes: string[]) => {
    if (orderCodes.length === 0) return;

    const orders: Order[] = [];
    for (const code of orderCodes) {
      const order = orderMap.get(code);
      if (order?.code) orders.push(order);
    }

    if (orders.length === 0) {
      compatAlert("Lỗi", "Không tìm thấy thông tin đơn hàng để in");
      return;
    }

    setIsPrintingReceipts(true);
    try {
      const receiptOptions = await resolveOrderReceiptOptions(storeId);
      const pdfBytes =
        orders.length === 1
          ? await buildOrderReceiptPdf(orders[0], receiptOptions)
          : await buildCombinedOrderReceiptsPdf(orders, receiptOptions);

      const fileName =
        orders.length === 1
          ? `Bien_nhan_${orders[0].code!.replace(/[^\w.-]+/g, "_")}.pdf`
          : `Bien_nhan_${orders.length}_don.pdf`;

      await saveOrDownloadReceiptPdf(pdfBytes, fileName);
      compatAlert(
        "Thành công",
        orders.length === 1
          ? `Đã tạo biên nhận: ${fileName}`
          : `Đã gộp ${orders.length} biên nhận vào file: ${fileName}`
      );
    } catch (error: unknown) {
      console.error("Error printing receipts:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Không thể tạo file PDF. Vui lòng thử lại.";
      compatAlert("Lỗi", msg);
    } finally {
      setIsPrintingReceipts(false);
    }
  };

  const handlePrintSelectedReceipts = () => {
    void printReceiptsForOrders(getSelectedOrderCodes());
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
          type: LogisticTripItemType.BAG_INBOUND,
          service_item_tracking_id: trackingItemId,
          container_code: barcode,
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
    try {
      syncingRef.current = false;
      await refreshAllTabs();
    } finally {
      setRefreshing(false);
    }
  };

  const ordersListRef = React.useRef<ScrollView>(null);

  const goToPage = async (index: number) => {
    if (!storeId || loadingMore) return;
    const next = Math.max(0, index);
    setPageByTab((prev) => ({ ...prev, [activeTab]: next }));
    ordersListRef.current?.scrollTo({ y: 0, animated: false });

    const needed = (next + 1) * PAGE_SIZE;
    if ((tabCacheRef.current.get(activeTab)?.length ?? 0) >= needed) return;
    if (activeTab === "waiting_transport") return;
    if (tabHasMoreRef.current.get(activeTab) === false) return;

    let apiPage = tabPageRef.current.get(activeTab) || 0;
    while ((tabCacheRef.current.get(activeTab)?.length ?? 0) < needed) {
      if (tabHasMoreRef.current.get(activeTab) === false) break;
      const before = tabCacheRef.current.get(activeTab)?.length ?? 0;
      apiPage += 1;
      loadMoreLockRef.current = true;
      await fetchOrdersForTab(activeTab, apiPage);
      const after = tabCacheRef.current.get(activeTab)?.length ?? 0;
      if (after <= before) break;
    }
  };

  const pageIndex = pageByTab[activeTab] ?? 0;
  const knownCount = Math.max(tabCounts[activeTab] || 0, orders.length);
  let totalPages = Math.max(1, Math.ceil(knownCount / PAGE_SIZE));
  if (moreByTab[activeTab] && orders.length >= totalPages * PAGE_SIZE) {
    totalPages += 1;
  }
  const safePage = Math.min(pageIndex, totalPages - 1);
  const pageOrders = orders.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  const openTransportOrder = async (orderId: string, orderCode: string) => {
    if (!storeId) return;
    try {
      const response = await orderService.searchStoreOrders(
        {
          code: orderCode,
          hub_id: storeId,
          fetch_order_items: true,
        },
        { page: 0, size: 5 }
      );
      const order =
        response.data?.find((item) => item.id === orderId) ?? response.data?.[0];
      if (!order) {
        compatAlert("Không tìm thấy", `Không tìm thấy đơn ${orderCode}`);
        return;
      }
      onOrderPress(order);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tải đơn hàng";
      compatAlert("Lỗi", message);
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

      {activeTab !== "waiting_transport" && totalPages > 1 && (
        <View style={styles.paginationRow}>
          <TouchableOpacity
            style={[styles.pageArrow, safePage === 0 && styles.pageArrowDisabled]}
            onPress={() => void goToPage(safePage - 1)}
            disabled={safePage === 0 || loadingMore}
            activeOpacity={0.7}
          >
            <FontAwesome5
              name="chevron-left"
              size={14}
              color={safePage === 0 ? "#9CA3AF" : "#111827"}
            />
          </TouchableOpacity>
          <Text style={styles.pageText}>
            Trang {safePage + 1}/{totalPages}
          </Text>
          <TouchableOpacity
            style={[
              styles.pageArrow,
              safePage >= totalPages - 1 && styles.pageArrowDisabled,
            ]}
            onPress={() => void goToPage(safePage + 1)}
            disabled={safePage >= totalPages - 1 || loadingMore}
            activeOpacity={0.7}
          >
            <FontAwesome5
              name="chevron-right"
              size={14}
              color={safePage >= totalPages - 1 ? "#9CA3AF" : "#111827"}
            />
          </TouchableOpacity>
          {loadingMore && <ActivityIndicator size="small" color="#2563EB" />}
        </View>
      )}

      {activeTab === "waiting_transport" && storeId ? (
        <WaitingTransportPanel
          storeId={storeId}
          sourceKind="hub"
          reloadKey={refreshKey ?? 0}
          onCount={(count) =>
            setTabCounts((prev) =>
              prev.waiting_transport === count
                ? prev
                : { ...prev, waiting_transport: count }
            )
          }
          onOrderPress={(orderId, orderCode) => {
            void openTransportOrder(orderId, orderCode);
          }}
        />
      ) : (
      <ScrollView
        ref={ordersListRef}
        style={styles.ordersList}
        showsVerticalScrollIndicator={false}
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
                      onPress={() =>
                        void printReceiptsForOrders(Array.from(groupedOrders))
                      }
                      activeOpacity={1}
                      disabled={isPrintingReceipts}
                    >
                      <FontAwesome5 name="print" size={14} color="#2563EB" />
                      <Text style={styles.printButtonText}>In đơn</Text>
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

              {pageOrders
                .filter((orderCard) => !groupedOrders.has(orderCard.id))
                .map((orderCard) => {
                  const order = orderMap.get(orderCard.id);
                  return (
                    <OrderCardStore
                      key={orderCard.id}
                      order={orderCard}
                      onPress={() => order && onOrderPress(order)}
                      expandable
                    />
                  );
                })}
            </>
          )}
        </View>
      </ScrollView>
      )}

      {activeTab !== "waiting_transport" && (
      <FloatingActionButtons
        selectedOrdersCount={getSelectedOrdersCount()}
        selectedBatchesCount={selectedBatches.size}
        hasSelectedBatch={hasSelectedBatch()}
        onCreateBatch={handleCreateBatchShipment}
        onBatchShipment={handleBatchShipment}
        onPrintOrders={handlePrintSelectedReceipts}
        isPrintingOrders={isPrintingReceipts}
        onConfirmGroupShipment={handleConfirmGroupShipment}
        showGroupConfirm={groupedOrders.size > 0}
      />
      )}

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

      {isPrintingReceipts && (
        <LoadingScreen message="Đang tạo biên nhận..." fullScreen={false} />
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
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },
  pageArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  pageArrowDisabled: {
    backgroundColor: "#F3F4F6",
  },
  pageText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
});
