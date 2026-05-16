import { AddAddressScreenWrapper } from "@/components/address";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DeliveryOptions, PickupMethod, SecureStoreKeys } from "@/constants/enum";
import { storeService } from "@/services/api";
import { cartService } from "@/services/api/cartService";
import { customerAddressService, CustomerProfile, customerService } from "@/services/api/customerService";
import { formatCurrencyVND } from "@/utils/format";
import { FontAwesome5 } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as SecureStore from "@/lib/secureStorage";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface CartItem {
  id: string;
  cartItemId: string;
  name: string;
  type: "SERVICE" | "GOODS";
  status?: string;
  stockQuantity?: number;
  price: number;
  quantity: number;
  storeId: string;
  thumbnailUrl?: string;
  packageDiscount?: number;
}

interface CartScreenProps {
  onAddressPress: () => void;
  onConfirm: (
    address: {
      id: string;
      address_detail: string;
      ward: string;
      ward_id: number;
      district: string;
      district_id: number;
      province: string;
      province_id: number;
      fullAddress: string;
      full_name: string;
      phone_number: string;
    } | null,
    walletAmount: number,
    deliveryOption: DeliveryOptions,
    pickupMethod: PickupMethod,
    storeId: string,
    storeItems: CartItem[],
    promotionId?: string
  ) => void;
  onRemoveItem?: (id: string) => void;
  onUpdateQuantity?: (id: string, quantity: number) => Promise<any>;
}

export const CartScreen: React.FC<CartScreenProps> = ({
  onAddressPress,
  onConfirm,
  onRemoveItem,
  onUpdateQuantity,
}) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [storeInfos, setStoreInfos] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<{
    id: string;
    full_name: string;
    phone_number: string;
    address_detail: string;
    ward: string;
    ward_id: number;
    district: string;
    district_id: number;
    province: string;
    province_id: number;
    fullAddress: string;
  } | null>(null);
  const [addressLoading, setAddressLoading] = useState(true);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [allAddresses, setAllAddresses] = useState<any[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [storeDeliveryOptions, setStoreDeliveryOptions] = useState<Record<string, DeliveryOptions>>({});
  const [storePickupMethods, setStorePickupMethods] = useState<Record<string, PickupMethod>>({});
  const [showAddAddressScreen, setShowAddAddressScreen] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState<{
    address: typeof selectedAddress;
    walletAmount: number;
    deliveryOption: DeliveryOptions;
    pickupMethod: PickupMethod;
    storeId: string;
    storeItems: CartItem[];
    promotionId?: string;
    serviceItems?: CartItem[];
    goodsItems?: CartItem[];
  } | null>(null);

  const fetchStore = useCallback(async (storeId: string) => {
    try {
      console.log(`Fetching store info for ${storeId}...`);
      const response = await storeService.getStoreProfile(storeId);
      setStoreInfos((prev) => ({ ...prev, [storeId]: response.data }));
    } catch (error) {
      console.error(`Error fetching store ${storeId}:`, error);
    }
  }, []);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const response = await cartService.getCustomerCart();
      const cartItems = response?.data?.cart_items || [];

      const mappedItems: CartItem[] = cartItems
        .filter((cartItem: any) => cartItem && cartItem.id && cartItem.product)
        .map((cartItem: any) => ({
          id: cartItem.product?.id || cartItem.product_id || "",
          cartItemId: cartItem.id || "",
          name: cartItem.product?.name || "",
          type: (cartItem.product?.type || "GOODS") as "SERVICE" | "GOODS",
          status: cartItem.product?.status,
          stockQuantity:
            cartItem.product?.stock_quantity !== undefined && cartItem.product?.stock_quantity !== null
              ? Number(cartItem.product.stock_quantity)
              : undefined,
          price: Number(cartItem.product?.price) || 0,
          quantity: Number(cartItem.quantity) || 1,
          storeId: cartItem.product?.store_id || "",
          thumbnailUrl: cartItem.product?.thumbnail_url || undefined,
          packageDiscount: 0, // Can be calculated from packages if needed
        }));

      setItems(mappedItems);
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (errorMessage.includes("Token not found")) {
        setItems([]);
        return;
      }
      console.error("Error fetching cart:", error);
      if (errorMessage) {
        Alert.alert("Lỗi", errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const removeCartItemSilently = useCallback(
    async (cartItemId: string) => {
      const cartItem = items.find((i) => i.cartItemId === cartItemId);
      if (!cartItem) return;

      if (onRemoveItem) {
        try {
          await onRemoveItem(cartItem.cartItemId);
        } catch (error) {
          console.error("Error removing cart item:", error);
        }
      }

      setItems((prev) => prev.filter((i) => i.cartItemId !== cartItem.cartItemId));
    },
    [items, onRemoveItem]
  );

  const updateQuantitySilently = useCallback(
    async (cartItemId: string, quantity: number) => {
      const newQuantity = Math.max(1, quantity);

      setItems((prev) =>
        prev.map((i) => (i.cartItemId === cartItemId ? { ...i, quantity: newQuantity } : i))
      );

      if (onUpdateQuantity) {
        try {
          await onUpdateQuantity(cartItemId, newQuantity);
        } catch (error) {
          console.error("Error updating cart item:", error);
          // fallback: refresh cart to reconcile
          fetchCart();
        }
      }
    },
    [fetchCart, onUpdateQuantity]
  );

  const fetchCustomerProfile = useCallback(async () => {
    try {
      // Try to get from SecureStore first
      const profileJson = await SecureStore.getItemAsync(SecureStoreKeys.CUSTOMER_PROFILE);
      if (profileJson) {
        const profileData: CustomerProfile = JSON.parse(profileJson);
        setCustomerProfile(profileData);
      } else {
        // If not in SecureStore, fetch from API
        const response = await customerService.getCustomerProfile();
        if (response?.data) {
          setCustomerProfile(response.data);
          // Save to SecureStore
          await SecureStore.setItemAsync(
            SecureStoreKeys.CUSTOMER_PROFILE,
            JSON.stringify(response.data)
          );
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (!errorMessage.includes("Token not found")) {
        console.error("Failed to fetch customer profile:", error);
      }
    }
  }, []);


  const fetchAddress = useCallback(async () => {
    try {
      setAddressLoading(true);
      const response = await customerAddressService.getCustomerAddresses();
      const apiAddresses = (response?.data || response || []) as any[];

      // Filter out deleted addresses and addresses with deleted nested address
      const validAddresses = apiAddresses.filter(
        (addr) => !addr.deleted && addr.address && !addr.address.deleted
      );
      setAllAddresses(validAddresses);

      // Find default address or use first one
      const defaultAddress =
        validAddresses.find((addr) => addr.is_default) || validAddresses[0];

      if (defaultAddress && defaultAddress.address) {
        const addressData = defaultAddress.address;
        const fullAddress = [
          addressData.address_detail,
          addressData.ward,
          addressData.district,
          addressData.province,
        ]
          .filter(Boolean)
          .join(", ");

        setSelectedAddress({
          id: defaultAddress.id,
          full_name: defaultAddress.full_name,
          phone_number: defaultAddress.phone_number,
          address_detail: addressData.address_detail,
          ward: addressData.ward,
          ward_id: addressData.ward_id,
          district: addressData.district,
          district_id: addressData.district_id,
          province: addressData.province,
          province_id: addressData.province_id,
          fullAddress,
        });
      }
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (!errorMessage.includes("Token not found")) {
        console.error("Error fetching address:", error);
      }
      // Don't show alert, just leave address empty
    } finally {
      setAddressLoading(false);
    }
  }, []);

  const fetchAllAddresses = useCallback(async () => {
    try {
      setAddressesLoading(true);
      const response = await customerAddressService.getCustomerAddresses();

      // Handle different response structures
      let apiAddresses: any[] = [];
      if (Array.isArray(response)) {
        apiAddresses = response;
      } else if (response?.data && Array.isArray(response.data)) {
        apiAddresses = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        apiAddresses = response.data.data;
      }

      // Filter out deleted addresses and addresses with deleted nested address
      const validAddresses = apiAddresses.filter(
        (addr) => addr && !addr.deleted && addr.address && !addr.address.deleted
      );
      setAllAddresses(validAddresses);
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (errorMessage.includes("Token not found")) {
        setAllAddresses([]);
        return;
      }
      console.error("Error fetching addresses:", error);
      setAllAddresses([]);
      if (errorMessage) {
        Alert.alert("Lỗi", errorMessage);
      }
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  const handleAddressPress = () => {
    fetchAllAddresses();
    setShowAddressModal(true);
  };

  const handleSelectAddress = (address: any) => {
    const addressData = address.address || address;
    const fullAddress = [
      addressData.address_detail,
      addressData.ward,
      addressData.district,
      addressData.province,
    ]
      .filter(Boolean)
      .join(", ");

    setSelectedAddress({
      id: address.id,
      full_name: address.full_name,
      phone_number: address.phone_number,
      address_detail: addressData.address_detail,
      ward: addressData.ward,
      ward_id: addressData.ward_id,
      district: addressData.district,
      district_id: addressData.district_id,
      province: addressData.province,
      province_id: addressData.province_id,
      fullAddress,
    });
  };

  const handleDeliveryOptionChange = (storeId: string, option: DeliveryOptions) => {
    setStoreDeliveryOptions(prev => ({
      ...prev,
      [storeId]: option
    }));
  };

  const handlePickupMethodChange = (storeId: string, method: PickupMethod) => {
    setStorePickupMethods(prev => ({
      ...prev,
      [storeId]: method,
    }));
  };

  const handleAddressSuccess = async () => {
    // Refresh addresses after adding/editing
    await fetchAddress();
    await fetchAllAddresses();
  };

  useEffect(() => {
    fetchCart();
    fetchAddress();
    fetchCustomerProfile();
  }, [fetchCart, fetchAddress, fetchCustomerProfile]);


  // Fetch store profiles when items change
  useEffect(() => {
    const storeIds = [...new Set(items.map(item => item.storeId).filter(Boolean))];
    storeIds.forEach(storeId => {
      if (!storeInfos[storeId]) {
        fetchStore(storeId);
      }

      // Get store items to check if it has only GOODS
      const storeItems = items.filter(item => item.storeId === storeId);
      const hasOnlyGoods = storeItems.length > 0 && storeItems.every(item => item.type === "GOODS");

      // Set default delivery option if not set or if store only has GOODS (always COMBINED)
      setStoreDeliveryOptions(prev => {
        if (prev[storeId] && !hasOnlyGoods) {
          return prev; // Don't update if already set and not only goods
        }
        return {
          ...prev,
          [storeId]: DeliveryOptions.COMBINED
        };
      });

      // Set default pickup method if not set (default to SELF)
      setStorePickupMethods(prev => {
        if (prev[storeId]) {
          return prev; // Don't update if already set
        }
        return {
          ...prev,
          [storeId]: PickupMethod.SELF,
        };
      });
    });
  }, [items, storeInfos, fetchStore]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCart();
  }, [fetchCart]);

  const handleRemoveItem = (cartItem: CartItem) => {
    Alert.alert(
      "Xóa sản phẩm",
      `Bạn có chắc muốn xóa "${cartItem.name}" khỏi giỏ hàng?`,
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            // Call external handler if provided (e.g., API call)
            if (onRemoveItem) {
              try {
                await onRemoveItem(cartItem.cartItemId);
              } catch (error) {
                console.error("Error removing cart item:", error);
              }
            }

            // Always refresh UI by removing from local state
            setItems((prev) =>
              prev.filter((item) => item.cartItemId !== cartItem.cartItemId)
            );
          },
        },
      ]
    );
  };

  const handleUpdateQuantity = async (cartItemId: string, quantity: number) => {
    // Optimistically update UI
    const previousItems = items;
    const newQuantity = Math.max(1, quantity);
    setItems(
      items.map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );

    // Call API if handler provided
    if (onUpdateQuantity) {
      try {
        await onUpdateQuantity(cartItemId, newQuantity);
      } catch (error) {
        // Revert on error
        setItems(previousItems);
        console.error("Error updating cart item:", error);
      }
    }
  };

  const subtotal = items.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );
  const walletBalance = customerProfile?.wallet_balance || 0;
  const total = Math.max(0, subtotal - walletBalance);

  const getTypeLabel = (type: string) => {
    return type === "SERVICE" ? "Dịch vụ" : "Hàng hóa";
  };

  const getTypeIcon = (type: string) => {
    return type === "SERVICE" ? "tshirt" : "box-open";
  };

  const getTypeIconBg = (type: string) => {
    return type === "SERVICE" ? "#EFF6FF" : "#F3F4F6";
  };

  const getTypeIconColor = (type: string) => {
    return type === "SERVICE" ? "#2563EB" : "#6B7280";
  };

  // Check if store has service items
  const hasServiceItems = (storeItems: CartItem[]) => {
    return storeItems.some(item => item.type === "SERVICE");
  };

  // Calculate subtotal for a store
  const calculateStoreSubtotal = (storeItems: CartItem[]) => {
    return storeItems.reduce(
      (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
      0
    );
  };


  // Group items by storeId for per-store rendering
  const groupedItems: Record<string, CartItem[]> = items.reduce((acc, item) => {
    const key = item.storeId || "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  // Show AddAddressScreen if needed
  if (showAddAddressScreen) {
    return (
      <AddAddressScreenWrapper
        onBack={() => setShowAddAddressScreen(false)}
        onSuccess={handleAddressSuccess}
        existingAddressesCount={allAddresses.length}
      />
    );
  }

  if (loading && items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Giỏ hàng</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải giỏ hàng...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Giỏ hàng</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#2563EB"]}
            tintColor="#2563EB"
          />
        }
      >
        <TouchableOpacity
          style={styles.addressCard}
          onPress={handleAddressPress}
          activeOpacity={1}
        >
          <View style={styles.addressContent}>
            <View style={styles.addressIcon}>
              <FontAwesome5 name="map-marker-alt" size={14} color="#2563EB" />
            </View>
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>Giao đến:</Text>
              {addressLoading ? (
                <View style={styles.addressLoadingContainer}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.addressLoadingText}>
                    Đang tải địa chỉ...
                  </Text>
                </View>
              ) : selectedAddress ? (
                <>
                  <Text style={styles.addressName}>
                    {selectedAddress.full_name} - {selectedAddress.phone_number}
                  </Text>
                  <Text style={styles.addressDetail} numberOfLines={2}>
                    {selectedAddress.fullAddress}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.addressName}>Chưa có địa chỉ</Text>
                  <Text style={styles.addressDetail}>
                    Nhấn để chọn địa chỉ giao hàng
                  </Text>
                </>
              )}
            </View>
          </View>
          <FontAwesome5 name="chevron-right" size={10} color="#D1D5DB" />
        </TouchableOpacity>

        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="shopping-cart" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Giỏ hàng trống</Text>
            <Text style={styles.emptySubtext}>
              Thêm sản phẩm vào giỏ hàng để tiếp tục
            </Text>
          </View>
        ) : (
          // Render grouped store cards
          Object.keys(groupedItems).map((storeId) => {
            const storeItems = groupedItems[storeId] || [];
            const storeSubtotal = calculateStoreSubtotal(storeItems);
            const storeHasServices = hasServiceItems(storeItems);
            const hasOnlyGoods = storeItems.length > 0 && storeItems.every(item => item.type === "GOODS");
            const hasOnlyServices = storeItems.length > 0 && storeItems.every(item => item.type === "SERVICE");
            const hasBothServiceAndGoods = storeHasServices && !hasOnlyServices && !hasOnlyGoods;
            const pickupMethod = storePickupMethods[storeId] ?? PickupMethod.SELF;

            return (
              <View key={`store-${storeId}`} style={styles.storeCard}>
                <View style={styles.storeHeader}>
                  <Text style={styles.storeName}>
                    {storeInfos[storeId]?.name}
                  </Text>
                </View>

                {/* Delivery option toggle - only show if store has both service and goods items */}
                {hasBothServiceAndGoods && (
                  <View style={styles.storeDeliveryOptionsCard}>
                    <Text style={styles.storeDeliveryOptionsTitle}>Tùy chọn giao hàng</Text>
                    <Text style={styles.storeDeliveryOptionsDesc}>
                      {storeDeliveryOptions[storeId] === DeliveryOptions.COMBINED
                        ? 'Hàng mua giao cùng lúc trả đồ giặt'
                        : 'Giao hàng mua riêng ngay lập tức'
                      }
                    </Text>

                    <View style={styles.deliveryToggleContainer}>
                      <TouchableOpacity
                        style={[
                          styles.deliveryToggleOption,
                          storeDeliveryOptions[storeId] === DeliveryOptions.COMBINED && styles.deliveryToggleOptionSelected
                        ]}
                        onPress={() => handleDeliveryOptionChange(storeId, DeliveryOptions.COMBINED)}
                        activeOpacity={1}
                      >
                        <Text style={[
                          styles.deliveryToggleText,
                          storeDeliveryOptions[storeId] === DeliveryOptions.COMBINED && styles.deliveryToggleTextSelected
                        ]}>
                          Gộp đơn
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.deliveryToggleOption,
                          storeDeliveryOptions[storeId] === DeliveryOptions.SEPARATE && styles.deliveryToggleOptionSelected
                        ]}
                        onPress={() => handleDeliveryOptionChange(storeId, DeliveryOptions.SEPARATE)}
                        activeOpacity={1}
                      >
                        <Text style={[
                          styles.deliveryToggleText,
                          storeDeliveryOptions[storeId] === DeliveryOptions.SEPARATE && styles.deliveryToggleTextSelected
                        ]}>
                          Tách chuyến
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {storeItems.map((item, index) => (
                  <View
                    key={item.cartItemId || `cart-item-${index}`}
                    style={styles.itemCard}
                  >
                    {item.thumbnailUrl ? (
                      <Image
                        source={{ uri: item.thumbnailUrl }}
                        style={styles.itemImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.itemIcon,
                          { backgroundColor: getTypeIconBg(item.type) },
                        ]}
                      >
                        <FontAwesome5
                          name={getTypeIcon(item.type)}
                          size={18}
                          color={getTypeIconColor(item.type)}
                        />
                      </View>
                    )}
                    <View style={styles.itemInfo}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveItem(item)}
                          activeOpacity={1}
                        >
                          <FontAwesome5
                            name="trash"
                            size={14}
                            color="#D1D5DB"
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.itemType}>
                        {getTypeLabel(item.type || "GOODS")}
                      </Text>
                      <View style={styles.itemFooter}>
                        <View style={styles.itemPriceContainer}>
                          <Text style={styles.itemPrice}>
                            {formatCurrencyVND(item.price * item.quantity || 0)}
                          </Text>
                        </View>
                        <View style={styles.quantityControl}>
                          <TouchableOpacity
                            onPress={() =>
                              handleUpdateQuantity(
                                item.cartItemId,
                                Math.max(1, (item.quantity || 1) - 1)
                              )
                            }
                            activeOpacity={1}
                            style={styles.quantityButtonContainer}
                          >
                            <FontAwesome5 name="minus" size={10} color="#6B7280" />
                          </TouchableOpacity>
                          <Text style={styles.quantity}>
                            {item.quantity || 1}
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              handleUpdateQuantity(
                                item.cartItemId,
                                (item.quantity || 1) + 1
                              )
                            }
                            activeOpacity={1}
                            style={styles.quantityButtonContainer}
                          >
                            <FontAwesome5 name="plus" size={10} color="#2563EB" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}

                {/* Pickup method selection - only show if store has service items */}
                {storeHasServices && (
                  <View style={styles.storePickupMethodCard}>
                    <Text style={styles.storePickupMethodTitle}>Giao đồ giặt</Text>
                    <View style={styles.deliveryToggleContainer}>
                      <TouchableOpacity
                        style={[
                          styles.deliveryToggleOption,
                          pickupMethod === PickupMethod.SELF && styles.deliveryToggleOptionSelected,
                        ]}
                        onPress={() => handlePickupMethodChange(storeId, PickupMethod.SELF)}
                        activeOpacity={1}
                      >
                        <Text style={[
                          styles.deliveryToggleText,
                          pickupMethod === PickupMethod.SELF && styles.deliveryToggleTextSelected,
                        ]}>
                          Tự giao
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.deliveryToggleOption,
                          pickupMethod === PickupMethod.SERVICE && styles.deliveryToggleOptionSelected,
                        ]}
                        onPress={() => handlePickupMethodChange(storeId, PickupMethod.SERVICE)}
                        activeOpacity={1}
                      >
                        <Text style={[
                          styles.deliveryToggleText,
                          pickupMethod === PickupMethod.SERVICE && styles.deliveryToggleTextSelected,
                        ]}>
                          Nhân viên đến lấy
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Pickup time selection - only show if store has service items
                {storeHasServices && (
                  <View style={styles.storePickupCard}>
                    <View style={styles.pickupTitleContainer}>
                      <FontAwesome5 name="clock" size={12} color="#1E40AF" />
                      <Text style={styles.pickupTitle}>Chọn giờ lấy đồ</Text>
                    </View>
                    <View style={styles.timeSlots}>
                      <View style={styles.timeSlotDisabled}>
                        <Text style={styles.timeSlotTextDisabled}>09:00{"\n"}Full</Text>
                      </View>
                      <View style={styles.timeSlotActive}>
                        <Text style={styles.timeSlotTextActive}>10:00{"\n"}Trống</Text>
                      </View>
                      <View style={styles.timeSlot}>
                        <Text style={styles.timeSlotText}>11:00{"\n"}Trống</Text>
                      </View>
                    </View>
                  </View>
                )} */}

                {/* Store subtotal and order button */}
                <View style={styles.storeSummaryCard}>
                  <View style={styles.storeSummaryRow}>
                    <Text style={styles.storeSummaryLabel}>Tạm tính</Text>
                    <Text style={styles.storeSummaryValue}>
                      {storeSubtotal.toLocaleString()}đ
                    </Text>
                  </View>
                  <View style={styles.storeSummaryRowFinal}>
                    <Text style={styles.storeSummaryLabelFinal}>Thành tiền</Text>
                    <Text style={styles.storeSummaryValueFinal}>
                      {storeSubtotal.toLocaleString()}đ
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.storeOrderButton}
                    onPress={() => {
                      if (!selectedAddress) {
                        Alert.alert("Lỗi", "Vui lòng chọn địa chỉ giao hàng");
                        return;
                      }

                      // Validate stock/status before checkout (GOODS only)
                      (async () => {
                        const fixes: string[] = [];
                        const removals: CartItem[] = [];
                        const updates: Array<{ item: CartItem; newQty: number }> = [];

                        for (const item of storeItems) {
                          if (item.type !== "GOODS") continue;

                          const stock = item.stockQuantity ?? 0;
                          const inactive = (item.status && item.status !== "ACTIVE") || stock <= 0;

                          if (inactive) {
                            removals.push(item);
                            continue;
                          }

                          if (item.quantity > stock) {
                            updates.push({ item, newQty: stock });
                          }
                        }

                        if (removals.length === 0 && updates.length === 0) {
                          // proceed with existing flow
                          // If store only has GOODS items, always use COMBINED
                          const deliveryOption = hasOnlyGoods
                            ? DeliveryOptions.COMBINED
                            : (storeDeliveryOptions[storeId] || DeliveryOptions.COMBINED);

                          // If SEPARATE is selected, split into service and goods orders
                          if (deliveryOption === DeliveryOptions.SEPARATE && !hasOnlyGoods) {
                            const serviceItems = storeItems.filter(item => item.type === "SERVICE");
                            const goodsItems = storeItems.filter(item => item.type === "GOODS");

                            // Store checkout data for both orders
                            setPendingCheckout({
                              address: selectedAddress,
                              walletAmount: walletBalance,
                              deliveryOption: DeliveryOptions.SEPARATE, // Mark as SEPARATE to trigger split
                              pickupMethod: storePickupMethods[storeId] || PickupMethod.SELF,
                              storeId,
                              storeItems, // Keep all items for reference
                              promotionId: undefined,
                              serviceItems, // Add service items
                              goodsItems, // Add goods items
                            });
                          } else {
                            // Store checkout data and show confirm dialog
                            setPendingCheckout({
                              address: selectedAddress,
                              walletAmount: walletBalance,
                              deliveryOption,
                              pickupMethod: storePickupMethods[storeId] || PickupMethod.SELF,
                              storeId,
                              storeItems,
                              promotionId: undefined,
                            });
                          }
                          setShowConfirmDialog(true);
                          return;
                        }

                        // Apply removals/updates then deny next step
                        for (const r of removals) {
                          await removeCartItemSilently(r.cartItemId);
                          fixes.push(`Removed "${r.name}" (out of stock/inactive)`);
                        }
                        for (const u of updates) {
                          await updateQuantitySilently(u.item.cartItemId, u.newQty);
                          fixes.push(`Adjusted "${u.item.name}" to ${u.newQty}`);
                        }

                        Alert.alert(
                          "Giỏ hàng đã được cập nhật",
                          "Một số sản phẩm đã hết hàng/không còn hoạt động hoặc vượt tồn kho. Vui lòng kiểm tra lại trước khi thanh toán."
                        );
                      })();
                    }}
                    activeOpacity={1}
                  >
                    <Text style={styles.storeOrderButtonText}>Xác nhận</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* Global summary and checkout removed - now per store */}
      </ScrollView>

      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddressModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddressModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn địa chỉ giao hàng</Text>
              <TouchableOpacity
                onPress={() => setShowAddressModal(false)}
                activeOpacity={1}
              >
                <FontAwesome5 name="times" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {addressesLoading ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.modalLoadingText}>Đang tải địa chỉ...</Text>
              </View>
            ) : allAddresses.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Text style={styles.modalEmptyText}>Chưa có địa chỉ nào</Text>
                <TouchableOpacity
                  style={styles.modalAddButton}
                  onPress={() => {
                    setShowAddressModal(false);
                    setShowAddAddressScreen(true);
                  }}
                  activeOpacity={1}
                >
                  <Text style={styles.modalAddButtonText}>
                    Thêm địa chỉ mới
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {allAddresses.map((address) => {
                  const addressData = address.address || address;
                  const fullAddress = [
                    addressData.address_detail,
                    addressData.ward,
                    addressData.district,
                    addressData.province,
                  ]
                    .filter(Boolean)
                    .join(", ");

                  const isSelected = selectedAddress?.id === address.id;

                  return (
                    <TouchableOpacity
                      key={address.id}
                      style={[
                        styles.modalAddressCard,
                        isSelected && styles.modalAddressCardSelected,
                      ]}
                      onPress={() => handleSelectAddress(address)}
                      activeOpacity={1}
                    >
                      <View style={styles.modalAddressContent}>
                        <View style={styles.modalCheckboxContainer}>
                          <View
                            style={[
                              styles.modalCheckbox,
                              isSelected && styles.modalCheckboxSelected,
                            ]}
                          >
                            {isSelected && (
                              <FontAwesome5
                                name="check"
                                size={10}
                                color="#FFFFFF"
                              />
                            )}
                          </View>
                        </View>
                        <View style={styles.modalAddressInfo}>
                          <View style={styles.modalAddressHeader}>
                            {address.is_default && (
                              <View style={styles.modalDefaultBadge}>
                                <FontAwesome5
                                  name="star"
                                  size={8}
                                  color="#F59E0B"
                                />
                                <Text style={styles.modalDefaultText}>
                                  Mặc định
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.modalAddressDetail}>
                            {address.full_name || addressData.address_detail}
                          </Text>
                          <Text style={styles.modalAddressPhone}>
                            {address.phone_number || ""}
                          </Text>
                          <Text style={styles.modalAddressFull}>
                            {fullAddress}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ConfirmDialog
        visible={showConfirmDialog}
        title="Xác nhận đặt hàng"
        message={
          pendingCheckout?.deliveryOption === DeliveryOptions.SEPARATE && 
          pendingCheckout.serviceItems && 
          pendingCheckout.goodsItems
            ? `Bạn có chắc chắn muốn đặt hàng này không?\n\nĐơn hàng sẽ được tách thành:\n- 1 đơn cho dịch vụ (${pendingCheckout.serviceItems.length} sản phẩm)\n- 1 đơn cho hàng hóa (${pendingCheckout.goodsItems.length} sản phẩm)`
            : "Bạn có chắc chắn muốn đặt hàng này không?"
        }
        confirmText="Xác nhận"
        cancelText="Hủy"
        onConfirm={() => {
          if (pendingCheckout) {
            // If SEPARATE delivery option, split into 2 orders
            if (
              pendingCheckout.deliveryOption === DeliveryOptions.SEPARATE &&
              pendingCheckout.serviceItems &&
              pendingCheckout.goodsItems
            ) {
              // Create order for SERVICE items with COMBINED option (if service items exist)
              if (pendingCheckout.serviceItems.length > 0) {
                onConfirm(
                  pendingCheckout.address,
                  pendingCheckout.walletAmount,
                  DeliveryOptions.COMBINED, // Use COMBINED for service order
                  pendingCheckout.pickupMethod,
                  pendingCheckout.storeId,
                  pendingCheckout.serviceItems,
                  pendingCheckout.promotionId
                );
              }

              // Create order for GOODS items with COMBINED option (if goods items exist)
              if (pendingCheckout.goodsItems.length > 0) {
                onConfirm(
                  pendingCheckout.address,
                  pendingCheckout.walletAmount,
                  DeliveryOptions.COMBINED, // Use COMBINED for goods order
                  pendingCheckout.pickupMethod,
                  pendingCheckout.storeId,
                  pendingCheckout.goodsItems,
                  undefined // No promotion for goods order
                );
              }
            } else {
              // Single order (COMBINED or only one type of items)
              onConfirm(
                pendingCheckout.address,
                pendingCheckout.walletAmount,
                pendingCheckout.deliveryOption,
                pendingCheckout.pickupMethod,
                pendingCheckout.storeId,
                pendingCheckout.storeItems,
                pendingCheckout.promotionId
              );
            }
          }
          setShowConfirmDialog(false);
          setPendingCheckout(null);
        }}
        onCancel={() => {
          setShowConfirmDialog(false);
          setPendingCheckout(null);
        }}
      />
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
    alignItems: "center",
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
  content: {
    flex: 1,
    padding: 16,
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
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  addressCard: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addressContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  addressIcon: {
    width: 32,
    height: 32,
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 10,
    color: "#6B7280",
    textTransform: "uppercase",
    fontWeight: "700",
  },
  addressName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  addressDetail: {
    fontSize: 12,
    color: "#6B7280",
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemIcon: {
    width: 64,
    height: 64,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  itemType: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  itemPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemPriceOriginal: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  itemPriceFree: {
    fontSize: 14,
    fontWeight: "700",
    color: "#059669",
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 12,
  },
  quantityButtonContainer: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButton: {
    fontSize: 14,
    color: "#6B7280",
  },
  quantityButtonActive: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "700",
  },
  quantity: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  packageBadge: {
    marginTop: 8,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#6EE7B7",
    alignSelf: "flex-start",
  },
  packageText: {
    fontSize: 10,
    color: "#059669",
  },
  packageDiscountBadge: {
    marginTop: 8,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignSelf: "flex-start",
  },
  packageDiscountText: {
    fontSize: 10,
    color: "#2563EB",
    fontWeight: "600",
  },
  pickupCard: {
    backgroundColor: "#EFF6FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  pickupTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  pickupTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E40AF",
  },
  timeSlots: {
    flexDirection: "row",
    gap: 8,
  },
  timeSlot: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
  },
  timeSlotText: {
    fontSize: 12,
    color: "#4B5563",
    textAlign: "center",
  },
  timeSlotDisabled: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    opacity: 0.5,
  },
  timeSlotTextDisabled: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
  timeSlotActive: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    shadowColor: "#BFDBFE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  timeSlotTextActive: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
  summaryCard: {
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
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#4B5563",
  },
  summaryValue: {
    fontSize: 14,
    color: "#4B5563",
  },
  summaryLabelGreen: {
    fontSize: 14,
    color: "#059669",
  },
  summaryValueGreen: {
    fontSize: 14,
    color: "#059669",
  },
  summaryLabelOrange: {
    fontSize: 14,
    color: "#EA580C",
  },
  summaryValueOrange: {
    fontSize: 14,
    color: "#EA580C",
  },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2563EB",
  },
  checkoutButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#BFDBFE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  checkoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  addressLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
  },
  addressLoadingText: {
    fontSize: 12,
    color: "#6B7280",
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
  modalAddButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalAddButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalAddressCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    position: "relative",
  },
  modalAddressCardSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  modalAddressContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  modalCheckboxContainer: {
    marginTop: 2,
  },
  modalCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCheckboxSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  modalAddressInfo: {
    flex: 1,
  },
  modalAddressHeader: {
    marginBottom: 8,
  },
  modalDefaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  modalDefaultText: {
    fontSize: 10,
    color: "#F59E0B",
    fontWeight: "700",
  },
  modalAddressDetail: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  modalAddressFull: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
  },
  modalAddressPhone: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  storeCard: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  storeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  storeName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  storeDeliveryOptionsCard: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  storeDeliveryOptionsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  storeDeliveryOptionsDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    lineHeight: 16,
  },
  globalDeliveryOptionsCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  globalDeliveryOptionsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  globalDeliveryOptionsDesc: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 20,
  },
  deliveryToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 4,
  },
  deliveryToggleOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  deliveryToggleOptionSelected: {
    backgroundColor: "#2563EB",
  },
  deliveryToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  deliveryToggleTextSelected: {
    color: "#FFFFFF",
  },
  storePickupMethodCard: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  storePickupMethodTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  storePickupCard: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  storeSummaryCard: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  storeSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  storeSummaryLabel: {
    fontSize: 14,
    color: "#374151",
  },
  storeSummaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  storeOrderButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  storeOrderButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
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
  storeSummaryRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  storeSummaryLabelFinal: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  storeSummaryValueFinal: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
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
  selectedPackage: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#6EE7B7",
  },
  selectedPackageInfo: {
    flex: 1,
  },
  selectedPackageName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  selectedPackageRemaining: {
    fontSize: 11,
    color: "#059669",
  },
  deletePackageButton: {
    padding: 8,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  packageListContainer: {
    // Container for vertical package list
  },
  packageOption: {
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    width: "100%",
    marginBottom: 8,
  },
  packageOptionDisabled: {
    opacity: 0.3,
  },
  packageOptionContent: {
    gap: 4,
  },
  packageOptionName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  packageOptionTextDisabled: {
    color: "#9CA3AF",
  },
  packageOptionRemaining: {
    fontSize: 10,
    color: "#059669",
  },
});
