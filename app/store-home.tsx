import { ChangePasswordScreen } from "@/components/auth";
import { PromotionScreen } from "@/components/factory-screens";
import { isOnlyGoodsOrder } from "@/components/orders";
import {
  AddInventoryScreen,
  CustomerDetailScreen,
  CustomerListScreen,
  InventoryScreen,
  LogisticsScreen,
  OrdersScreen,
  ProcessDetailScreen,
  QRScannerScreen,
  ReportScreen,
  StaffListScreen,
  StaffOrderScreen,
  StaffRegistrationScreen,
  StoreManagementScreen,
  StoreProfileScreen,
} from "@/components/screens/store";
import {
  StoreBottomNav,
  StoreHeader,
  StoreSelectorModal,
  StoreWebNavBar,
} from "@/components/store";
import {
  GoodsOrderItemStatus,
  OrderStatus,
  PackageProductStatus,
  ProductStatus,
  ProductType,
  ServiceOrderItemStatus,
  StoreTabType,
  StoreType,
} from "@/constants/enum";
import { compatAlert } from "@/lib/compatAlert";
import { ensureSessionFromStoredTokens } from "@/lib/sessionHydrate";
import { getLastSelectedStoreId, saveLastSelectedStoreId } from "@/lib/storeSelection";
import { staffService } from "@/services/api";
import { adminService } from "@/services/api/adminService";
import { categoryService } from "@/services/api/categoryService";
import { logisticService } from "@/services/api/logisticService";
import { Order } from "@/services/api/orderService";
import { packageService } from "@/services/api/packageProductService";
import { productService } from "@/services/api/productService";
import { StoreListItem, storeService } from "@/services/api/storeService";
import { isAdmin, isSuperAdmin } from "@/utils/globalState";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

type ScreenType =
  | "orders"
  | "inventory"
  | "logistics"
  | "report"
  | "profile"
  | "process-detail"
  | "add-inventory"
  | "staff-registration"
  | "staff-list"
  | "qr-scan"
  | "promotion"
  | "manage-stores"
  | "customer-list"
  | "customer-detail"
  | "create-order"
  | "staff-order"
  | "change-password";

export default function StoreHomeScreen() {
  const [activeTab, setActiveTab] = useState<StoreTabType>(StoreTabType.ORDERS);
  const [activeScreen, setActiveScreen] = useState<ScreenType>("orders");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreListItem | null>(
    null
  );
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editingPackage, setEditingPackage] = useState<any | null>(null);
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  /** Side panel width (process detail + inventory editor share this). */
  const sidePanelW = Math.min(560, Math.max(300, Math.floor(windowWidth * 0.44)));
  /** Animated width for inventory add/edit panel (smooth resize of main + panel). */
  const inventoryPanelAnimW = useRef(new Animated.Value(0)).current;

  const goToOrdersHome = useCallback(() => {
    setActiveScreen("orders");
    setActiveTab(StoreTabType.ORDERS);
    setOrdersRefreshKey((prev) => prev + 1);
  }, []);

  const handleBackToOrders = goToOrdersHome;

  const handleCloseInventoryEditor = useCallback(() => {
    inventoryPanelAnimW.stopAnimation();
    Animated.timing(inventoryPanelAnimW, {
      toValue: 0,
      duration: 280,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setEditingProduct(null);
        setEditingPackage(null);
        setActiveScreen("inventory");
        setActiveTab(StoreTabType.INVENTORY);
      }
    });
  }, [inventoryPanelAnimW]);

  const handleBackToInventory = handleCloseInventoryEditor;

  useLayoutEffect(() => {
    if (activeScreen !== "add-inventory") {
      return;
    }
    inventoryPanelAnimW.stopAnimation();
    inventoryPanelAnimW.setValue(0);
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      Animated.timing(inventoryPanelAnimW, {
        toValue: sidePanelW,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [activeScreen, editingProduct?.id, editingPackage?.id, inventoryPanelAnimW, sidePanelW]);

  useEffect(() => {
    categoryService
      .getAll(0, 100)
      .then((res: any) => {
        setCategories(res.data);
      })
      .catch((err) => {
        console.log(err);
      });

    fetchStores();
  }, []);

  // Handle Android back button (not available on web)
  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      // Handle navigation based on current screen
      if (activeScreen === "process-detail") {
        handleBackToOrders();
        return true; // Prevent default behavior
      }

      if (activeScreen === "qr-scan") {
        handleBackToOrders();
        return true;
      }

      if (activeScreen === "add-inventory") {
        handleBackToInventory();
        return true;
      }

      if (activeScreen === "staff-registration") {
        handleBackFromStaffRegistration();
        return true;
      }

      if (activeScreen === "staff-list") {
        handleBackFromListStaff();
        return true;
      }

      if (activeScreen === "promotion") {
        handlePromotionBack();
        return true;
      }

      if (activeScreen === "customer-list") {
        handleBackFromCustomerList();
        return true;
      }

      if (activeScreen === "customer-detail") {
        handleBackFromCustomerDetail();
        return true;
      }

      if (activeScreen === "staff-order") {
        handleBackFromStaffOrder();
        return true;
      }

      if (activeScreen === "change-password") {
        handleBackFromChangePassword();
        return true;
      }

      // If on a main tab (orders, inventory, logistics, report, profile)
      // Prevent app from quitting
      if (
        activeScreen === StoreTabType.ORDERS ||
        activeScreen === StoreTabType.INVENTORY ||
        activeScreen === StoreTabType.LOGISTICS ||
        activeScreen === StoreTabType.REPORT ||
        activeScreen === StoreTabType.PROFILE
      ) {
        return true; // Prevent default behavior (don't quit app)
      }

      return false; // Allow default behavior
    });

    return () => backHandler.remove();
  }, [activeScreen, handleBackToOrders, handleCloseInventoryEditor]);

  const fetchStores = async () => {
    try {
      await ensureSessionFromStoredTokens();
      let response;
      if (isSuperAdmin()) {
        response = await storeService.searchStore(
          { deleted: false, type: StoreType.HUB },
          { page: 0, size: 1000 }
        );
      }
      else if (isAdmin()) {
        const adminProfile = await adminService.getAdminProfile();
        const storeId = adminProfile?.data?.store_id;
        if (!storeId) {
          setStores([]);
          setSelectedStore(null);
          return;
        }

        const storeProfile = await storeService.getStoreProfile(storeId);
        if (!storeProfile?.data) {
          setStores([]);
          setSelectedStore(null);
          return;
        }

        response = { data: [storeProfile.data] };
      }
      else {
        response = await staffService.getAllStores();
      }

      if (response?.data && response.data.length > 0) {
        setStores(response.data);

        // Try to load last selected store ID
        const lastSelectedStoreId = await getLastSelectedStoreId();
        if (lastSelectedStoreId) {
          const lastStore = response.data.find((store: StoreListItem) => store.id === lastSelectedStoreId);
          if (lastStore) {
            setSelectedStore(lastStore);
            return;
          }
        }

        // Default select first store if no last selected store found
        const firstStore = response.data[0];
        setSelectedStore(firstStore);
        // Save the first store as last selected
        await saveLastSelectedStoreId(firstStore.id);
      }
    } catch (error) {
      console.error("Failed to fetch stores:", error);
    }
  };

  const handleTabChange = (tab: StoreTabType) => {
    setActiveTab(tab);
    setActiveScreen(tab);
    setEditingProduct(null);
    setEditingPackage(null);
  };

  const handleOrderPress = (order: Order) => {
    setSelectedOrder(order);
    setActiveScreen("process-detail");
  };

  const handleAddInventory = () => {
    setEditingProduct(null);
    setEditingPackage(null);
    setActiveTab(StoreTabType.INVENTORY);
    setActiveScreen("add-inventory");
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setEditingPackage(null);
    setActiveTab(StoreTabType.INVENTORY);
    setActiveScreen("add-inventory");
  };

  const handleEditPackage = (pkg: any) => {
    setEditingPackage(pkg);
    setEditingProduct(null);
    setActiveTab(StoreTabType.INVENTORY);
    setActiveScreen("add-inventory");
  };

  const handleDeleteInventory = async (nextActive: boolean) => {
    const productId = editingProduct?.id;
    const packageId = editingPackage?.id;
    if (!productId && !packageId) {
      throw new Error("Không tìm thấy mặt hàng");
    }
    if (productId) {
      await productService.updateProduct(productId, {
        status: nextActive ? ProductStatus.ACTIVE : ProductStatus.INACTIVE,
      });
    } else if (packageId) {
      await packageService.updatePackage(packageId, {
        status: nextActive ? PackageProductStatus.ACTIVE : PackageProductStatus.INACTIVE,
      });
    }
    compatAlert(
      "Thành công",
      nextActive ? "Đã kích hoạt mặt hàng." : "Đã ngưng hoạt động mặt hàng."
    );
    handleBackToInventory();
  };

  const handleQRScan = () => {
    setActiveScreen("qr-scan");
  };

  const handleStoreSelect = () => {
    setShowStoreSelector(true);
  };

  const handleStoreChange = async (store: StoreListItem) => {
    setSelectedStore(store);
    // Save the selected store ID for next login
    await saveLastSelectedStoreId(store.id);
  };

  const handleNotification = () => {
    compatAlert("Thông báo", "Xem tất cả thông báo");
  };

  const handlePrint = () => {
    compatAlert("In", "Chức năng in ấn");
  };

  const handleProfilePress = () => {
    setActiveScreen(StoreTabType.PROFILE);
    setActiveTab(StoreTabType.PROFILE);
  };

  const handleManageAccount = () => {
    setActiveScreen("staff-list");
  };

  const handleBackFromStaffRegistration = () => {
    setActiveScreen("staff-list");
    setActiveTab(StoreTabType.ORDERS);
  };

  const handleBackFromListStaff = () => {
    setActiveScreen(activeTab);
  };

  const handlePromotionPress = () => {
    setActiveScreen("promotion");
  };

  const handlePromotionBack = () => {
    setActiveScreen(activeTab);
  };

  const handlePromotionSuccess = () => {
    compatAlert("Thành công", "Đã tạo khuyến mãi thành công");
  };

  const handleOrderFound = (order: Order) => {
    setSelectedOrder(order);
    setActiveScreen("process-detail");
  };

  const handleManageStoresPress = () => {
    setActiveScreen("manage-stores");
  };

  const handleCustomerListPress = () => {
    setActiveScreen("customer-list");
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setActiveScreen("customer-detail");
  };

  const handleBackFromCustomerDetail = () => {
    setActiveScreen("customer-list");
  };

  const handleBackFromCustomerList = () => {
    setActiveScreen("profile");
    setActiveTab(StoreTabType.PROFILE);
  };

  const handleStaffOrderPress = () => {
    setActiveScreen("staff-order");
  };

  const handleBackFromStaffOrder = () => {
    setActiveScreen(activeTab);
  };

  const handleChangePasswordPress = () => {
    setActiveScreen("change-password");
  };

  const handleBackFromChangePassword = () => {
    setActiveScreen(StoreTabType.PROFILE);
    setActiveTab(StoreTabType.PROFILE);
  };

  const handleCreateBatchShipment = async (orderIds: string[]) => {
    if (!selectedStore?.id) {
      compatAlert("Lỗi", "Vui lòng chọn cửa hàng");
      return;
    }

    // Generate barcode: prefix + yyyymmddhhmmss
    const now = new Date();
    const prefix = "BATCH";
    const barcode = `${prefix}${now.getFullYear()}${String(
      now.getMonth() + 1
    ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(
      now.getHours()
    ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
      now.getSeconds()
    ).padStart(2, "0")}`;

    try {
      console.log(
        orderIds.map((orderId) => ({
          barcode: barcode,
          order_id: orderId,
          current_store_id: selectedStore.id,
        }))
      );
      const response = await logisticService.createTrackingItemBatch(
        orderIds.map((orderId) => ({
          barcode: barcode,
          order_id: orderId,
          current_store_id: selectedStore.id,
        }))
      );
      console.log("Batch shipment created:", response);

      // Delay alert to allow UI to update first
      setTimeout(() => {
        compatAlert(
          "Thành công",
          `Đã tạo lô vận chuyển cho ${orderIds.length} đơn hàng`
        );
      }, 300);
    } catch (error) {
      console.error("Failed to create batch shipment:", error);
      compatAlert("Lỗi", "Không thể tạo lô vận chuyển. Vui lòng thử lại.");
    }
  };

  // Check if order is in waiting_return state
  const isOrderWaitingReturn = (order: Order): boolean => {
    if (!order.order_items) return false;

    // Check if order is CANCELLED
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.CUSTOMER_REJECTED || order.status === OrderStatus.CUSTOMER_INCIDENTS_REJECTED) {
      return order.order_items.some((item: any) => item.product_type === ProductType.SERVICE);
    }

    // For PROCESSING orders: check if goods-only with CREATED items
    if (order.status === OrderStatus.PROCESSING) {
      if (isOnlyGoodsOrder(order)) {
        const hasCreatedGoodsItems = order.order_items.some(
          (item: any) => item.goods_status === GoodsOrderItemStatus.CREATED
        );
        return hasCreatedGoodsItems;
      }
    }

    // Check if all service items have DELIVERING status
    const serviceItems = order.order_items.filter((item: any) => item.product_type === ProductType.SERVICE);
    if (serviceItems.length === 0) return false;

    return serviceItems.every((item: any) => item.service_status === ServiceOrderItemStatus.DELIVERING);
  };

  // Handle full-screen overlays that replace the main content
  if (activeScreen === "qr-scan") {
    return (
      <View style={styles.container}>
        <QRScannerScreen
          storeId={selectedStore?.id ?? ""}
          onBack={handleBackToOrders}
          onOrderFound={handleOrderFound}
        />
      </View>
    );
  }

  if (activeScreen === "staff-registration") {
    return (
      <View style={styles.container}>
        <StaffRegistrationScreen
          storeId={selectedStore?.id ?? ""}
          onBack={handleBackFromStaffRegistration}
          onSuccess={handleBackFromStaffRegistration}
        />
      </View>
    );
  }

  if (activeScreen === "manage-stores") {
    return (
      <View style={styles.container}>
        <StoreManagementScreen
          title="Quản lý cửa hàng"
          storeType={StoreType.HUB}
          onClose={handleBackToOrders}
          onStoresChanged={fetchStores}
        />
      </View>
    );
  }

  if (activeScreen === "customer-list") {
    return (
      <View style={styles.container}>
        <CustomerListScreen
          storeId={selectedStore?.id ?? ""}
          onBack={handleBackFromCustomerList}
          onSelectCustomer={handleCustomerSelect}
        />
      </View>
    );
  }

  if (activeScreen === "customer-detail" && selectedCustomer) {
    return (
      <View style={styles.container}>
        <CustomerDetailScreen
          customer={selectedCustomer}
          storeId={selectedStore?.id ?? ""}
          onBack={handleBackFromCustomerDetail}
        />
      </View>
    );
  }

  if (activeScreen === "change-password") {
    return (
      <View style={styles.container}>
        <ChangePasswordScreen
          onBack={handleBackFromChangePassword}
          alsoSyncStaffOrderPassword
        />
      </View>
    );
  }

  const isWaitingReturn = selectedOrder ? isOrderWaitingReturn(selectedOrder) : false;

  const dialogMaxHeight = Math.min(720, Math.floor(windowHeight * 0.88));
  const createOrderDialogMaxWidth = Math.min(720, Math.max(320, windowWidth - 32));

  return (
    <View style={styles.container}>
      <StoreHeader
        storeName={selectedStore?.name || "Chọn cửa hàng"}
        onStorePress={handleStoreSelect}
        onNotificationPress={handleNotification}
        onPrintPress={handlePrint}
        onProfilePress={handleProfilePress}
        onManageAccountPress={handleManageAccount}
        onPromotionPress={handlePromotionPress}
        showManageAccount={isAdmin()}
        showPromotionButton={isAdmin()}
        onManageStorePress={handleManageStoresPress}
        showManageStoreButton={isSuperAdmin()}
        hasNotification={true}
      />

      <StoreSelectorModal
        visible={showStoreSelector}
        stores={stores}
        selectedStoreId={selectedStore?.id || null}
        onSelect={handleStoreChange}
        onClose={() => setShowStoreSelector(false)}
      />

      <View style={styles.mainSplit}>
        <View style={styles.mainSplitPrimary}>
          {(activeTab === StoreTabType.ORDERS || activeScreen === "process-detail") && (
            <OrdersScreen
              storeId={selectedStore?.id}
              onOrderPress={handleOrderPress}
              onQRScan={handleQRScan}
              onCreateBatchShipment={handleCreateBatchShipment}
              refreshKey={ordersRefreshKey}
            />
          )}

          {(activeTab === StoreTabType.INVENTORY ||
            activeScreen === "add-inventory") && (
            <InventoryScreen
              onAddItem={handleAddInventory}
              onEditProduct={handleEditProduct}
              onEditPackage={handleEditPackage}
              storeId={selectedStore?.id}
            />
          )}

          {activeTab === StoreTabType.LOGISTICS && (
            <LogisticsScreen
              storeId={selectedStore?.id}
              onOrderPress={handleOrderPress}
            />
          )}

          {activeTab === StoreTabType.REPORT && <ReportScreen storeId={selectedStore?.id} />}

          {activeTab === StoreTabType.PROFILE && (
            <StoreProfileScreen
              storeId={selectedStore?.id}
              onCustomerList={handleCustomerListPress}
              onChangePassword={handleChangePasswordPress}
            />
          )}
        </View>

        {activeScreen === "process-detail" && selectedOrder && (
          <View style={[styles.processDetailColumn, { width: sidePanelW }]}>
            <ProcessDetailScreen
              key={selectedOrder.id}
              order={selectedOrder}
              storeId={selectedStore?.id ?? ""}
              onBack={handleBackToOrders}
              isWaitingReturn={isWaitingReturn}
            />
          </View>
        )}

        {activeScreen === "add-inventory" && (
          <Animated.View
            style={[
              styles.processDetailColumn,
              {
                width: inventoryPanelAnimW,
                overflow: "hidden",
              },
            ]}
          >
            <View style={{ width: sidePanelW, flex: 1 }}>
              <AddInventoryScreen
                key={editingProduct?.id ?? editingPackage?.id ?? "new"}
                onBack={handleBackToInventory}
                onDelete={
                  editingProduct || editingPackage ? handleDeleteInventory : undefined
                }
                categories={categories}
                storeId={selectedStore?.id}
                productItem={editingProduct}
                packageItem={editingPackage}
              />
            </View>
          </Animated.View>
        )}
      </View>

      {/* Staff list — centered dialog (not full-screen) */}
      <Modal
        visible={activeScreen === "staff-list"}
        transparent
        animationType="fade"
        onRequestClose={handleBackFromListStaff}
      >
        <View style={styles.dialogRoot}>
          <Pressable
            style={styles.dialogBackdrop}
            onPress={handleBackFromListStaff}
            accessibilityRole="button"
            accessibilityLabel="Đóng"
          />
          <View style={styles.dialogCenter} pointerEvents="box-none">
            <View style={[styles.dialogPanel, { height: dialogMaxHeight }]}>
              <StaffListScreen
                embedded
                storeId={selectedStore?.id ?? ""}
                onBack={handleBackFromListStaff}
                onAddStaffClick={() => setActiveScreen("staff-registration")}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Promotion list — centered dialog */}
      <Modal
        visible={activeScreen === "promotion"}
        transparent
        animationType="fade"
        onRequestClose={handlePromotionBack}
      >
        <View style={styles.dialogRoot}>
          <Pressable
            style={styles.dialogBackdrop}
            onPress={handlePromotionBack}
            accessibilityRole="button"
            accessibilityLabel="Đóng"
          />
          <View style={styles.dialogCenter} pointerEvents="box-none">
            <View style={[styles.dialogPanel, { height: dialogMaxHeight }]}>
              <PromotionScreen embedded onBack={handlePromotionBack} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Tạo đơn — centered dialog (same pattern as staff list / promotions) */}
      <Modal
        visible={activeScreen === "staff-order"}
        transparent
        animationType="fade"
        onRequestClose={handleBackFromStaffOrder}
      >
        <View style={styles.dialogRoot}>
          <Pressable
            style={styles.dialogBackdrop}
            onPress={handleBackFromStaffOrder}
            accessibilityRole="button"
            accessibilityLabel="Đóng"
          />
          <View style={styles.dialogCenter} pointerEvents="box-none">
            <View
              style={[
                styles.dialogPanel,
                { height: dialogMaxHeight, maxWidth: createOrderDialogMaxWidth },
              ]}
            >
              <StaffOrderScreen
                embedded
                storeId={selectedStore?.id ?? ""}
                onBack={handleBackFromStaffOrder}
              />
            </View>
          </View>
        </View>
      </Modal>

      <StoreWebNavBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onCreateOrderPress={handleStaffOrderPress}
      />

      {Platform.OS !== "web" && (
      <StoreBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onCreateOrderPress={handleStaffOrderPress}
      />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    ...Platform.select({
      web: {
        width: "100%",
        alignSelf: "stretch",
        minHeight: "100%",
      },
      default: {},
    }),
  },
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#F9FAFB",
    zIndex: 1000,
  },
  dialogRoot: {
    flex: 1,
  },
  dialogBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  dialogCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  dialogPanel: {
    width: "100%",
    maxWidth: 560,
    flexShrink: 0,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
    ...Platform.select({
      web: {
        boxShadow: "0 18px 48px rgba(0,0,0,0.2)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 16,
      },
    }),
  },
  mainSplit: {
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
    minHeight: 0,
  },
  mainSplitPrimary: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  processDetailColumn: {
    flexShrink: 0,
    minHeight: 0,
    borderLeftWidth: 1,
    borderLeftColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    overflow: "hidden",
    ...Platform.select({
      web: {
        boxShadow: "-4px 0 20px rgba(0,0,0,0.08)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: -3, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 12,
      },
    }),
  },
});
