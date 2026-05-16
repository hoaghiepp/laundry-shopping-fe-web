import { BottomNav } from "@/components/home/BottomNav";
import { BusinessFooter } from "@/components/home/BusinessFooter";
import { HomeHeader } from "@/components/home/HomeHeader";
import { ProductCard } from "@/components/home/ProductCard";
import { PromotionBanner } from "@/components/home/PromotionBanner";
import { ServiceButton } from "@/components/home/ServiceButton";
import { WalletCard } from "@/components/home/WalletCard";
import {
  AllOffersScreen,
  AllProductsScreen,
  AllServicesScreen,
  CartScreen,
  LaundryServiceScreen,
  OrderDetail,
  OrderDetailScreen,
  OrderListScreen,
  OrderSuccessScreen,
  ProductDetailScreen,
  ProfileScreen,
  StoreLocatorScreen,
  TransactionHistoryScreen,
  WalletScreen,
} from "@/components/screens";
import { QrPaymentWebView } from "@/components/screens/shared/QrPaymentWebView";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import {
  CustomerPackageStatus,
  DeliveryOptions,
  PickupMethod,
  ProductStatus,
  ProductType,
  PromotionStatus,
  ScreenType,
  SecureStoreKeys,
  StoreType
} from "@/constants/enum";
import { ProductItem } from "@/models/model";
import { authService, productService } from "@/services/api";
import { cartService } from "@/services/api/cartService";
import {
  customerAddressService,
  CustomerProfile,
  customerService,
} from "@/services/api/customerService";
import { fcmService } from "@/services/api/fcmService";
import { Order, OrderCheckoutReq, orderService } from "@/services/api/orderService";
import { packageService } from "@/services/api/packageProductService";
import { promotionService } from "@/services/api/promotionService";
import { storeService } from "@/services/api/storeService";
import { cacheManager } from "@/services/cache";
import { formatCurrencyVND } from "@/utils/format";
import { clearGlobalUserRole, getGlobalUserRole } from "@/utils/globalState";
import { resetOrientationToPortrait } from "@/utils/orientation";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { router } from "expo-router";
import * as SecureStore from "@/lib/secureStorage";
import React, { useEffect, useRef, useState } from "react";
import { Alert, BackHandler, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

// type ScreenType = 'home' | 'all-offers' | 'all-services' | 'all-products' | 'stores' | 'profile' | 'wallet' | 'cart' | 'orders' | 'order-detail' | 'order-success';
const Stack = createNativeStackNavigator();

export default function HomeScreen() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>(ScreenType.HOME);
  const [activeTab, setActiveTab] = useState("home");
  const [selectedService, setSelectedService] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
  const [customerLocation, setCustomerLocation] = useState<string>("");

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [productsPage, setProductsPage] = useState(0);
  const [services, setServices] = useState<ProductItem[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const SERVICES_PAGE_SIZE = 20;
  const PACKAGES_PAGE_SIZE = 10;
  const servicesPageRef = useRef(0);
  const [servicesHasMore, setServicesHasMore] = useState(true);
  const [servicesLoadingMore, setServicesLoadingMore] = useState(false);
  const packagesPageRef = useRef(0);
  const [packagesHasMore, setPackagesHasMore] = useState(true);
  const [packagesLoadingMore, setPackagesLoadingMore] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [isUpdatingCart, setIsUpdatingCart] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [savedPromotionCodes, setSavedPromotionCodes] = useState<Set<string>>(new Set());
  const [storeCount, setStoreCount] = useState<number>(0);
  const [packageRemaining, setPackageRemaining] = useState<number>(0);
  const [allServicesInitialTab, setAllServicesInitialTab] = useState<'goods' | 'services' | 'packages' | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const previousScreenRef = useRef<ScreenType>(ScreenType.HOME);
  const previousScreenBeforeOrderDetailRef = useRef<ScreenType | null>(null);

  const handleLogout = async () => {
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
        console.error("Error unregistering device token:", error);
        // Continue with logout even if unregister fails
      }

      // Clear tokens
      await authService.logout();

      // Clear "Remember Me" settings
      await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_ENABLED);
      await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_EMAIL);
      await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_PASSWORD);
      await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_ROLE);

      // Clear customer profile
      await SecureStore.deleteItemAsync(SecureStoreKeys.CUSTOMER_PROFILE);

      // Clear global user role
      clearGlobalUserRole();

      // Reset orientation to portrait on logout
      await resetOrientationToPortrait();

      router.replace("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      // Still navigate to login even if clearing fails
      router.replace("/login");
    }
  };

  const updateCartItem = async (id: string, qty: number): Promise<any> => {
    setIsUpdatingCart(true);
    try {
      const res = await cartService.updateCartItem(id, qty);
      return res;
    } catch (error) {
      console.error("Error updating cart item:", error);
      throw error;
    } finally {
      setIsUpdatingCart(false);
    }
  };

  const removeItemFromCart = async (id: string): Promise<any> => {
    try {
      const res = await cartService.removeItemFromCart(id);
      Alert.alert("Thành công", `Đã xóa sản phẩm khỏi giỏ hàng`);
    } catch (error) {
      Alert.alert("Thất bại", `Xóa sản phẩm khỏi giỏ hàng thất bại`);
    }
  };

  const handleCheckout = async (
    selectedAddress: {
      id: string;
      address_detail: string;
      ward: string;
      ward_id: number;
      district: string;
      district_id: number;
      province: string;
      province_id: number;
      fullAddress: string;
      phone_number: string;
      full_name: string;
    } | null,
    walletAmount: number,
    deliveryOption: DeliveryOptions,
    pickupMethod: PickupMethod,
    storeId: string,
    storeItems: any[],
    promotionId?: string
  ): Promise<void> => {
    try {
      console.log("Checkout called with:", {
        deliveryOption,
        storeId,
        storeItemsCount: storeItems.length,
      });

      if (!selectedAddress) {
        Alert.alert("Lỗi", "Vui lòng chọn địa chỉ giao hàng");
        return;
      }

      // Use the store items passed from the cart screen
      const cartItems = storeItems;

      if (cartItems.length === 0) {
        Alert.alert(
          "Lỗi",
          "Không có sản phẩm nào trong giỏ hàng của cửa hàng này"
        );
        return;
      }

      console.log("Cart items for checkout:", cartItems);

      // Extract cart item IDs from store items
      const cartItemIds = cartItems
        .filter((item: any) => item && item.cartItemId)
        .map((item: any) => item.cartItemId);

      if (cartItemIds.length === 0) {
        Alert.alert(
          "Lỗi",
          "Không có sản phẩm nào trong giỏ hàng của cửa hàng này"
        );
        return;
      }

      // Build checkout request body
      const checkoutData: OrderCheckoutReq = {
        cart_item_ids: cartItemIds,
        shipping_address_detail: selectedAddress.address_detail,
        shipping_district: selectedAddress.district,
        shipping_district_id: selectedAddress.district_id,
        shipping_province: selectedAddress.province,
        shipping_province_id: selectedAddress.province_id,
        shipping_ward: selectedAddress.ward,
        shipping_ward_id: selectedAddress.ward_id,
        shipping_full_name: selectedAddress.full_name || "",
        shipping_phone_number: selectedAddress.phone_number || "",
        is_split_shipment: deliveryOption === DeliveryOptions.SEPARATE,
        is_need_shipment: pickupMethod === PickupMethod.SERVICE,
        // ...(promotionId && { customer_promotion_id: promotionId }),
        // shipping_location is optional - can be added later if needed
        // shipping_location: shippingLocation,
        // Optional fields can be added later:
        // note: "Giao vào giờ hành chính",
        // customer_package_id: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33",
        // wallet_payment_amount: walletAmount,
      };
      console.log("Checkout data:", checkoutData);

      // Call checkout API
      const response = await orderService.checkout(checkoutData);
      const orderData: Order | undefined = response?.data;

      if (orderData && (response.success || response.meta?.code === "200")) {
        console.log("Checkout success:", response);
        setLastOrder(orderData);

        // Force refresh customer profile to get updated wallet balance after package purchase
        // Invalidate cache first to ensure we get fresh data
        try {
          cacheManager.invalidate("customer:profile");
          await fetchCustomerProfile();
          await fetchPackageRemaining();
        } catch (error) {
          console.error("Error refreshing customer profile after checkout:", error);
        }

        setActiveScreen(ScreenType.ORDER_SUCCESS);
      } else {
        Alert.alert("Lỗi", "Đặt hàng thất bại");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      const errorMessage =
        error?.response?.data?.meta?.message ||
        error?.message ||
        "Đặt hàng thất bại";
      Alert.alert("Lỗi", errorMessage);
    }
  };

  const addProductToCart = async (product: ProductItem): Promise<any> => {
    try {
      const res = await cartService.addItemToCart({
        product_id: product.id,
        quantity: 1,
      });

      Alert.alert("Thành công", `Đã thêm ${product.name} vào giỏ hàng`);
    } catch (error) {
      Alert.alert("Thất bại", `Thêm ${product.name} vào giỏ hàng thất bại`);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    switch (tab) {
      case "home":
        setActiveScreen(ScreenType.HOME);
        break;
      case "cart":
        setActiveScreen(ScreenType.CART);
        break;
      case "orders":
        setActiveScreen(ScreenType.ORDERS);
        break;
      case "wallet":
        setActiveScreen(ScreenType.WALLET);
        break;
    }
  };

  const fetchProducts = async (page: number = 0, append: boolean = false) => {
    try {
      const res = await productService.searchProducts(page, 20, undefined, {
        status: ProductStatus.ACTIVE,
      });
      // Filter to only show GOODS type products
      const goodsProducts = (res.data || []).filter(
        (product: ProductItem) => product.type === "GOODS"
      );

      if (append) {
        setAllProducts(prev => [...prev, ...goodsProducts]);
      } else {
        // Shuffle and take first 10 for random display
        const shuffled = goodsProducts.sort(() => Math.random() - 0.5);
        const random10 = shuffled.slice(0, 10);
        setProducts(random10);
        setAllProducts(goodsProducts);
      }
      setProductsPage(page);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const loadMoreProducts = () => {
    // If we have more products in allProducts, use those first
    if (allProducts.length > products.length) {
      const remaining = allProducts.slice(products.length, products.length + 10);
      setProducts(prev => [...prev, ...remaining]);
    } else {
      // Otherwise fetch more from API
      const nextPage = productsPage + 1;
      fetchProducts(nextPage, true);
    }
  };

  const fetchServices = async (page: number = 0, append: boolean = false) => {
    try {
      const res = await productService.searchProducts(page, SERVICES_PAGE_SIZE, undefined, {
        status: ProductStatus.ACTIVE,
        type: ProductType.SERVICE,
      });
      // Filter to only show SERVICE type products
      const serviceProducts = res.data || [];
      setServicesHasMore(serviceProducts.length >= SERVICES_PAGE_SIZE);
      servicesPageRef.current = page;

      if (append) {
        setServices((prev) => {
          const seen = new Set(prev.map((p: ProductItem) => p.id));
          const next = serviceProducts.filter((p: ProductItem) => !seen.has(p.id));
          return [...prev, ...next];
        });
      } else {
        setServices(serviceProducts);
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  };

  const fetchPackages = async (page: number = 0, append: boolean = false) => {
    try {
      const response = await packageService.searchPackages(
        {
          status: CustomerPackageStatus.ACTIVE,
        },
        { page, size: PACKAGES_PAGE_SIZE }
      );
      if (response?.data) {
        const nextPackages = response.data;
        setPackagesHasMore(nextPackages.length >= PACKAGES_PAGE_SIZE);
        packagesPageRef.current = page;

        if (append) {
          setPackages((prev) => {
            const seen = new Set((prev || []).map((p: any) => p.id));
            const deduped = (nextPackages || []).filter((p: any) => !seen.has(p.id));
            return [...prev, ...deduped];
          });
        } else {
          setPackages(nextPackages);
        }
      }
    } catch (error) {
      console.error("Failed to fetch packages:", error);
    }
  };

  const loadMoreServices = async () => {
    if (!servicesHasMore || servicesLoadingMore) return;
    setServicesLoadingMore(true);
    const nextPage = servicesPageRef.current + 1;
    await fetchServices(nextPage, true);
    setServicesLoadingMore(false);
  };

  const loadMorePackages = async () => {
    if (!packagesHasMore || packagesLoadingMore) return;
    setPackagesLoadingMore(true);
    const nextPage = packagesPageRef.current + 1;
    await fetchPackages(nextPage, true);
    setPackagesLoadingMore(false);
  };

  const fetchPromotions = async () => {
    try {
      const response = await promotionService.searchPromotions(
        { status: PromotionStatus.ACTIVE },
        { page: 0, size: 10 }
      );
      if (response?.data) {
        // Filter promotions to only show available ones (using UTC time, not local device time)
        // Use Date.now() which returns UTC timestamp in milliseconds
        const nowUTC = Date.now();

        const availablePromotions = response.data.filter((promo: any) => {
          if (!promo.start_date || !promo.end_date) {
            return false;
          }

          const startDate = new Date(promo.start_date).getTime();
          const endDate = new Date(promo.end_date).getTime();

          // Check if current UTC time is within the promotion period
          return nowUTC >= startDate && nowUTC <= endDate;
        });

        setPromotions(availablePromotions);
        console.log("Promotions:", availablePromotions);
      }
    } catch (error) {
      console.error("Failed to fetch promotions:", error);
    }
  };

  const fetchSavedPromotions = async () => {
    console.log("Customer profile:", customerProfile);
    console.log("Fetching saved promotions for customer:", customerProfile?.id);
    try {
      const response = await customerAddressService.searchPromotionsSaved(
        {
          customer_id: customerProfile?.id,
          is_used: false,
          is_expired: false,
        },
        { page: 0, size: 100 }
      );
      console.log("Saved promotions response:", response);
      if (response?.data) {
        const savedCodes = new Set<string>(response.data.map((item: any) => item.promotion?.code).filter(Boolean));
        setSavedPromotionCodes(savedCodes);
      }
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (!errorMessage.includes("Token not found")) {
        console.error("Failed to fetch saved promotions:", error);
      }
    }
  };

  const handleSavePromotion = async (promotionId: string) => {
    try {
      await promotionService.customerSavePromotions(promotionId);
      const promo = promotions.find((p: any) => p.id === promotionId);
      if (promo?.code) setSavedPromotionCodes(prev => new Set([...prev, promo.code]));
      Alert.alert("Thành công", "Đã lưu khuyến mãi vào tài khoản");
    } catch (error) {
      console.error("Failed to save promotion:", error);
      Alert.alert("Lỗi", "Không thể lưu khuyến mãi");
    }
  };

  const fetchCustomerProfile = async (invalidateCache: boolean = false) => {
    try {
      // Invalidate cache if requested (e.g., after payment to get fresh balance)
      if (invalidateCache) {
        cacheManager.invalidate("customer:profile");
      }

      const response = await customerService.getCustomerProfile();
      if (response?.data) {
        setCustomerProfile(response.data);
        await SecureStore.setItemAsync(
          SecureStoreKeys.CUSTOMER_PROFILE,
          JSON.stringify(response.data)
        );
      }
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (!errorMessage.includes("Token not found")) {
        console.error("Failed to fetch customer profile:", error);
      }
    }
  };

  const fetchCustomerLocation = async () => {
    try {
      const response = await customerAddressService.getCustomerAddresses();
      const apiAddresses = (response?.data || response || []) as any[];

      // Filter out deleted addresses and find default address
      const validAddresses = apiAddresses.filter(
        (addr) => !addr.deleted && addr.address && !addr.address.deleted
      );

      const defaultAddress =
        validAddresses.find((addr) => addr.is_default) || validAddresses[0];

      if (defaultAddress && defaultAddress.address) {
        const addressData = defaultAddress.address;
        // Format full address: address_detail, ward, district, province
        const fullAddress = [
          addressData.address_detail,
          addressData.ward,
          addressData.district,
          addressData.province,
        ]
          .filter(Boolean)
          .join(", ");
        setCustomerLocation(fullAddress || "Chưa có địa chỉ");
      } else {
        setCustomerLocation("Chưa có địa chỉ");
      }
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (!errorMessage.includes("Token not found")) {
        console.error("Failed to fetch customer location:", error);
      }
      setCustomerLocation("Chưa có địa chỉ");
    }
  };

  const fetchStores = async () => {
    try {
      const response = await storeService.searchStore({
        deleted: false,
        type: StoreType.HUB,
      }, { page: 0, size: 100 });
      const stores = response?.data || [];
      const hubStores = stores.filter((store: any) => store.type === "HUB");
      setStoreCount(hubStores.length);
    } catch (error) {
      console.error("Failed to fetch stores:", error);
    }
  };

  const fetchPackageRemaining = async () => {
    try {
      const response = await packageService.customerSearchPackages(
        {},
        { page: 0, size: 100 }
      );
      if (response?.data && Array.isArray(response.data)) {
        const totalRemaining = response.data.reduce((sum: number, pkg: any) => {
          const remaining = pkg.remaining_count || 0;
          return sum + remaining;
        }, 0);
        setPackageRemaining(totalRemaining);
      } else {
        setPackageRemaining(0);
      }
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (!errorMessage.includes("Token not found")) {
        console.error("Failed to fetch package remaining:", error);
      }
      setPackageRemaining(0);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchServices();
    fetchPackages();
    fetchCustomerProfile();
    fetchCustomerLocation();
    fetchPromotions();
    fetchSavedPromotions();
    fetchStores();
    fetchPackageRemaining();
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // If not on home screen, go back to home or previous screen
        if (activeScreen !== ScreenType.HOME) {
          // Handle specific navigation logic
          if (activeScreen === ScreenType.ORDER_DETAIL) {
            setActiveScreen(ScreenType.ORDERS);
          } else if (activeScreen === ScreenType.LAUNDRY_SERVICE) {
            setAllServicesInitialTab(undefined);
            setActiveScreen(ScreenType.ALL_SERVICES);
          } else if (activeScreen === ScreenType.PRODUCT_DETAIL) {
            setActiveScreen(ScreenType.HOME);
          } else {
            setActiveScreen(ScreenType.HOME);
            setActiveTab("home");
          }
          return true; // Prevent default behavior (exit app)
        }

        // If on home screen, let user exit app
        return false;
      }
    );

    return () => backHandler.remove();
  }, [activeScreen]);

  // Refetch customer profile when wallet screen is focused
  useEffect(() => {
    if (activeScreen === ScreenType.WALLET) {
      // Invalidate cache to get fresh data when wallet screen is focused
      cacheManager.invalidate("customer:profile");
      fetchCustomerProfile(true);
      fetchPackageRemaining();
    }
  }, [activeScreen]);

  // Refetch customer profile when returning to home screen from wallet/payment to update wallet balance
  useEffect(() => {
    if (activeScreen === ScreenType.HOME && previousScreenRef.current === ScreenType.WALLET) {
      // Invalidate cache to get fresh balance after returning from wallet/payment
      cacheManager.invalidate("customer:profile");
      fetchCustomerProfile(true);
      fetchPackageRemaining();
    }
    previousScreenRef.current = activeScreen;
  }, [activeScreen]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // Invalidate cache before refreshing to get fresh data
      cacheManager.invalidate("customer:profile");
      await Promise.all([
        fetchCustomerProfile(true),
        fetchPackageRemaining(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // const products = [
  //   {
  //     id: "1",
  //     name: "Nước giặt Omo",
  //     price: "120k",
  //     icon: "bottle-water",
  //     discount: "-10%",
  //   },
  //   { id: "2", name: "Giấy thơm Bounce", price: "50k", icon: "box-open" },
  // ];

  const defaultServices = [
    {
      id: "1",
      icon: "tshirt",
      label: "Giặt Sấy",
      bgColor: "#EFF6FF",
      iconColor: "#2563EB",
      borderColor: "#BFDBFE",
    },
    {
      id: "2",
      icon: "user-tie",
      label: "Giặt Khô",
      bgColor: "#F3E8FF",
      iconColor: "#9333EA",
      borderColor: "#E9D5FF",
    },
    {
      id: "3",
      icon: "shoe-prints",
      label: "Giặt Giày",
      bgColor: "#FFF7ED",
      iconColor: "#EA580C",
      borderColor: "#FED7AA",
    },
    {
      id: "4",
      icon: "couch",
      label: "Sofa/Rèm",
      bgColor: "#ECFDF5",
      iconColor: "#059669",
      borderColor: "#6EE7B7",
    },
  ];

  if (activeScreen === ScreenType.ALL_OFFERS) {
    return (
      <AllOffersScreen
        onBack={() => setActiveScreen(ScreenType.HOME)}
        onOfferPress={(id) => Alert.alert("Offer", `Pressed offer ${id}`)}
      />
    );
  }

  if (activeScreen === ScreenType.ALL_SERVICES) {
    return (
      <AllServicesScreen
        onBack={() => {
          setActiveScreen(ScreenType.HOME);
          setAllServicesInitialTab(undefined);
        }}
        onProductPress={(product) => {
          setSelectedProduct(product);
          setActiveScreen(ScreenType.PRODUCT_DETAIL);
        }}
        onAddToCart={(product) => addProductToCart(product)}
        initialTab={allServicesInitialTab}
      />
    );
  }

  if (activeScreen === ScreenType.ALL_PRODUCTS) {
    return (
      <AllProductsScreen
        products={products}
        onBack={() => setActiveScreen(ScreenType.HOME)}
        onProductPress={(id) => Alert.alert("Product", `View product ${id}`)}
        onAddToCart={(id) => Alert.alert("Cart", `Added product ${id}`)}
      />
    );
  }

  if (activeScreen === ScreenType.STORES) {
    return (
      <StoreLocatorScreen
        onBack={() => setActiveScreen(ScreenType.HOME)}
        onCall={(id) => {
          // The phone number will be handled in StoreLocatorScreen
          Alert.alert("Gọi điện", `Đang gọi cửa hàng ${id}`);
        }}
        onDirections={(id) =>
          Alert.alert("Chỉ đường", `Đang mở bản đồ cho cửa hàng ${id}`)
        }
      />
    );
  }

  if (activeScreen === ScreenType.PROFILE) {
    return (
      <ProfileScreen
        onBack={() => setActiveScreen(ScreenType.HOME)}
        onSave={() => { }}
        onAddAddress={() => Alert.alert("Add Address", "Add new address")}
        onEditAddress={(id) => Alert.alert("Edit", `Edit address ${id}`)}
        onLogout={() => handleLogout()}
      />
    );
  }

  if (activeScreen === ScreenType.WALLET) {
    return (
      <Stack.Navigator>
        <Stack.Screen name="wallet" options={{ headerShown: false }}  >{
          ({ navigation: stackNavigation }) => {
            // Add listener to refresh when returning from QrPayment
            React.useEffect(() => {
              const unsubscribe = stackNavigation.addListener('focus', () => {
                // Refresh customer profile when wallet screen comes into focus
                // This will trigger when returning from QrPayment
                // Invalidate cache first to ensure we get fresh balance data
                cacheManager.invalidate("customer:profile");
                fetchCustomerProfile(true);
                fetchPackageRemaining();
              });

              return unsubscribe;
            }, [stackNavigation]);

            return (
              <View style={styles.container}>
                <WalletScreen
                  balance={formatCurrencyVND(customerProfile?.wallet_balance || 0)}
                  points={120}
                  customerId={customerProfile?.id}
                  onTopUp={() => { }}
                  onBuyPackage={() => {
                    setAllServicesInitialTab('packages');
                    setActiveScreen(ScreenType.ALL_SERVICES);
                  }}
                  onHistory={() => {
                    // Navigation will be handled by the Stack Navigator
                  }}
                  onOrderPress={(order) => {
                    // Convert Order to OrderDetail (extend with order_items if available)
                    const orderDetail: OrderDetail = {
                      ...order,
                      order_items: (order as any).order_items || [],
                      promotion_name: (order as any).promotion_name,
                      promotion_discount: (order as any).promotion_discount,
                    };
                    // Track previous screen before navigating to order detail
                    previousScreenBeforeOrderDetailRef.current = activeScreen;
                    setSelectedOrder(orderDetail);
                    setActiveScreen(ScreenType.ORDER_DETAIL);
                  }}
                />
                <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
              </View>
            );
          }
        }</Stack.Screen>
        <Stack.Screen
          name="QrPayment"
          component={QrPaymentWebView}
          options={{ title: 'Thanh toán' }}
        />
        <Stack.Screen
          name="TransactionHistory"
          options={{ headerShown: false }}
        >
          {({ navigation: stackNavigation }) => (
            <TransactionHistoryScreen
              customerId={customerProfile?.id}
              onBack={() => stackNavigation.goBack()}
              onOrderPress={(order) => {
                // Convert Order to OrderDetail (extend with order_items if available)
                const orderDetail: OrderDetail = {
                  ...order,
                  order_items: (order as any).order_items || [],
                  promotion_name: (order as any).promotion_name,
                  promotion_discount: (order as any).promotion_discount,
                };
                // Track previous screen before navigating to order detail
                previousScreenBeforeOrderDetailRef.current = ScreenType.WALLET;
                setSelectedOrder(orderDetail);
                setActiveScreen(ScreenType.ORDER_DETAIL);
                stackNavigation.goBack(); // Close the transaction history screen first
              }}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    );
  }

  if (activeScreen === ScreenType.PRODUCT_DETAIL) {
    return (
      <ProductDetailScreen
        product={selectedProduct}
        loading={false}
        onBack={() => setActiveScreen(ScreenType.HOME)}
        onAddToCart={(quantity) => {
          if (selectedProduct) {
            // If it's a package, navigate to package purchase screen instead of adding to cart
            if (selectedProduct.type === "PACKAGE") {
              // Navigate to package purchase screen (using ProductDetailScreen as purchase screen)
              // The package purchase flow can be handled here
              Alert.alert(
                "Mua gói dịch vụ",
                `Bạn muốn mua gói ${selectedProduct.name}?`,
                [
                  {
                    text: "Hủy",
                    style: "cancel",
                  },
                  {
                    text: "Mua ngay",
                    onPress: () => {
                      // Handle package purchase - you can add package purchase logic here
                      // For now, we'll show an alert, but you can navigate to a dedicated purchase screen
                      Alert.alert("Thông báo", "Tính năng mua gói đang được phát triển");
                    },
                  },
                ]
              );
            } else {
              // For regular products, add to cart
              const addMultiple = async () => {
                for (let i = 0; i < quantity; i++) {
                  await addProductToCart(selectedProduct);
                }
                // Alert.alert("Thành công", `Đã thêm ${quantity} ${selectedProduct.name} vào giỏ hàng`);
                setActiveScreen(ScreenType.HOME);
              };
              addMultiple();
            }
          }
        }}
        onRegisterPackage={async (packageId) => {
          try {
            const response = await packageService.customerRegisterPackage({
              package_product_id: packageId,
            });

            // Show success notification
            Alert.alert(
              "Thành công",
              "Đăng ký gói dịch vụ thành công!",
              [
                {
                  text: "OK",
                  onPress: () => {
                    // Refresh customer profile to update packages
                    fetchCustomerProfile();
                    fetchPackageRemaining();
                    // Navigate back to home
                    setActiveScreen(ScreenType.HOME);
                  },
                },
              ]
            );
          } catch (error: any) {
            console.error("Error registering package:", error);
            console.error("Error status code:", error?.response?.status);
            let errorMessage;
            if (error?.response?.status === 400) {
              errorMessage = "Không đủ tiền trong tài khoản vui lòng nạp thêm";
            } else {
              errorMessage =
                error?.response?.data?.meta?.message ||
                "Đăng ký gói dịch vụ thất bại. Vui lòng thử lại.";
            }
            Alert.alert("Lỗi", errorMessage);
          }
        }}
      />
    );
  }

  if (activeScreen === ScreenType.CART) {
    return (
      <View style={styles.container}>
        {isUpdatingCart && <LoadingScreen message="Đang cập nhật..." fullScreen={false} />}
        <CartScreen
          onAddressPress={() => Alert.alert("Address", "Select address")}
          onConfirm={handleCheckout}
          onRemoveItem={(id) => removeItemFromCart(id)}
          onUpdateQuantity={(id, qty) => updateCartItem(id, qty)}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </View>
    );
  }

  if (activeScreen === ScreenType.ORDERS) {
    return (
      <View style={styles.container}>
        <OrderListScreen
          onOrderPress={(order) => {
            // Convert Order to OrderDetail (extend with order_items if available)
            const orderDetail: OrderDetail = {
              ...order,
              order_items: (order as any).order_items || [],
              promotion_name: (order as any).promotion_name,
              promotion_discount: (order as any).promotion_discount,
            };
            // Track previous screen before navigating to order detail
            previousScreenBeforeOrderDetailRef.current = activeScreen;
            setSelectedOrder(orderDetail);
            setActiveScreen(ScreenType.ORDER_DETAIL);
          }}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </View>
    );
  }

  if (activeScreen === ScreenType.ORDER_DETAIL && selectedOrder) {
    return (
      <View style={styles.container}>
        <OrderDetailScreen
          order={selectedOrder}
          onBack={() => {
            setSelectedOrder(null);
            // Return to previous screen without refreshing
            const previousScreen = previousScreenBeforeOrderDetailRef.current || ScreenType.ORDERS;
            setActiveScreen(previousScreen);
            previousScreenBeforeOrderDetailRef.current = null;
          }}
          onContinue={() => {
            // Refresh customer profile after confirmation
            fetchCustomerProfile();
            // Return to previous screen
            const previousScreen = previousScreenBeforeOrderDetailRef.current || ScreenType.ORDERS;
            setSelectedOrder(null);
            setActiveScreen(previousScreen);
            previousScreenBeforeOrderDetailRef.current = null;
            // Alert.alert("Continue", "Continue washing");
          }}
          onReturn={() => {
            // Refresh customer profile after return
            fetchCustomerProfile();
            // Return to previous screen
            const previousScreen = previousScreenBeforeOrderDetailRef.current || ScreenType.ORDERS;
            setSelectedOrder(null);
            setActiveScreen(previousScreen);
            previousScreenBeforeOrderDetailRef.current = null;
            Alert.alert("Return", "Return and refund");
          }}
        />
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </View>
    );
  }

  if (activeScreen === ScreenType.ORDER_SUCCESS) {
    if (!lastOrder) {
      return (
        <View style={styles.container}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              textAlign: "center",
              marginTop: 32,
            }}
          >
            Không tìm thấy thông tin đơn hàng
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <OrderSuccessScreen
          order={lastOrder}
          onViewOrder={() => setActiveScreen(ScreenType.ORDERS)}
          onBackToHome={() => {
            setActiveScreen(ScreenType.HOME);
            setActiveTab("home");
            setLastOrder(null);
          }}
        />
      </View>
    );
  }

  if (activeScreen === ScreenType.LAUNDRY_SERVICE && selectedService) {
    return (
      <View style={styles.container}>
        <LaundryServiceScreen
          serviceId={selectedService.id}
          serviceName={selectedService.name}
          onBack={() => {
            setActiveScreen(ScreenType.HOME);
            setSelectedService(null);
          }}
          onAddToCart={(order) => {
            Alert.alert(
              "Thành công",
              `Đã thêm ${order.serviceName} vào giỏ hàng`,
              [
                {
                  text: "Xem giỏ hàng",
                  onPress: () => {
                    setActiveScreen(ScreenType.CART);
                    setActiveTab("cart");
                    setSelectedService(null);
                  },
                },
                {
                  text: "Tiếp tục",
                  onPress: () => {
                    setActiveScreen(ScreenType.HOME);
                    setSelectedService(null);
                  },
                },
              ]
            );
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
      >
        <HomeHeader
          userName={customerProfile?.full_name || "Khách hàng"}
          location={customerLocation || "Chưa có địa chỉ"}
          onProfilePress={() => setActiveScreen(ScreenType.PROFILE)}
          onStoreFinderPress={() => setActiveScreen(ScreenType.STORES)}
          onNotificationPress={() =>
            Alert.alert("Notifications", "Show notifications")
          }
        />
        <WalletCard
          balance={formatCurrencyVND(customerProfile?.wallet_balance || 0)}
          membershipTier=""
          packageRemaining={packageRemaining}
          onTopUpPress={() => setActiveScreen(ScreenType.WALLET)}
        />
        {promotions.length > 0 && (
          <View style={styles.promotionSection}>
            <PromotionBanner
              promotions={promotions.slice(0, 5)}
              savedPromotionCodes={savedPromotionCodes}
              onPromotionPress={(id) =>
                Alert.alert("Khuyến mãi", "Xem chi tiết khuyến mãi")
              }
              onSavePress={handleSavePromotion}
              onSeeAllPress={() => setActiveScreen(ScreenType.ALL_OFFERS)}
            />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dịch vụ Giặt là</Text>
            <Text
              style={styles.seeAllText}
              onPress={() => {
                setAllServicesInitialTab(undefined);
                setActiveScreen(ScreenType.ALL_SERVICES);
              }}
            >
              Xem tất cả
            </Text>
          </View>
          {services.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
              onScroll={(event) => {
                const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                const isCloseToRight =
                  contentOffset.x + layoutMeasurement.width >= contentSize.width - 100;
                if (isCloseToRight) {
                  loadMoreServices();
                }
              }}
              scrollEventThrottle={400}
            >
              {services.map((service) => (
                <ProductCard
                  key={service.id}
                  product={service}
                  onPress={(id) => {
                    setSelectedProduct(service);
                    setActiveScreen(ScreenType.PRODUCT_DETAIL);
                  }}
                  onAddToCart={() => addProductToCart(service)}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.serviceGrid}>
              {defaultServices.map((service) => (
                <ServiceButton
                  key={service.id}
                  service={service}
                  onPress={(id) => {
                    const selected = defaultServices.find((s) => s.id === id);
                    if (selected) {
                      setSelectedService({
                        id: selected.id,
                        name: selected.label,
                      });
                      setActiveScreen(ScreenType.LAUNDRY_SERVICE);
                    }
                  }}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mua sắm tiện ích</Text>
            <Text
              style={styles.seeAllText}
              onPress={() => {
                setAllServicesInitialTab(undefined);
                setActiveScreen(ScreenType.ALL_SERVICES);
              }}
            >
              Xem tất cả
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
            onScroll={(event) => {
              const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
              const isCloseToRight = contentOffset.x + layoutMeasurement.width >= contentSize.width - 100;
              if (isCloseToRight && allProducts.length > products.length) {
                loadMoreProducts();
              }
            }}
            scrollEventThrottle={400}
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={(id) => {
                  setSelectedProduct(product);
                  setActiveScreen(ScreenType.PRODUCT_DETAIL);
                }}
                onAddToCart={() => addProductToCart(product)}
              />
            ))}
          </ScrollView>
        </View>
        {packages.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Gói dịch vụ</Text>
              <Text
                style={styles.seeAllText}
                onPress={() => setActiveScreen(ScreenType.ALL_SERVICES)}
              >
                Xem tất cả
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
              onScroll={(event) => {
                const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                const isCloseToRight =
                  contentOffset.x + layoutMeasurement.width >= contentSize.width - 100;
                if (isCloseToRight) {
                  loadMorePackages();
                }
              }}
              scrollEventThrottle={400}
            >
              {packages.map((pkg: any) => {
                const packageProduct: ProductItem = {
                  id: pkg.id,
                  store_id: pkg.store_id || "",
                  name: pkg.name,
                  sku: pkg.sku || "",
                  stock_quantity: pkg.quantity || 0,
                  reserved_quantity: 0,
                  description: pkg.description || "",
                  thumbnail_url: pkg.thumbnail_url || "",
                  gallery_urls: pkg.gallery_urls || [],
                  type: "PACKAGE",
                  status: pkg.status || "ACTIVE",
                  unit: pkg.unit || "",
                  price: pkg.price || 0,
                  priority: pkg.priority || 0,
                  deleted: false,
                };
                return (
                  <ProductCard
                    key={pkg.id}
                    product={packageProduct}
                    onPress={(id) => {
                      setSelectedProduct(packageProduct);
                      setActiveScreen(ScreenType.PRODUCT_DETAIL);
                    }}
                    onAddToCart={() => {
                      // For packages, navigate to purchase screen instead of adding to cart
                      setSelectedProduct(packageProduct);
                      setActiveScreen(ScreenType.PRODUCT_DETAIL);
                    }}
                  />
                );
              })}
            </ScrollView>
          </View>
        )}
        {/* <CurrentOrderCard
          orderId="DH001"
          status="Shipper đang đến lấy đồ"
          onPress={() => Alert.alert("Order", "View order details")}
        /> */}
        <BusinessFooter
          onStoresPress={() => setActiveScreen(ScreenType.STORES)}
          storeCount={storeCount}
        />
      </ScrollView>
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  content: { flex: 1 },
  promotionSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  section: { marginTop: 32, paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  seeAllText: { fontSize: 12, fontWeight: "500", color: "#2563EB" },
  horizontalScroll: { gap: 16, paddingBottom: 16 },
  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
});
