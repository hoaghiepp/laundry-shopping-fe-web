import { ProductType } from "@/constants/enum";
import { compatAlert } from "@/lib/compatAlert";
import { ProductItem } from "@/models/model";
import { ensureCustomerOrderTokensFromStorage } from "@/lib/customerOrderSession";
import { staffOrderService } from "@/services/api/staffOrderService";
import { StoreAddress, storeService } from "@/services/api/storeService";
import { StaffOrderCartDialog } from "@/components/screens/store/StaffOrderCartDialog";
import { formatCurrencyVND } from "@/utils/format";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabType = "SERVICE" | "GOODS";

interface CartEntry {
  product: ProductItem;
  quantity: number;
  cartItemId: string | null;
}

interface CheckoutForm {
  fullName: string;
  phone: string;
  note: string;
}

interface StaffOrderScreenProps {
  storeId: string;
  onBack: () => void;
  /** When shown inside store-home modal dialog, use a compact header (no large status-bar inset). */
  embedded?: boolean;
}

const PAGE_SIZE = 20;

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: "GOODS",   label: "Sản phẩm",  icon: "box" },
  { key: "SERVICE", label: "Dịch vụ", icon: "concierge-bell" },
];

// ─── Product Row ──────────────────────────────────────────────────────────────

const ProductRow = React.memo(({
  product, cartQty, loading, onAdd, onRemove,
}: {
  product: ProductItem;
  cartQty: number;
  loading: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) => (
  <View style={pRow.container}>
    <View style={pRow.imageBox}>
      {product.thumbnail_url ? (
        <Image source={{ uri: product.thumbnail_url }} style={pRow.image} resizeMode="cover" />
      ) : (
        <View style={pRow.imagePlaceholder}>
          <FontAwesome5
            name={product.type === ProductType.SERVICE ? "concierge-bell" : "box"}
            size={20}
            color="#9CA3AF"
          />
        </View>
      )}
    </View>

    <View style={pRow.info}>
      <Text style={pRow.name} numberOfLines={2}>{product.name}</Text>
      <Text style={pRow.price}>{formatCurrencyVND(product.price)}</Text>
      {product.unit ? <Text style={pRow.unit}>/ {product.unit}</Text> : null}
    </View>

    <View style={pRow.controls}>
      {loading ? (
        <ActivityIndicator size="small" color="#2563EB" />
      ) : cartQty === 0 ? (
        <TouchableOpacity style={pRow.addBtn} onPress={onAdd} activeOpacity={0.8}>
          <FontAwesome5 name="plus" size={13} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View style={pRow.qtyGroup}>
          <TouchableOpacity style={pRow.qtyBtn} onPress={onRemove} activeOpacity={0.8}>
            <FontAwesome5 name="minus" size={11} color="#2563EB" />
          </TouchableOpacity>
          <Text style={pRow.qtyNum}>{cartQty}</Text>
          <TouchableOpacity style={pRow.qtyBtn} onPress={onAdd} activeOpacity={0.8}>
            <FontAwesome5 name="plus" size={11} color="#2563EB" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  </View>
));

export const StaffOrderScreen: React.FC<StaffOrderScreenProps> = ({
  storeId,
  onBack,
  embedded,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("GOODS");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [itemLoading, setItemLoading] = useState<Record<string, boolean>>({});
  const [cartSyncing, setCartSyncing] = useState(false);
  const [storeAddress, setStoreAddress] = useState<StoreAddress | null>(null);
  const [storeName, setStoreName] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [form, setForm] = useState<CheckoutForm>({ fullName: "", phone: "", note: "" });

  // Load cart and store profile when store changes
  useEffect(() => {
    syncCart();
    if (storeId) {
      storeService
        .getStoreProfile(storeId)
        .then((res) => {
          const data = res?.data;
          if (data?.name) setStoreName(data.name);
          const addr = data?.address;
          if (addr && typeof addr !== "string") setStoreAddress(addr as StoreAddress);
        })
        .catch(() => {});
    } else {
      setStoreName("");
      setStoreAddress(null);
    }
  }, [storeId]);

  // Reset and reload when tab changes
  useEffect(() => {
    setProducts([]);
    setPage(0);
    setHasMore(true);
    fetchPage(0, activeTab, true);
  }, [activeTab, storeId]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    if (!showCart && !showCheckout) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (showCheckout) {
        setShowCheckout(false);
        return true;
      }
      if (showCart) {
        setShowCart(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [showCart, showCheckout]);

  const syncCart = async () => {
    setCartSyncing(true);
    try {
      await ensureCustomerOrderTokensFromStorage();
      const res = await staffOrderService.getCustomerCart();
      const items: any[] = res?.data?.cart_items ?? [];
      setCart(
        items
          .filter((item: any) => item?.product)
          .map((item: any) => ({
            product: item.product as ProductItem,
            quantity: item.quantity,
            cartItemId: item.id,
          }))
      );
    } catch {
      // silently ignore — cart stays as-is
    } finally {
      setCartSyncing(false);
    }
  };

  const fetchPage = async (pageNum: number, tab: TabType, reset: boolean) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const res = await staffOrderService.searchProducts(storeId, tab, pageNum, PAGE_SIZE);
      const items: ProductItem[] = res?.data ?? [];
      setProducts((prev) => reset ? items : [...prev, ...items]);
      setHasMore(items.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (e: any) {
      compatAlert("Lỗi", e.message || "Không thể tải sản phẩm");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    fetchPage(page + 1, activeTab, false);
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return;
    setSearchText("");
    setActiveTab(tab);
  };

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))
    );
  }, [products, searchText]);

  const cartMap = useMemo(() => {
    const m: Record<string, CartEntry> = {};
    cart.forEach((e) => { m[e.product.id] = e; });
    return m;
  }, [cart]);

  const totalItems = cart.reduce((s, e) => s + e.quantity, 0);
  const totalPrice = cart.reduce((s, e) => s + e.product.price * e.quantity, 0);

  const setLoadingFor = (id: string, v: boolean) =>
    setItemLoading((prev) => ({ ...prev, [id]: v }));

  const handleAdd = useCallback(async (product: ProductItem) => {
    const existing = cart.find((e) => e.product.id === product.id);
    setLoadingFor(product.id, true);
    try {
      if (existing) {
        if (existing.cartItemId) await staffOrderService.updateCartItem(existing.cartItemId, existing.quantity + 1);
      } else {
        await staffOrderService.addToCart(product.id, 1);
      }
      await syncCart();
    } catch (e: any) {
      compatAlert("Lỗi", e.message || "Không thể thêm vào giỏ");
    } finally {
      setLoadingFor(product.id, false);
    }
  }, [cart]);

  const handleDecrease = useCallback(async (product: ProductItem) => {
    const existing = cart.find((e) => e.product.id === product.id);
    if (!existing) return;
    setLoadingFor(product.id, true);
    try {
      if (existing.cartItemId) {
        if (existing.quantity === 1) {
          await staffOrderService.removeCartItem(existing.cartItemId);
        } else {
          await staffOrderService.updateCartItem(existing.cartItemId, existing.quantity - 1);
        }
      }
      await syncCart();
    } catch (e: any) {
      compatAlert("Lỗi", e.message || "Không thể cập nhật giỏ");
    } finally {
      setLoadingFor(product.id, false);
    }
  }, [cart]);

  const handleRemoveEntry = useCallback(async (entry: CartEntry) => {
    setLoadingFor(entry.product.id, true);
    try {
      if (entry.cartItemId) await staffOrderService.removeCartItem(entry.cartItemId);
      await syncCart();
    } catch (e: any) {
      compatAlert("Lỗi", e.message || "Không thể xóa khỏi giỏ");
    } finally {
      setLoadingFor(entry.product.id, false);
    }
  }, []);

  const handleCheckout = async () => {
    if (!form.fullName.trim()) { compatAlert("Thiếu thông tin", "Vui lòng nhập tên khách hàng"); return; }
    if (!form.phone.trim()) { compatAlert("Thiếu thông tin", "Vui lòng nhập số điện thoại"); return; }
    const cartItemIds = cart.filter((e) => e.cartItemId).map((e) => e.cartItemId as string);
    if (cartItemIds.length === 0) { compatAlert("Lỗi", "Giỏ hàng trống"); return; }

    setCheckoutLoading(true);
    try {
      const response = await staffOrderService.checkout({
        cart_item_ids: cartItemIds,
        shipping_full_name: form.fullName.trim(),
        shipping_phone_number: form.phone.trim(),
        shipping_address_detail: storeAddress?.address_detail ?? "Nhận tại cửa hàng",
        shipping_district: storeAddress?.district ?? "",
        shipping_district_id: storeAddress?.district_id ?? 0,
        shipping_province: storeAddress?.province ?? "",
        shipping_province_id: storeAddress?.province_id ?? 0,
        shipping_ward: storeAddress?.ward ?? "",
        shipping_ward_id: storeAddress?.ward_id ?? 0,
        is_need_shipment: false,
        is_split_shipment: false,
        note: form.note.trim() || "Nhận tại cửa hàng",
      });

      const orderId = response?.data?.id as string | undefined;
      let confirmWarned = false;
      if (orderId) {
        try {
          const res = await staffOrderService.confirmCustomerOrderNoPayment(orderId);
          console.log("confirmCustomerOrderNoPayment res", res);
        } catch (confirmErr: any) {
          confirmWarned = true;
          compatAlert(
            "Cảnh báo",
            confirmErr?.message ||
              "Đơn hàng đã tạo nhưng không thể xác nhận thanh toán không phụ phí. Vui lòng xử lý đơn trên hệ thống."
          );
        }
      }

      await syncCart();
      setForm({ fullName: "", phone: "", note: "" });
      setShowCheckout(false);
      setShowCart(false);
      if (!confirmWarned) {
        compatAlert("Thành công", "Đã tạo đơn hàng thành công!");
      }
    } catch (e: any) {
      compatAlert("Lỗi", e.message || "Không thể tạo đơn hàng");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const renderProduct = ({ item }: { item: ProductItem }) => (
    <ProductRow
      product={item}
      cartQty={cartMap[item.id]?.quantity ?? 0}
      loading={!!itemLoading[item.id]}
      onAdd={() => handleAdd(item)}
      onRemove={() => handleDecrease(item)}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadMoreRow}>
        <ActivityIndicator size="small" color="#2563EB" />
        <Text style={styles.loadMoreText}>Đang tải thêm...</Text>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={[styles.header, embedded && styles.headerEmbedded]}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <FontAwesome5 name="arrow-left" size={16} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo đơn hàng</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setShowCart(true)} activeOpacity={0.8}>
          <FontAwesome5 name="shopping-cart" size={16} color="#fff" />
          {totalItems > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchBar}>
        <FontAwesome5 name="search" size={13} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm trong danh sách..."
          placeholderTextColor="#9CA3AF"
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <FontAwesome5 name="times" size={13} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => handleTabChange(tab.key)}
              activeOpacity={0.8}
            >
              <FontAwesome5
                name={tab.icon}
                size={12}
                color={active ? "#2563EB" : "#6B7280"}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Product List ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.hint}>Đang tải...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <FontAwesome5 name="box-open" size={40} color="#D1D5DB" />
          <Text style={styles.hint}>Không có sản phẩm</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[styles.listContent, totalItems > 0 && { paddingBottom: 76 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onEndReached={searchText ? undefined : handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
        />
      )}

      {/* ── Cart Bar ── */}
      {totalItems > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={() => setShowCart(true)} activeOpacity={0.9}>
          <View style={styles.cartBarLeft}>
            <View style={styles.cartBarBadge}>
              <Text style={styles.cartBarBadgeText}>{totalItems}</Text>
            </View>
            <Text style={styles.cartBarLabel}>Xem giỏ hàng</Text>
          </View>
          <View style={styles.cartBarRight}>
            <Text style={styles.cartBarTotal}>{formatCurrencyVND(totalPrice)}</Text>
            <FontAwesome5 name="chevron-up" size={11} color="#fff" style={{ marginLeft: 6 }} />
          </View>
        </TouchableOpacity>
      )}

      <StaffOrderCartDialog
        visible={showCart}
        storeName={storeName}
        cart={cart}
        totalItems={totalItems}
        totalPrice={totalPrice}
        itemLoading={itemLoading}
        onClose={() => setShowCart(false)}
        onCheckout={() => {
          setShowCart(false);
          setShowCheckout(true);
        }}
        onIncrease={handleAdd}
        onDecrease={handleDecrease}
        onRemove={handleRemoveEntry}
      />

      {/* ── Checkout — same inline dialog pattern ── */}
      {showCheckout && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={cartDialog.kav}
        >
          <View style={cartDialog.kavInner} pointerEvents="box-none">
            <Pressable
              style={cartDialog.backdrop}
              onPress={() => setShowCheckout(false)}
              accessibilityRole="button"
              accessibilityLabel="Đóng"
            />
            <View style={cartDialog.lift} pointerEvents="box-none">
              <View style={[sheet.panel, sheet.checkoutPanel]}>
                <View style={sheet.handle} />
                <View style={sheet.header}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowCheckout(false);
                      setShowCart(true);
                    }}
                  >
                    <FontAwesome5 name="arrow-left" size={16} color="#6B7280" />
                  </TouchableOpacity>
                  <Text style={sheet.title}>Thông tin đặt hàng</Text>
                  <TouchableOpacity onPress={() => setShowCheckout(false)}>
                    <FontAwesome5 name="times" size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={co.field}>
                    <Text style={co.label}>Tên khách hàng *</Text>
                    <TextInput
                      style={co.input}
                      placeholder="Nguyễn Văn A"
                      placeholderTextColor="#9CA3AF"
                      value={form.fullName}
                      onChangeText={(v) => setForm((f) => ({ ...f, fullName: v }))}
                    />
                  </View>
                  <View style={co.field}>
                    <Text style={co.label}>Số điện thoại *</Text>
                    <TextInput
                      style={co.input}
                      placeholder="0901234567"
                      placeholderTextColor="#9CA3AF"
                      value={form.phone}
                      onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={co.field}>
                    <Text style={co.label}>Ghi chú</Text>
                    <TextInput
                      style={[co.input, co.textarea]}
                      placeholder="Ghi chú cho đơn hàng..."
                      placeholderTextColor="#9CA3AF"
                      value={form.note}
                      onChangeText={(v) => setForm((f) => ({ ...f, note: v }))}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                  <View style={co.summary}>
                    <Text style={co.summaryTitle}>Tóm tắt đơn hàng</Text>
                    {cart.map((e) => (
                      <View key={e.product.id} style={co.row}>
                        <Text style={co.rowName} numberOfLines={1}>
                          {e.product.name} ×{e.quantity}
                        </Text>
                        <Text style={co.rowAmt}>{formatCurrencyVND(e.product.price * e.quantity)}</Text>
                      </View>
                    ))}
                    <View style={co.divider} />
                    <View style={co.row}>
                      <Text style={co.totalLabel}>Tổng cộng</Text>
                      <Text style={co.totalAmt}>{formatCurrencyVND(totalPrice)}</Text>
                    </View>
                  </View>
                </ScrollView>

                <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                  <TouchableOpacity
                    style={[sheet.checkoutBtn, checkoutLoading && { opacity: 0.7 }]}
                    onPress={handleCheckout}
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={sheet.checkoutBtnText}>Xác nhận đặt hàng</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F3F4F6", position: "relative" },
  header: {
    backgroundColor: "#1E40AF",
    paddingTop: 44,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerEmbedded: {
    paddingTop: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  headerTitle: { flex: 1, color: "#fff", fontSize: 18, fontWeight: "700" },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#1F2937", paddingVertical: 0 },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 4,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 7,
  },
  tabActive: { backgroundColor: "#EFF6FF" },
  tabLabel: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  tabLabelActive: { color: "#2563EB" },

  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },
  hint: { color: "#9CA3AF", fontSize: 14 },
  separator: { height: 1, backgroundColor: "#F3F4F6", marginLeft: 96 },
  listContent: { paddingVertical: 4 },

  loadMoreRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  loadMoreText: { fontSize: 13, color: "#9CA3AF" },

  cartBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1E40AF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  cartBarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  cartBarBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  cartBarBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cartBarLabel: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cartBarRight: { flexDirection: "row", alignItems: "center" },
  cartBarTotal: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

const pRow = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  imageBox: { width: 64, height: 64, borderRadius: 10, overflow: "hidden", flexShrink: 0 },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600", color: "#1F2937", lineHeight: 20, marginBottom: 4 },
  price: { fontSize: 14, fontWeight: "700", color: "#2563EB" },
  unit: { fontSize: 12, color: "#9CA3AF" },
  controls: { alignItems: "center", justifyContent: "center" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyNum: { fontSize: 15, fontWeight: "700", color: "#1E40AF", minWidth: 22, textAlign: "center" },
});

const cartDialog = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  lift: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  kav: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 210,
    elevation: 210,
  },
  kavInner: {
    flex: 1,
    position: "relative",
  },
});

const sheet = StyleSheet.create({
  panel: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 28,
  },
  checkoutPanel: {
    maxHeight: "75%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: "#1F2937", textAlign: "center" },
  list: { flexGrow: 0 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 10,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 15, fontWeight: "600", color: "#374151" },
  totalAmt: { fontSize: 18, fontWeight: "800", color: "#1E40AF" },
  checkoutBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  checkoutBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

const co = StyleSheet.create({
  field: { marginBottom: 12, paddingHorizontal: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
    backgroundColor: "#fff",
  },
  textarea: { height: 72, textAlignVertical: "top" },
  summary: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  summaryTitle: { fontSize: 13, fontWeight: "700", color: "#374151", marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  rowName: { flex: 1, fontSize: 13, color: "#6B7280", marginRight: 8 },
  rowAmt: { fontSize: 13, color: "#374151" },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 8 },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  totalAmt: { fontSize: 15, fontWeight: "800", color: "#1E40AF" },
});
