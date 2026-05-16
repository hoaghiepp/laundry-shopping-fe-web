import { ChangePasswordScreen } from '@/components/auth';
import { FactoryBottomNav, FactoryHeader, FactorySelectorModal } from '@/components/factory';
import {
  FactoryDashboardScreen,
  FactoryItemDetailScreen,
  FactoryLogisticsScreen,
  FactoryProfileScreen,
  FactoryQRScannerScreen,
  FactoryReceiveItemsScreen,
  FactoryReportIssueScreen,
  FactoryScanScreen,
} from '@/components/factory-screens';
import { StaffListScreen, StaffRegistrationScreen, StoreManagementScreen } from '@/components/screens/store';
import { FactoryTab, LogisticTripStatus, SecureStoreKeys, StoreType } from '@/constants/enum';
import { ensureSessionFromStoredTokens } from '@/lib/sessionHydrate';
import { getLastSelectedFactoryId, saveLastSelectedFactoryId } from '@/lib/storeSelection';
import { fcmService } from '@/services/api/fcmService';
import { logisticService } from '@/services/api/logisticService';
import { Order, orderService } from '@/services/api/orderService';
import { StoreListItem, storeService } from '@/services/api/storeService';
import { clearGlobalUserRole, getGlobalUserRole, isAdmin, isSuperAdmin } from '@/utils/globalState';
import { resetOrientationToPortrait } from '@/utils/orientation';
import { router } from 'expo-router';
import * as SecureStore from "@/lib/secureStorage";
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

type OverlayScreen =
  | 'scan'
  | 'qr-scanner'
  | 'receive-items'
  | 'item-detail'
  | 'report-issue'
  | 'staff-list'
  | 'staff-registration'
  | 'manage-factories'
  | 'change-password'
  | null;

export default function FactoryHome() {
  const [activeTab, setActiveTab] = useState<FactoryTab>(FactoryTab.DASHBOARD);
  const [overlayScreen, setOverlayScreen] = useState<OverlayScreen>(null);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedItemType, setSelectedItemType] = useState<'normal' | 'exception_wait' | 'return'>('normal');
  const [factories, setFactories] = useState<StoreListItem[]>([]);
  const [selectedFactory, setSelectedFactory] = useState<StoreListItem | null>(null);
  const [showFactorySelector, setShowFactorySelector] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingMoreOrders, setLoadingMoreOrders] = useState(false);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreOrders, setHasMoreOrders] = useState(true);
  const [receiveTripData, setReceiveTripData] = useState<{
    tripId: string;
    tripCode: string;
    sourceStoreId: string;
    sourceStoreName: string;
  } | null>(null);
  const [incomingTripsCount, setIncomingTripsCount] = useState(0);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [logisticsRefreshTrigger, setLogisticsRefreshTrigger] = useState(0);
  const [dashboardRefreshTrigger, setDashboardRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchFactories();
  }, []);

  useEffect(() => {
    if (selectedFactory?.id) {
      // Reset pagination when factory changes
      setCurrentPage(0);
      setHasMoreOrders(true);
      setOrders([]);
      fetchOrders(0, true);
      fetchIncomingTripsCount();
    }
  }, [selectedFactory?.id]);

  const fetchIncomingTripsCount = useCallback(async () => {
    if (!selectedFactory?.id) return;

    try {
      const response = await logisticService.searchTrips(
        {
          destination_store_id: selectedFactory.id,
        },
        { page: 0, size: 100 }
      );

      if (response?.data) {
        const incomingTrips = response.data.filter(
          (trip: any) =>
            trip.status === LogisticTripStatus.IN_TRANSIT ||
            trip.status === LogisticTripStatus.CREATED
        );
        setIncomingTripsCount(incomingTrips.length);
      }
    } catch (error) {
      console.error('Failed to fetch incoming trips count:', error);
      setIncomingTripsCount(0);
    }
  }, [selectedFactory?.id]);

  const fetchFactories = async () => {
    try {
      await ensureSessionFromStoredTokens();
      const response = await storeService.searchStore(
        { deleted: false, type: StoreType.FACTORY },
        { page: 0, size: 1000 }
      );

      if (response?.data && response.data.length > 0) {
        setFactories(response.data);
        
        // Try to load last selected factory ID
        const lastSelectedFactoryId = await getLastSelectedFactoryId();
        if (lastSelectedFactoryId) {
          const lastFactory = response.data.find((factory) => factory.id === lastSelectedFactoryId);
          if (lastFactory) {
            setSelectedFactory(lastFactory);
            return;
          }
        }
        
        // Default select first factory if no last selected factory found
        const firstFactory = response.data[0];
        setSelectedFactory(firstFactory);
        // Save the first factory as last selected
        await saveLastSelectedFactoryId(firstFactory.id);
      }
    } catch (error) {
      console.error('Failed to fetch factories:', error);
    }
  };

  const fetchOrders = useCallback(async (page: number = 0, reset: boolean = false) => {
    if (!selectedFactory?.id) return;

    try {
      if (reset) {
        setLoadingOrders(true);
      } else {
        setLoadingMoreOrders(true);
      }

      console.log(selectedFactory.id)

      const response = await orderService.searchStoreOrders(
        {
          factory_id: selectedFactory.id,
          fetch_order_items: true,
        },
        { page, size: 20 }
      );

      if (response?.data) {
        const newOrders = response.data;
        const hasMore = newOrders.length === 20; // If we got 20 items, there might be more
        
        if (reset) {
          setOrders(newOrders);
        } else {
          setOrders((prev) => {
            // Create a map of existing orders by ID for quick lookup
            const ordersMap = new Map<string, Order>();
            prev.forEach((order) => {
              ordersMap.set(order.id, order);
            });

            // Only update existing orders, do not add new ones
            newOrders.forEach((newOrder: Order) => {
              const existingOrder = ordersMap.get(newOrder.id);
              if (existingOrder) {
                // Merge: keep old order and update with new attributes
                ordersMap.set(newOrder.id, { ...existingOrder, ...newOrder });
              }
              // Skip adding new orders that don't exist in previous state
            });

            // Convert map back to array
            return Array.from(ordersMap.values());
          });
        }
        
        setCurrentPage(page);
        setHasMoreOrders(hasMore);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      if (reset) {
        Alert.alert('Lỗi', 'Không thể tải danh sách đơn hàng');
      }
    } finally {
      setLoadingOrders(false);
      setLoadingMoreOrders(false);
    }
  }, [selectedFactory?.id]);

  const fetchNextPage = useCallback(() => {
    if (!loadingMoreOrders && !loadingOrders && hasMoreOrders) {
      fetchOrders(currentPage + 1, false);
    }
  }, [currentPage, hasMoreOrders, loadingMoreOrders, loadingOrders, fetchOrders]);

  const handleRefreshOrders = useCallback(async () => {
    if (!selectedFactory?.id) return;
    setRefreshingOrders(true);
    try {
      await fetchOrders(0, true);
      // Trigger dashboard refresh to update batches and tracking items after orders are fetched
      setDashboardRefreshTrigger((prev) => prev + 1);
    } finally {
      setRefreshingOrders(false);
    }
  }, [selectedFactory?.id, fetchOrders]);

  const handleFactorySelect = () => {
    setShowFactorySelector(true);
  };

  const handleFactoryChange = async (factory: StoreListItem) => {
    setSelectedFactory(factory);
    // Save the selected factory ID for next login
    await saveLastSelectedFactoryId(factory.id);
  };

  const handleNotification = () => {
    Alert.alert('Thông báo', 'Xem tất cả thông báo');
  };

  const handleTabChange = (tab: FactoryTab) => {
    if (tab === FactoryTab.SCAN) {
      setOverlayScreen('qr-scanner');
    } else {
      setActiveTab(tab);
    }
  };

  const handleScanPress = () => {
    setOverlayScreen('qr-scanner');
  };

  const handleScanClose = () => {
    setOverlayScreen(null);
  };

  const handleQRScannerBack = () => {
    setOverlayScreen(null);
  };

  const handleTripFound = async (tripId: string, tripCode: string) => {
    try {
      setOverlayScreen(null);
      setSelectedTripId(tripId);
      setActiveTab(FactoryTab.LOGISTICS);
    } catch (error: any) {
      console.error('Error handling trip found:', error);
      Alert.alert('Lỗi', error?.message || 'Không thể mở thông tin chuyến đi');
    }
  };

  const handleBarcodeFound = async (barcode: string) => {
    try {
      setOverlayScreen(null);
      
      if (!selectedFactory?.id) {
        Alert.alert('Lỗi', 'Vui lòng chọn xưởng trước');
        return;
      }
    
      
      // Search for tracking item by barcode and current store (factory)
      const trackingResponse = await logisticService.searchTrackingItems(
        {
          barcode: barcode,
          current_store_id: selectedFactory.id,
        },
        { page: 0, size: 1 }
      );
      
      if (!trackingResponse?.data || trackingResponse.data.length === 0) {
        Alert.alert('Không tìm thấy', `Không tìm thấy món đồ với mã: ${barcode} tại xưởng này`);
        return;
      }
      
      const trackingItem = trackingResponse.data[0];
      const orderId = trackingItem.order_id;
      
      if (!orderId) {
        Alert.alert('Lỗi', 'Món đồ chưa được gán vào đơn hàng');
        return;
      }
      
      // Get order information using order ID
      const orderResponse = await orderService.searchStoreOrders(
        {
          factory_id: selectedFactory.id,
          fetch_order_items: true,
          fetch_order_logs: true,
        },
        { page: 0, size: 100 }
      );
      
      if (!orderResponse?.data) {
        Alert.alert('Lỗi', 'Không thể tải thông tin đơn hàng');
        return;
      }
      
      // Find the specific order by ID
      const order = orderResponse.data.find((o: Order) => o.id === orderId);
      
      if (!order) {
        Alert.alert('Không tìm thấy', `Không tìm thấy đơn hàng với ID: ${orderId}`);
        return;
      }
      
      // Display order information
      Alert.alert(
        'Thông tin đơn hàng',
        `Mã đơn: ${order.code}\nTrạng thái: ${order.status}\nTổng tiền: ${order.final_total.toLocaleString('vi-VN')} đ\nGhi chú: ${order.note || 'Không có'}`,
        [
          {
            text: 'Đóng',
            style: 'cancel',
          },
          {
            text: 'Xem chi tiết',
            onPress: () => {
              console.log('Full order details:', order);
              // You can navigate to order detail screen or show more info
            },
          },
        ]
      );
      
    } catch (error: any) {
      console.error('Error handling barcode:', error);
      Alert.alert(
        'Lỗi',
        error.message || 'Không thể tìm thông tin đơn hàng. Vui lòng thử lại.'
      );
    }
  };

  const handleScanItem = () => {
    // Simulate scanning an item
    const mockId = 'ITEM-' + Math.floor(Math.random() * 9999);
    setSelectedItemId(mockId);
    setSelectedItemType('normal');
    setOverlayScreen('item-detail');
  };

  const handleScanBag = () => {
    // Simulate scanning a bag
    setOverlayScreen(null);
    Alert.alert('Thành công', 'Đã nhập kho 01 Bao hàng!');
  };

  const handleReceiveTrip = async (tripId: string, tripCode: string, sourceStoreId: string) => {
    try {
      // Fetch source store name
      const response = await storeService.getStoreProfile(sourceStoreId);
      const sourceStoreName = response?.data?.name || 'Chưa xác định';
      
      setReceiveTripData({
        tripId,
        tripCode,
        sourceStoreId,
        sourceStoreName,
      });
      setOverlayScreen('receive-items');
    } catch (error) {
      console.error('Failed to fetch store info:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin tiệm');
    }
  };

  const handleReceiveItemsBack = () => {
    setOverlayScreen(null);
    setReceiveTripData(null);
    // Refresh logistics screen when going back
    setLogisticsRefreshTrigger((prev) => prev + 1);
  };

  const handleReceiveItemsComplete = () => {
    setOverlayScreen(null);
    setReceiveTripData(null);
    fetchIncomingTripsCount(); // Refresh trip count after receiving items
    // Refresh logistics screen after receiving items
    setLogisticsRefreshTrigger((prev) => prev + 1);
    Alert.alert('Thành công', 'Đã hoàn thành nhận hàng!');
  };

  const handleItemPress = (trackingId: string, orderId: string, type: 'normal' | 'exception_wait' | 'return') => {
    setSelectedItemId(trackingId);
    setSelectedOrderId(orderId);
    setSelectedItemType(type);
    setOverlayScreen('item-detail');
  };

  const handleTripPressFromOrder = async (orderId: string, trackingId: string) => {
    try {
      if (!selectedFactory?.id) {
        Alert.alert('Lỗi', 'Vui lòng chọn xưởng trước');
        return;
      }

      // Search for trips that contain this tracking item
      // First, search inbound trips (trips coming to factory)
      const inboundTripsResponse = await logisticService.searchTrips(
        {
          destination_store_id: selectedFactory.id,
        },
        { page: 0, size: 1000 }
      );

      console.log("inboundTripsResponse", inboundTripsResponse);

      let foundTripId: string | null = null;

      // Check inbound trips
      if (inboundTripsResponse?.data && Array.isArray(inboundTripsResponse.data)) {
        for (const trip of inboundTripsResponse.data) {
          try {
            const tripDetails = await logisticService.getTripDetails(trip.id);
            console.log("tripDetails", tripDetails);
            if (tripDetails?.data?.logistic_trip_items) {
              const hasTrackingItem = tripDetails.data.logistic_trip_items.some(
                (item: any) => item.service_item_tracking_id === trackingId
              );
              if (hasTrackingItem) {
                foundTripId = trip.id;
                break;
              }
            }
          } catch (error) {
            console.error(`Failed to fetch trip details for ${trip.id}:`, error);
          }
        }
      }

      // If not found in inbound, search outbound trips (trips from factory)
      if (!foundTripId) {
        const outboundTripsResponse = await logisticService.searchTrips(
          {
            source_store_id: selectedFactory.id,
          },
          { page: 0, size: 1000 }
        );

        if (outboundTripsResponse?.data && Array.isArray(outboundTripsResponse.data)) {
          for (const trip of outboundTripsResponse.data) {
            try {
              const tripDetails = await logisticService.getTripDetails(trip.id);
              if (tripDetails?.data?.logistic_trip_items) {
                const hasTrackingItem = tripDetails.data.logistic_trip_items.some(
                  (item: any) => item.service_item_tracking_id === trackingId
                );
                if (hasTrackingItem) {
                  foundTripId = trip.id;
                  break;
                }
              }
            } catch (error) {
              console.error(`Failed to fetch trip details for ${trip.id}:`, error);
            }
          }
        }
      }

      if (foundTripId) {
        // Switch to logistics tab and set the trip to show
        setSelectedTripId(foundTripId);
        setActiveTab(FactoryTab.LOGISTICS);
      } else {
        Alert.alert('Thông báo', 'Không tìm thấy chuyến vận chuyển cho đơn hàng này');
      }
    } catch (error: any) {
      console.error('Error finding trip for order:', error);
      Alert.alert('Lỗi', error?.message || 'Không thể tìm thông tin chuyến vận chuyển');
    }
  };

  

  const handleItemDetailBack = async () => {
    setOverlayScreen(null);
    // Refresh orders when going back from item detail screen
    // This ensures dashboard shows updated data after batch operations, status changes, etc.
    await fetchOrders(0, true);
    // Trigger dashboard refresh to update batches and tracking items after orders are fetched
    setDashboardRefreshTrigger((prev) => prev + 1);
  };

  const handleUpdateStatus = (status: string) => {
    Alert.alert('Cập nhật', `Trạng thái: ${status}`, [
      {
        text: 'OK',
        onPress: () => {
          setOverlayScreen(null);
        },
      },
    ]);
  };

  const handleReportIssue = () => {
    setOverlayScreen('report-issue');
  };

  const handleReportIssueClose = () => {
    setOverlayScreen('item-detail');
  };

  const handleReportIssueSubmit = (errorType: string) => {
    Alert.alert('Thành công', `Đã gửi báo cáo lỗi: ${errorType}`, [
      {
        text: 'OK',
        onPress: () => {
          setOverlayScreen(null);
        },
      },
    ]);
  };

  const handleManageAccount = () => {
    setOverlayScreen('staff-list');
  };

  const handleBackFromStaffRegistration = () => {
    setOverlayScreen('staff-list');
  };

  const handleBackFromListStaff = () => {
    setOverlayScreen(null);
  };

  const handleManageFactories = () => {
    setOverlayScreen('manage-factories');
  };

  const handleOrderPress = async (order: any) => {
    if (!selectedFactory?.id || !order?.id) {
      Alert.alert('Lỗi', 'Thông tin không đầy đủ');
      return;
    }

    try {
      // Search for tracking items at the factory that belong to this order
      const trackingResponse = await logisticService.searchTrackingItems(
        {
          current_store_id: selectedFactory.id,
        },
        { page: 0, size: 1000 }
      );

      if (trackingResponse?.data && Array.isArray(trackingResponse.data)) {
        // Find the first tracking item that matches this order
        const trackingItem = trackingResponse.data.find(
          (item: any) => item.order_id === order.id
        );

        if (trackingItem?.id) {
          setSelectedItemId(trackingItem.id);
          setSelectedOrderId(order.id);
          setSelectedItemType('normal');
          setOverlayScreen('item-detail');
        } else {
          Alert.alert('Không tìm thấy', 'Không tìm thấy món đồ cho đơn hàng này');
        }
      } else {
        Alert.alert('Lỗi', 'Không thể tải thông tin món đồ');
      }
    } catch (error: any) {
      console.error('Error handling order press:', error);
      Alert.alert('Lỗi', error?.message || 'Không thể tải thông tin đơn hàng');
    }
  };

  const handleOrderFound = (order: Order) => {
    handleOrderPress(order);
  }

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        onPress: async () => {
          try {
            // Unregister device token before clearing tokens
            try {
              const roles = getGlobalUserRole();
              const isStaff = roles && Array.isArray(roles) 
                ? roles.some(role => role.toLowerCase().includes('staff') || role === 'STAFF' || role === 'ROLE_STAFF')
                : false;
              
              if (isStaff) {
                await fcmService.staffUnregisterDeviceToken();
              } else {
                await fcmService.unregisterDeviceToken();
              }
            } catch (error) {
              console.error('Error unregistering device token:', error);
              // Continue with logout even if unregister fails
            }

            // Clear tokens
            await SecureStore.deleteItemAsync(SecureStoreKeys.LOGIN_TOKEN);
            await SecureStore.deleteItemAsync(SecureStoreKeys.REFRESH_TOKEN);
            
            // Clear "Remember Me" settings
            await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_ENABLED);
            await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_EMAIL);
            await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_PASSWORD);
            await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_ROLE);
            
            // Clear global user role
            clearGlobalUserRole();
            
            // Reset orientation to portrait on logout
            await resetOrientationToPortrait();
            
            router.replace('/login');
          } catch (error) {
            console.error('Error during logout:', error);
            // Still navigate to login even if clearing fails
            router.replace('/login');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case FactoryTab.DASHBOARD:
        return (
          <FactoryDashboardScreen
            orders={orders}
            factoryId={selectedFactory?.id}
            onScanPress={handleScanPress}
            onItemPress={handleItemPress}
            onTripPress={handleTripPressFromOrder}
            onLoadMore={fetchNextPage}
            onRefresh={handleRefreshOrders}
            loadingMore={loadingMoreOrders}
            hasMore={hasMoreOrders}
            loading={loadingOrders}
            refreshing={refreshingOrders}
            refreshTrigger={dashboardRefreshTrigger}
          />
        );
      case FactoryTab.LOGISTICS:
        return (
          <FactoryLogisticsScreen
            factoryId={selectedFactory?.id}
            onScanPress={handleScanPress}
            onReceiveTrip={handleReceiveTrip}
            initialTripId={selectedTripId}
            onTripShown={() => setSelectedTripId(null)}
            onOrderPress={handleOrderPress}
            refreshTrigger={logisticsRefreshTrigger}
          />
        );
      case FactoryTab.PROFILE:
        return (
          <FactoryProfileScreen
            factoryId={selectedFactory?.id}
            itemsProcessed={45}
            onTimePercentage={100}
            onLogout={handleLogout}
            onChangePassword={() => setOverlayScreen('change-password')}
          />
        );
      default:
        return (
          <FactoryDashboardScreen
            onScanPress={handleScanPress}
            onItemPress={handleItemPress}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <FactoryHeader
        factoryName={selectedFactory?.name || 'Chọn xưởng'}
        onFactoryPress={handleFactorySelect}
        onNotificationPress={handleNotification}
        onProfilePress={() => setActiveTab(FactoryTab.PROFILE)}
        onManageAccountPress={handleManageAccount}
        hasNotification={true}
        showManageAccount={isAdmin()}
        incomingTripsCount={incomingTripsCount}
        onManageFactoryPress={handleManageFactories}
        showManageFactoryButton={isSuperAdmin()}
      />

      <FactorySelectorModal
        visible={showFactorySelector}
        factories={factories}
        selectedFactoryId={selectedFactory?.id || null}
        onSelect={handleFactoryChange}
        onClose={() => setShowFactorySelector(false)}
      />

      <View style={styles.content}>
        {/* Active Screen */}
        {renderActiveScreen()}

        {/* Bottom Navigation */}
        <FactoryBottomNav 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          incomingTripsCount={incomingTripsCount}
        />
      </View>

      {/* Overlay Screens - Full Screen */}
      {overlayScreen === 'qr-scanner' && selectedFactory && (
        <View style={styles.overlayContainer}>
          <FactoryQRScannerScreen
            factoryId={selectedFactory.id}
            onBack={handleQRScannerBack}
            onOrderFound={handleOrderFound}
            onBarcodeFound={handleBarcodeFound}
            onTripFound={handleTripFound}
          />
        </View>
      )}

      {overlayScreen === 'scan' && (
        <View style={styles.overlayContainer}>
          <FactoryScanScreen
            onClose={handleScanClose}
            onScanItem={handleScanItem}
            onScanBag={handleScanBag}
          />
        </View>
      )}

      {overlayScreen === 'receive-items' && receiveTripData && selectedFactory && (
        <View style={styles.overlayContainer}>
          <FactoryReceiveItemsScreen
            tripId={receiveTripData.tripId}
            tripCode={receiveTripData.tripCode}
            sourceStoreName={receiveTripData.sourceStoreName}
            factoryId={selectedFactory.id}
            onBack={handleReceiveItemsBack}
            onComplete={handleReceiveItemsComplete}
          />
        </View>
      )}

      {overlayScreen === 'item-detail' && (
        <View style={styles.overlayContainer}>
          <FactoryItemDetailScreen
            itemId={selectedItemId}
            orderId={selectedOrderId}
            type={selectedItemType}
            factoryId={selectedFactory?.id}
            onBack={handleItemDetailBack}
            onUpdateStatus={handleUpdateStatus}
            onReportIssue={handleReportIssue}
            onBatchUpdate={async () => {
              // Refresh orders when batch is created or updated
              await fetchOrders(0, true);
              // Trigger dashboard refresh to update batches after orders are fetched
              setDashboardRefreshTrigger((prev) => prev + 1);
            }}
          />
        </View>
      )}

      {overlayScreen === 'report-issue' && (
        <View style={styles.overlayContainer}>
          <FactoryReportIssueScreen
            onClose={handleReportIssueClose}
            onSubmit={handleReportIssueSubmit}
          />
        </View>
      )}

      {overlayScreen === 'staff-list' && selectedFactory && (
        <View style={styles.overlayContainer}>
          <StaffListScreen
            storeId={selectedFactory.id}
            onBack={handleBackFromListStaff}
            onAddStaffClick={() => setOverlayScreen('staff-registration')}
          />
        </View>
      )}

      {overlayScreen === 'staff-registration' && selectedFactory && (
        <View style={styles.overlayContainer}>
          <StaffRegistrationScreen
            storeId={selectedFactory.id}
            onBack={handleBackFromStaffRegistration}
            onSuccess={handleBackFromStaffRegistration}
          />
        </View>
      )}

      {overlayScreen === 'manage-factories' && (
        <View style={styles.overlayContainer}>
          <StoreManagementScreen
            title="Quản lý xưởng"
            storeType={StoreType.FACTORY}
            onClose={() => setOverlayScreen(null)}
            onStoresChanged={fetchFactories}
          />
        </View>
      )}

      {overlayScreen === 'change-password' && (
        <View style={styles.overlayContainer}>
          <ChangePasswordScreen onBack={() => setOverlayScreen(null)} />
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 80,
    paddingBottom: 76,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: '#F9FAFB',
  },
});
