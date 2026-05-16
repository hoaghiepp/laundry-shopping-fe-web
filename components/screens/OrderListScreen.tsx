import { OrderStatus, SecureStoreKeys } from "@/constants/enum";
import { CustomerProfile } from "@/services/api/customerService";
import { Order, orderService } from "@/services/api/orderService";
import { storeService } from "@/services/api/storeService";
import { FontAwesome5 } from "@expo/vector-icons";
import * as SecureStore from "@/lib/secureStorage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  PanResponder,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { OrderCard } from "../orders/OrderCard";
import { DisplayOrder, mapOrderToDisplay } from "../orders/utils/orderUtils";

interface OrderListScreenProps {
  onOrderPress: (order: Order) => void;
}

export const OrderListScreen: React.FC<OrderListScreenProps> = ({
  onOrderPress,
}) => {
  const [activeTab, setActiveTab] = useState<"new" | "active" | "history">("new");
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [originalOrders, setOriginalOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [hubNames, setHubNames] = useState<Map<string, string>>(new Map());

  const pageSize = 20;

  // Swipe gesture handling
  const swipeStartX = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadCustomerId();
  }, []);

  useEffect(() => {
    if (customerId) {
      fetchOrders(true);
    }
  }, [customerId]);

  const loadCustomerId = async () => {
    try {
      const profileJson = await SecureStore.getItemAsync(
        SecureStoreKeys.CUSTOMER_PROFILE
      );
      if (profileJson) {
        const profile: CustomerProfile = JSON.parse(profileJson);
        setCustomerId(profile.id);
      }
    } catch (error) {
      console.error("Error loading customer ID:", error);
    }
  };

  const fetchOrders = async (reset: boolean = false) => {
    if (!customerId) return;

    if (reset) {
      setLoading(true);
      setPage(0);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentPage = reset ? 0 : page;
      const statusFilter = activeTab === "active" ? undefined : undefined; // For history, we can filter completed/cancelled orders if needed
      console.log({
        customer_id: customerId,
        status: statusFilter,
        fetch_order_items: true,
        fetch_order_logs: false,
      })
      const response = await orderService.searchCustomerOrders(
        {
          customer_id: customerId,
          status: statusFilter,
          fetch_order_items: true,
          fetch_order_logs: false,
        },
        {
          page: currentPage,
          size: pageSize,
          sort: "createdDate,desc"
        }
      );

      // Fetch hub names for all unique hub_ids
      const hubIds = [...new Set(response.data.map((order) => order.hub_id).filter(Boolean))];
      const updatedHubNames = new Map(hubNames);

      await Promise.all(
        hubIds.map(async (hubId) => {
          if (!updatedHubNames.has(hubId)) {
            try {
              const response = await storeService.getStoreProfile(hubId);
              if (response?.data?.name) {
                updatedHubNames.set(hubId, response.data.name);
              }
            } catch (error) {
              console.error(`Error fetching hub name for ${hubId}:`, error);
            }
          }
        })
      );

      if (updatedHubNames.size > hubNames.size) {
        setHubNames(updatedHubNames);
      }

      const displayOrders = response.data.map((order) =>
        mapOrderToDisplay(order, updatedHubNames)
      );

      if (reset) {
        setOrders(displayOrders);
        setOriginalOrders(response.data);
      } else {
        setOrders((prev) => [...prev, ...displayOrders]);
        setOriginalOrders((prev) => [...prev, ...response.data]);
      }

      setTotal(response.meta.total);
      setHasMore(
        displayOrders.length === pageSize &&
        (currentPage + 1) * pageSize < response.meta.total
      );
      setPage(currentPage + 1);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(true);
  }, [customerId]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchOrders(false);
    }
  }, [loadingMore, hasMore, loading, customerId, page]);

  const handleTabChange = (tab: "new" | "active" | "history") => {
    setActiveTab(tab);
  };

  const handleSwipeLeft = () => {
    // Swipe left = next tab (new -> active -> history)
    setActiveTab((currentTab) => {
      if (currentTab === "new") {
        return "active";
      } else if (currentTab === "active") {
        return "history";
      }
      return currentTab;
    });
  };

  const handleSwipeRight = () => {
    // Swipe right = previous tab (history -> active -> new)
    setActiveTab((currentTab) => {
      if (currentTab === "history") {
        return "active";
      } else if (currentTab === "active") {
        return "new";
      }
      return currentTab;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only detect horizontal swipes
        const { dx, dy } = gestureState;
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        // Capture swipes that start on child touchables (e.g. cards/badges)
        const { dx, dy } = gestureState;
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
      },
      onPanResponderGrant: (_, gestureState) => {
        swipeStartX.current = gestureState.x0;
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx } = gestureState;
        const minSwipeDistance = 50;

        if (Math.abs(dx) > minSwipeDistance) {
          if (dx > 0) {
            // Swiped right
            handleSwipeRight();
          } else {
            // Swiped left
            handleSwipeLeft();
          }
        }
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
    })
  ).current;

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const filteredOrders = orders
    .filter((order) => {
      const isCancelled = order.originalStatus === OrderStatus.CANCELLED || order.originalStatus === OrderStatus.CUSTOMER_REJECTED;
      const isFinished = order.originalStatus === OrderStatus.FINISHED;
      const isCreated = order.originalStatus === OrderStatus.CREATED;

      if (activeTab === "new") {
        // Show only CREATED orders
        return isCreated;
      } else if (activeTab === "history") {
        // Show CANCELLED and FINISHED orders in history
        return isCancelled || isFinished;
      } else if (activeTab === "active") {
        // Show active orders (not cancelled, not finished, not created)
        return !isCancelled && !isFinished && !isCreated;
      }
      return false;
    })
    .sort((a, b) => {
      // Get original orders to access created_date and status
      const originalA = originalOrders.find((o) => o.id === a.id);
      const originalB = originalOrders.find((o) => o.id === b.id);

      if (!originalA || !originalB) return 0;

      // First priority: Orders that need confirmation come first
      const needsConfirmationA = a.originalStatus === OrderStatus.NEED_CUSTOMER_CONFIRMATION;
      const needsConfirmationB = b.originalStatus === OrderStatus.NEED_CUSTOMER_CONFIRMATION;

      if (needsConfirmationA && !needsConfirmationB) return -1; // A comes first
      if (!needsConfirmationA && needsConfirmationB) return 1; // B comes first

      // Second priority: Sort by time (created_date) - newest first
      const dateA = new Date(originalA.created_date).getTime();
      const dateB = new Date(originalB.created_date).getTime();

      if (dateA !== dateB) {
        return dateB - dateA; // Descending order (newest first)
      }

      // Third priority: Sort by processing status (PROCESSING before CREATED)
      const statusA = originalA.status;
      const statusB = originalB.status;

      // Define processing priority: PROCESSING > CREATED > others
      const getProcessingPriority = (status: string) => {
        if (status === OrderStatus.PROCESSING) return 1;
        if (status === OrderStatus.CREATED) return 2;
        return 3;
      };

      const priorityA = getProcessingPriority(statusA);
      const priorityB = getProcessingPriority(statusB);

      if (priorityA !== priorityB) {
        return priorityA - priorityB; // Lower number = higher priority
      }

      // If all criteria are equal, maintain order
      return 0;
    });

  // Count orders for each tab
  const newOrdersCount = orders.filter((o) => {
    return o.originalStatus === OrderStatus.CREATED;
  }).length;

  const activeOrdersCount = orders.filter((o) => {
    const isCancelled = o.originalStatus === OrderStatus.CANCELLED || o.originalStatus === OrderStatus.CUSTOMER_REJECTED;
    const isFinished = o.originalStatus === OrderStatus.FINISHED;
    const isCreated = o.originalStatus === OrderStatus.CREATED;
    return !isCancelled && !isFinished && !isCreated;
  }).length;

  const historyOrdersCount = orders.filter((o) => {
    const isCancelled = o.originalStatus === OrderStatus.CANCELLED || o.originalStatus === OrderStatus.CUSTOMER_REJECTED;
    const isFinished = o.originalStatus === OrderStatus.FINISHED;
    return isCancelled || isFinished;
  }).length;

  if (loading && orders.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Đơn hàng của tôi</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Đơn hàng của tôi</Text>
        {/* <FontAwesome5 name="history" size={18} color="#6B7280" /> */}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "new" && styles.tabActive]}
          onPress={() => handleTabChange("new")}
          activeOpacity={1}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "new" && styles.tabTextActive,
            ]}
          >
            Mới tạo ({newOrdersCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "active" && styles.tabActive]}
          onPress={() => handleTabChange("active")}
          activeOpacity={1}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "active" && styles.tabTextActive,
            ]}
          >
            Đang xử lý ({activeOrdersCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "history" && styles.tabActive]}
          onPress={() => handleTabChange("history")}
          activeOpacity={1}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "history" && styles.tabTextActive,
            ]}
          >
            Lịch sử ({historyOrdersCount})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom
          ) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
        {...panResponder.panHandlers}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="inbox" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              {activeTab === "new"
                ? "Chưa có đơn hàng mới tạo"
                : activeTab === "active"
                  ? "Chưa có đơn hàng đang thực hiện"
                    : "Chưa có đơn hàng đã hoàn thành hoặc đã hủy"}
            </Text>
          </View>
        ) : (
          <>
            {filteredOrders.map((order) => {
              const originalOrder = originalOrders.find(
                (o) => o.id === order.id
              );
              return (
                <View key={order.id}>
                  <OrderCard
                    order={order}
                    isExpanded={expandedOrders.has(order.id)}
                    onPress={() => {
                      if (originalOrder) {
                        onOrderPress(originalOrder);
                      }
                    }}
                    onToggleExpand={() => toggleOrderExpand(order.id)}
                  />
                </View>
              );
            })}
            {loadingMore && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
              </View>
            )}
          </>
        )}
      </ScrollView>
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
    // flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  tabs: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#2563EB",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: "center",
  },
});
