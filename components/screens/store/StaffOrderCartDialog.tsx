import { VariantGroupLabel } from "@/components/products/VariantGroupLabel";
import { ProductType } from "@/constants/enum";
import { variantGroupOf } from "@/utils/variantGroup";
import { ProductItem } from "@/models/model";
import { formatCurrencyVND } from "@/utils/format";
import { chargedLineAmount, groupLinesByParent } from "@/utils/serviceLines";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  type StyleProp,
  type TextStyle,
} from "react-native";

export interface StaffOrderCartItem {
  product: ProductItem;
  quantity: number;
  cartItemId: string | null;
  parentId: string | null;
  displayName: string;
  garmentName?: string;
  note?: string;
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
  onIncrease: (entry: StaffOrderCartItem) => void;
  onDecrease: (entry: StaffOrderCartItem) => void;
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

function TruncatedName({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  const ref = useRef<Text>(null);
  const tipRef = useRef<{ remove: () => void } | null>(null);

  const hide = () => {
    tipRef.current?.remove();
    tipRef.current = null;
  };

  const show = (force = false) => {
    const node = ref.current as unknown as HTMLElement | null;
    const overflows =
      !!node && typeof node.scrollWidth === "number" && node.scrollWidth > node.clientWidth + 1;
    if (!force && !overflows) return;
    if (force && !overflows && text.length <= 24) return;
    if (Platform.OS === "web" && typeof document === "undefined") return;
    if (Platform.OS !== "web" || !node) return;
    hide();
    const rect = node.getBoundingClientRect();
    const tip = document.createElement("div");
    tip.textContent = text;
    const below = rect.bottom + 6;
    const placeAbove = below + 48 > window.innerHeight;
    Object.assign(tip.style, {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${placeAbove ? rect.top - 6 : below}px`,
      transform: placeAbove ? "translateY(-100%)" : "",
      zIndex: "100000",
      maxWidth: "360px",
      background: "#111827",
      color: "#F9FAFB",
      padding: "8px 10px",
      borderRadius: "8px",
      fontSize: "13px",
      lineHeight: "18px",
      pointerEvents: "none",
    });
    document.body.appendChild(tip);
    tipRef.current = tip;
  };

  useEffect(() => hide, []);

  return (
    <Pressable
      style={lineStyles.nameWrap}
      onPressIn={() => show(true)}
      onPressOut={hide}
      {...(Platform.OS === "web" ? { onMouseEnter: () => show(false), onMouseLeave: hide } : {})}
    >
      <Text ref={ref} style={[style, lineStyles.ellipsis]} numberOfLines={1} ellipsizeMode="tail">
        {text}
      </Text>
    </Pressable>
  );
}

const SubItemLine = ({
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
  const { quantity } = entry;
  const lineTotal = chargedLineAmount(entry.product.price, quantity, false);

  return (
    <View style={lineStyles.subRow}>
      <TruncatedName
        text={entry.garmentName?.trim() || entry.displayName || entry.product.name}
        style={lineStyles.subName}
      />
      {entry.note ? <TruncatedName text={entry.note} style={lineStyles.subNote} /> : null}
      <Text style={lineStyles.subPrice}>{formatCurrencyVND(lineTotal)}</Text>
      {loading ? (
        <ActivityIndicator size="small" color="#2563EB" />
      ) : (
        <View style={[lineStyles.qtyRow, lineStyles.subQty]}>
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
  );
};

const CartLine = ({
  entry,
  loading,
  locked,
  collapsible,
  expanded,
  onToggle,
  onIncrease,
  onDecrease,
  onRemove,
  footer,
}: {
  entry: StaffOrderCartItem;
  loading: boolean;
  locked: boolean;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  footer?: React.ReactNode;
}) => {
  const { product, quantity } = entry;
  const prepLabel = getPreparationLabel(product);
  const lineTotal = chargedLineAmount(product.price, quantity, !!locked);
  const isService = product.type === ProductType.SERVICE;

  return (
    <View style={lineStyles.card}>
      <View style={lineStyles.top}>
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
        <View style={lineStyles.nameRow}>
          {collapsible ? (
            <TouchableOpacity
              onPress={onToggle}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={expanded ? "Thu gọn món" : "Xem món"}
            >
              <FontAwesome5
                name={expanded ? "chevron-down" : "chevron-right"}
                size={12}
                color="#6B7280"
              />
            </TouchableOpacity>
          ) : null}
          <Text style={[lineStyles.name, lineStyles.nameFlex]} numberOfLines={2}>
            {entry.displayName || product.name}
          </Text>
          <VariantGroupLabel value={variantGroupOf(product)} style={lineStyles.unitPrice} />
        </View>
        {entry.note ? (
          <Text style={lineStyles.note} numberOfLines={2}>{entry.note}</Text>
        ) : null}
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
        {locked ? null : <Text style={lineStyles.lineTotal}>{formatCurrencyVND(lineTotal)}</Text>}
        {loading ? (
          <ActivityIndicator size="small" color="#2563EB" style={{ marginTop: 8 }} />
        ) : (
          <View style={lineStyles.qtyRow}>
            {locked ? (
              <TouchableOpacity style={lineStyles.qtyBtn} onPress={onRemove} activeOpacity={0.75}>
                <FontAwesome5 name="trash-alt" size={11} color="#DC2626" />
              </TouchableOpacity>
            ) : (
              <>
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
              </>
            )}
          </View>
        )}
      </View>
      </View>
      {footer}
    </View>
  );
};

export const StaffOrderCartDialog: React.FC<StaffOrderCartDialogProps> = ({
  visible,
  storeName,
  cart,
  totalItems,
  itemLoading,
  onClose,
  onCheckout,
  onIncrease,
  onDecrease,
  onRemove,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const prepSummary = useMemo(() => buildPrepSummary(cart), [cart]);
  const groups = useMemo(() => groupLinesByParent(cart), [cart]);
  const totals = useMemo(() => {
    let service = 0;
    let goods = 0;
    for (const entry of cart) {
      const hasChildren = cart.some((line) => line.parentId && line.parentId === entry.cartItemId);
      const amount = chargedLineAmount(entry.product.price, entry.quantity, hasChildren);
      if (entry.product.type === ProductType.SERVICE) service += amount;
      else goods += amount;
    }
    return { service, goods, total: service + goods };
  }, [cart]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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
                {groups.map((group) => {
                  const parent = group.parent;
                  const parentKey = parent.cartItemId || parent.product.id;
                  const hasChildren = group.children.length > 0;
                  const expanded = !collapsed[parentKey];
                  return (
                    <View key={parentKey}>
                      <CartLine
                        entry={parent}
                        locked={hasChildren}
                        collapsible={hasChildren}
                        expanded={expanded}
                        onToggle={() =>
                          setCollapsed((current) => ({ ...current, [parentKey]: expanded }))
                        }
                        loading={!!itemLoading[parent.cartItemId || parent.product.id]}
                        onIncrease={() => onIncrease(parent)}
                        onDecrease={() => onDecrease(parent)}
                        onRemove={() => onRemove(parent)}
                        footer={
                          hasChildren && expanded
                            ? group.children.map((child) => (
                                <SubItemLine
                                  key={child.cartItemId || `${parentKey}-${child.displayName}`}
                                  entry={child}
                                  loading={!!itemLoading[child.cartItemId || child.product.id]}
                                  onIncrease={() => onIncrease(child)}
                                  onDecrease={() => onDecrease(child)}
                                  onRemove={() => onRemove(child)}
                                />
                              ))
                            : null
                        }
                      />
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.footer}>
                <View style={styles.totalRow}>
                  <Text style={styles.splitLabel}>Dịch vụ</Text>
                  <Text style={styles.splitValue}>{formatCurrencyVND(totals.service)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.splitLabel}>Hàng hóa</Text>
                  <Text style={styles.splitValue}>{formatCurrencyVND(totals.goods)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tạm tính</Text>
                  <Text style={styles.totalValue}>{formatCurrencyVND(totals.total)}</Text>
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
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
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
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  nameFlex: { flex: 1, marginBottom: 0 },
  nameWrap: { flex: 1, minWidth: 0 },
  ellipsis: { width: "100%" },
  note: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 19,
    marginBottom: 4,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 0,
    marginBottom: 0,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  subName: { fontSize: 13, fontWeight: "600", color: "#111827" },
  subNote: { fontSize: 12, fontWeight: "400", color: "#6B7280" },
  subPrice: { flexShrink: 0, fontSize: 13, fontWeight: "700", color: "#1E40AF" },
  subQty: { marginTop: 0, flexShrink: 0 },
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
  splitLabel: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  splitValue: { fontSize: 14, fontWeight: "700", color: "#374151" },
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
