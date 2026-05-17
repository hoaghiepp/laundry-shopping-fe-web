import { ProductType } from "@/constants/enum";
import { ProductItem } from "@/models/model";
import { formatCurrencyVND } from "@/utils/format";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export interface StaffOrderCartItem {
  product: ProductItem;
  quantity: number;
  cartItemId: string | null;
}

export interface StaffOrderCartDialogProps {
  visible: boolean;
  storeName?: string;
  cart: StaffOrderCartItem[];
  totalItems: number;
  totalPrice: number;
  itemLoading: Record<string, boolean>;
  onClose: () => void;
  onCheckout: () => void;
  onIncrease: (product: ProductItem) => void;
  onDecrease: (product: ProductItem) => void;
  onRemove: (entry: StaffOrderCartItem) => void;
}

function getPreparationLabel(product: ProductItem): string {
  const blob = `${product.name} ${product.description || ""}`.toLowerCase();
  if (product.type === ProductType.GOODS) return "Kho · phòng";
  if (/lạnh|cold|nước lạnh|20\s*°?c/.test(blob)) return "Giặt lạnh ~20°C";
  if (/nóng|hot|90|95|60\s*°|sấy nóng/.test(blob)) return "Giặt/sấy nóng";
  if (/hấp|steam|hơi/.test(blob)) return "Xử lý hơi";
  return "Giặt 30–40°C";
}

function buildPrepSummary(cart: StaffOrderCartItem[]): string {
  const hasService = cart.some((e) => e.product.type === ProductType.SERVICE);
  const hasGoods = cart.some((e) => e.product.type === ProductType.GOODS);
  if (hasService && hasGoods) {
    return "Đơn hỗn hợp: dịch vụ giặt + hàng kho — chế độ chuẩn bị theo từng mục.";
  }
  if (hasService) {
    return "Đơn dịch vụ giặt — nhiệt độ/chương trình theo từng mục, điều chỉnh theo nhãn vải khi nhận.";
  }
  return "Đơn hàng hóa — bảo quản nhiệt độ phòng, không qua chu trình giặt.";
}

const CartLine = ({
  entry,
  loading,
  onIncrease,
  onDecrease,
  onRemove,
}: {
  entry: StaffOrderCartItem;
  loading: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}) => {
  const { product, quantity } = entry;
  const prepLabel = getPreparationLabel(product);
  const lineTotal = product.price * quantity;
  const isService = product.type === ProductType.SERVICE;

  return (
    <View style={lineStyles.card}>
      <View style={lineStyles.thumbWrap}>
        {product.thumbnail_url ? (
          <Image source={{ uri: product.thumbnail_url }} style={lineStyles.thumb} resizeMode="cover" />
        ) : (
          <View style={lineStyles.thumbPlaceholder}>
            <FontAwesome5
              name={isService ? "concierge-bell" : "box"}
              size={22}
              color="#9CA3AF"
            />
          </View>
        )}
      </View>

      <View style={lineStyles.body}>
        <Text style={lineStyles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={lineStyles.unitPrice}>
          {formatCurrencyVND(product.price)}
          {product.unit ? ` / ${product.unit}` : ""}
        </Text>
        {/* <View style={lineStyles.prepChip}>
          <FontAwesome5 name="thermometer-half" size={10} color="#B45309" />
          <Text style={lineStyles.prepChipText} numberOfLines={1}>
            {prepLabel}
          </Text>
        </View> */}
      </View>

      <View style={lineStyles.side}>
        <Text style={lineStyles.lineTotal}>{formatCurrencyVND(lineTotal)}</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 8 }} />
        ) : (
          <View style={lineStyles.qtyRow}>
            <TouchableOpacity
              style={lineStyles.qtyBtn}
              onPress={quantity === 1 ? onRemove : onDecrease}
              activeOpacity={0.75}
            >
              <FontAwesome5
                name={quantity === 1 ? "trash-alt" : "minus"}
                size={11}
                color={quantity === 1 ? "#DC2626" : "#2563EB"}
              />
            </TouchableOpacity>
            <Text style={lineStyles.qty}>{quantity}</Text>
            <TouchableOpacity style={lineStyles.qtyBtn} onPress={onIncrease} activeOpacity={0.75}>
              <FontAwesome5 name="plus" size={11} color="#2563EB" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export const StaffOrderCartDialog: React.FC<StaffOrderCartDialogProps> = ({
  visible,
  storeName,
  cart,
  totalItems,
  totalPrice,
  itemLoading,
  onClose,
  onCheckout,
  onIncrease,
  onDecrease,
  onRemove,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const prepSummary = useMemo(() => buildPrepSummary(cart), [cart]);

  const panelMaxHeight = Math.min(820, Math.floor(windowHeight * 0.9));
  const panelMaxWidth = Math.min(640, Math.max(360, Math.floor(windowWidth * 0.9)));

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Đóng giỏ hàng"
      />
      <View style={styles.center} pointerEvents="box-none">
        <View
          style={[
            styles.panel,
            cart.length > 0 && { height: panelMaxHeight },
            { maxHeight: panelMaxHeight, maxWidth: panelMaxWidth },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <FontAwesome5 name="shopping-basket" size={16} color="#1E40AF" />
              </View>
              <View style={styles.headerTextBlock}>
                <Text style={styles.headerTitle}>Giỏ hàng</Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {storeName || "Cửa hàng"} · {totalItems} món
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <FontAwesome5 name="times" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {cart.length === 0 ? (
            <View style={styles.empty}>
              <FontAwesome5 name="shopping-cart" size={44} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
              <Text style={styles.emptyHint}>Thêm sản phẩm hoặc dịch vụ để tiếp tục</Text>
            </View>
          ) : (
            <View style={styles.body}>
              {/* <View style={styles.prepBanner}>
                <FontAwesome5 name="info-circle" size={14} color="#1D4ED8" style={{ marginTop: 1 }} />
                <Text style={styles.prepBannerText}>{prepSummary}</Text>
              </View> */}

              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {cart.map((entry) => (
                  <CartLine
                    key={entry.product.id}
                    entry={entry}
                    loading={!!itemLoading[entry.product.id]}
                    onIncrease={() => onIncrease(entry.product)}
                    onDecrease={() => onDecrease(entry.product)}
                    onRemove={() => onRemove(entry)}
                  />
                ))}
              </ScrollView>

              <View style={styles.footer}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tạm tính</Text>
                  <Text style={styles.totalValue}>{formatCurrencyVND(totalPrice)}</Text>
                </View>
                <TouchableOpacity style={styles.checkoutBtn} onPress={onCheckout} activeOpacity={0.88}>
                  <Text style={styles.checkoutBtnText}>Tiến hành đặt hàng</Text>
                  <FontAwesome5 name="arrow-right" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const lineStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 10,
  },
  thumbWrap: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: "#F3F4F6",
  },
  thumb: { width: "100%", height: "100%" },
  thumbPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  body: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 19,
    marginBottom: 4,
  },
  unitPrice: { fontSize: 12, color: "#6B7280", marginBottom: 6 },
  prepChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "100%",
  },
  prepChipText: { fontSize: 11, fontWeight: "600", color: "#92400E", flexShrink: 1 },
  side: { alignItems: "flex-end", minWidth: 88 },
  lineTotal: { fontSize: 14, fontWeight: "800", color: "#1E40AF" },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: "#F8FAFC",
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  qty: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E40AF",
    minWidth: 22,
    textAlign: "center",
  },
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 300,
    elevation: 300,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  panel: {
    width: "100%",
    flexDirection: "column",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      web: { boxShadow: "0 24px 64px rgba(0,0,0,0.22)" },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 24,
      },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 0 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextBlock: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  headerSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  body: { flex: 1, minHeight: 0 },
  prepBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  prepBannerText: { flex: 1, fontSize: 12, lineHeight: 18, color: "#1E40AF" },
  list: { flex: 1, minHeight: 0 },
  listContent: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 15, fontWeight: "600", color: "#374151" },
  totalValue: { fontSize: 20, fontWeight: "800", color: "#1E40AF" },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
  },
  checkoutBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  emptyHint: { fontSize: 13, color: "#9CA3AF", textAlign: "center" },
});
