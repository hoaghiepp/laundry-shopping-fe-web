import { ServiceSubItemsEditor } from "@/components/laundry/ServiceSubItemsEditor";
import { VariantGroupBox } from "@/components/products/VariantGroupBox";
import { VariantGroupLabel } from "@/components/products/VariantGroupLabel";
import { ProductType } from "@/constants/enum";
import { compatAlert } from "@/lib/compatAlert";
import { ProductItem } from "@/models/model";
import { orderService } from "@/services/api/orderService";
import { isStorePaymentConfirm } from "@/components/orders/utils/orderUtils";
import { StaffCheckoutItem, staffOrderService } from "@/services/api/staffOrderService";
import { StoreAddress, storeService } from "@/services/api/storeService";
import { StaffOrderCartDialog, StaffOrderCartItem } from "@/components/screens/store/StaffOrderCartDialog";
import { formatCurrencyVND } from "@/utils/format";
import {
  chargedLineAmount,
  groupLinesByParent,
  mergeSubItemDrafts,
  pieceLines,
  SubItemDraft,
  subItemQuantitySum,
  trimNote,
  validateNote,
  validateServiceSubItems,
} from "@/utils/serviceLines";
import {
  CatalogEntry,
  expandVariantGroups,
  groupCatalogProducts,
  mergeProductsById,
  variantGroupOf,
} from "@/utils/variantGroup";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
  cartItemId: string;
  parentId: string | null;
  displayName: string;
  garmentName?: string;
  note?: string;
}

interface CustomerHit {
  id: string;
  full_name?: string;
  phone_number?: string;
  customer_code?: string;
}

interface SelectedCustomer {
  id: string;
  fullName: string;
  phone: string;
  code: string;
}

const CUSTOMER_PAGE_SIZE = 10;

let localLineSeq = 0;

function nextLineId(): string {
  localLineSeq += 1;
  return `local-${Date.now()}-${localLineSeq}`;
}

function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function samePhone(a: string, b: string): boolean {
  const left = phoneDigits(a);
  const right = phoneDigits(b);
  return left.length > 0 && left === right;
}

function addressId(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function canConfirmForCustomer(createdByStore: boolean, paymentStatus?: string): boolean {
  if (!createdByStore) return false;
  return paymentStatus === "UNPAID" || paymentStatus === "WAITING_CUSTOMER_CONFIRM";
}

function staffCheckoutErrorText(message?: string): string {
  const raw = (message || "").toLowerCase();
  if (raw.includes("staff is not in this store")) return "Bạn không thuộc cửa hàng của sản phẩm này";
  if (raw.includes("product not found")) return "Sản phẩm không còn";
  if (raw.includes("sub item quantity mismatch") || raw.includes("service quantity must equal")) {
    return "Tổng số món phải bằng số lượng dịch vụ";
  }
  if (raw.includes("product is out of stock") || raw.includes("product out of stock")) {
    return "Không đủ tồn kho";
  }
  return message || "Không thể tạo đơn hàng";
}

function pieceName(line: CartEntry): string {
  return (line.garmentName || "").trim();
}

function foldCartByProduct(lines: CartEntry[]): CartEntry[] {
  const order: string[] = [];
  const folded = new Map<string, { parent: CartEntry; children: CartEntry[] }>();

  const addChild = (bucket: CartEntry[], child: CartEntry, parentId: string) => {
    const name = pieceName(child);
    const match = name ? bucket.find((line) => pieceName(line) === name) : undefined;
    if (!match) {
      bucket.push({ ...child, parentId });
      return;
    }
    match.quantity += child.quantity;
    if (!match.note && child.note) match.note = child.note;
  };

  for (const group of groupLinesByParent(lines)) {
    const productId = group.parent.product.id;
    const bucket = folded.get(productId);
    if (!bucket) {
      order.push(productId);
      folded.set(productId, {
        parent: { ...group.parent },
        children: group.children.map((child) => ({ ...child })),
      });
      continue;
    }
    if (!bucket.parent.note && group.parent.note) {
      bucket.parent = { ...bucket.parent, note: group.parent.note };
    }
    if (bucket.children.length === 0 && group.children.length === 0) {
      bucket.parent = {
        ...bucket.parent,
        quantity: bucket.parent.quantity + group.parent.quantity,
      };
      continue;
    }
    if (bucket.children.length === 0) {
      bucket.children = group.children.map((child) => ({
        ...child,
        parentId: bucket.parent.cartItemId,
      }));
      continue;
    }
    for (const child of group.children) {
      addChild(bucket.children, child, bucket.parent.cartItemId);
    }
  }

  const result: CartEntry[] = [];
  for (const productId of order) {
    const bucket = folded.get(productId);
    if (!bucket) continue;
    if (bucket.children.length === 0) {
      result.push(bucket.parent);
      continue;
    }
    const quantity = bucket.children.reduce((sum, child) => sum + child.quantity, 0);
    result.push({ ...bucket.parent, quantity });
    result.push(
      ...bucket.children.map((child) => ({ ...child, parentId: bucket.parent.cartItemId }))
    );
  }
  return result;
}

function syncParentQuantities(lines: CartEntry[]): CartEntry[] {
  const sums = new Map<string, number>();
  for (const line of lines) {
    if (!line.parentId) continue;
    sums.set(line.parentId, (sums.get(line.parentId) || 0) + line.quantity);
  }
  return lines
    .filter((line) => {
      if (line.parentId) return true;
      const sum = sums.get(line.cartItemId);
      return sum === undefined || sum > 0;
    })
    .map((line) => {
      const sum = sums.get(line.cartItemId);
      if (line.parentId || sum === undefined) return line;
      return { ...line, quantity: sum };
    });
}

function buildCheckoutItems(lines: CartEntry[]): StaffCheckoutItem[] {
  return groupLinesByParent(lines).map((group) => {
    const note = trimNote(group.parent.note);
    if (group.children.length === 0) {
      return {
        product_id: group.parent.product.id,
        quantity: group.parent.quantity,
        ...(note ? { note } : {}),
      };
    }
    const subItems = group.children.map((child) => {
      const childNote = trimNote(child.note);
      return {
        name: (child.garmentName || child.displayName).trim(),
        quantity: child.quantity,
        ...(childNote ? { note: childNote } : {}),
      };
    });
    return {
      product_id: group.parent.product.id,
      quantity: subItemQuantitySum(subItems),
      ...(note ? { note } : {}),
      sub_items: subItems,
    };
  });
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
      <VariantGroupLabel value={variantGroupOf(product)} style={pRow.unit} />
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
  const [storeAddress, setStoreAddress] = useState<StoreAddress | null>(null);
  const [storeName, setStoreName] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [sameDayService, setSameDayService] = useState(false);
  const [form, setForm] = useState<CheckoutForm>({ fullName: "", phone: "", note: "" });
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerMatches, setCustomerMatches] = useState<CustomerHit[]>([]);
  const [customerPage, setCustomerPage] = useState(0);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [customerLoadingMore, setCustomerLoadingMore] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [customerLookup, setCustomerLookup] = useState<"idle" | "loading" | "done" | "empty">("idle");
  const [subItemProduct, setSubItemProduct] = useState<ProductItem | null>(null);
  const [subItemDrafts, setSubItemDrafts] = useState<SubItemDraft[]>([]);
  const [parentNote, setParentNote] = useState("");

  useEffect(() => {
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

  useEffect(() => {
    const keyword = customerQuery.trim();
    if (keyword.length < 2) {
      setCustomerMatches([]);
      setCustomerPage(0);
      setCustomerTotal(0);
      setCustomerLookup("idle");
      return;
    }
    let cancelled = false;
    setCustomerLookup("loading");
    const timer = setTimeout(() => {
      staffOrderService
        .searchCustomers(keyword, 0, CUSTOMER_PAGE_SIZE)
        .then((res) => {
          if (cancelled) return;
          const rows: CustomerHit[] = Array.isArray(res?.data) ? res.data : [];
          const total = Number(res?.meta?.total ?? rows.length);
          setCustomerMatches(rows);
          setCustomerPage(0);
          setCustomerTotal(total);
          setCustomerLookup(rows.length === 0 ? "empty" : "done");
        })
        .catch(() => {
          if (cancelled) return;
          setCustomerMatches([]);
          setCustomerPage(0);
          setCustomerTotal(0);
          setCustomerLookup("empty");
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerQuery]);

  const fetchPage = async (pageNum: number, tab: TabType, reset: boolean) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const res = await staffOrderService.searchProducts(storeId, tab, pageNum, PAGE_SIZE);
      const pageItems: ProductItem[] = res?.data ?? [];
      const items = await expandVariantGroups(pageItems, { type: tab });
      setProducts((prev) => (reset ? items : mergeProductsById(prev, items)));
      setHasMore(pageItems.length === PAGE_SIZE);
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
    return products.filter((p) => {
      const group = variantGroupOf(p);
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (group != null && group.toLowerCase().includes(q))
      );
    });
  }, [products, searchText]);

  const countedLines = useMemo(() => pieceLines(cart), [cart]);

  const cartMap = useMemo(() => {
    const quantities: Record<string, number> = {};
    for (const entry of countedLines) {
      quantities[entry.product.id] = (quantities[entry.product.id] ?? 0) + entry.quantity;
    }
    return quantities;
  }, [countedLines]);

  const totalItems = countedLines.reduce((sum, entry) => sum + entry.quantity, 0);
  const totalPrice = cart.reduce((sum, entry) => {
    const hasChildren = cart.some((line) => line.parentId && line.parentId === entry.cartItemId);
    return sum + chargedLineAmount(entry.product.price, entry.quantity, hasChildren);
  }, 0);
  const sameDayServiceFee = sameDayService ? Math.round(totalPrice * 0.5) : 0;
  const previewTotal = totalPrice + sameDayServiceFee;
  const typedName = form.fullName.trim();
  const profileNameKept =
    !!selectedCustomer?.fullName &&
    samePhone(selectedCustomer.phone, form.phone) &&
    typedName.length > 0 &&
    typedName !== selectedCustomer.fullName;
  const canLoadMoreCustomers =
    customerMatches.length > 0 && customerMatches.length < customerTotal;
  const unpickedPhone = customerMatches.find(
    (row) => row.id !== selectedCustomer?.id && samePhone(row.phone_number || "", form.phone)
  );

  const openSubItemEditor = (product: ProductItem) => {
    setSubItemProduct(product);
    setParentNote("");
    setSubItemDrafts([{ key: `${Date.now()}`, name: "", quantity: 1, note: "" }]);
  };

  const submitSubItems = () => {
    if (!subItemProduct) return;
    const product = subItemProduct;
    const merged = mergeSubItemDrafts(subItemDrafts);
    const error = validateNote(parentNote) || validateServiceSubItems(product.name, merged);
    if (error) {
      compatAlert("Chưa hợp lệ", error);
      return;
    }
    const pieces = merged
      .map((item) => ({
        name: item.name.trim(),
        quantity: item.quantity,
        note: trimNote(item.note),
      }))
      .filter((item) => item.name);
    const note = trimNote(parentNote);
    if (pieces.length === 0) {
      setCart((prev) =>
        foldCartByProduct([
          ...prev,
          {
            product,
            quantity: Math.max(subItemQuantitySum(merged), 1),
            cartItemId: nextLineId(),
            parentId: null,
            displayName: product.name,
            note,
          },
        ])
      );
    } else {
      const parentId = nextLineId();
      const children: CartEntry[] = pieces.map((item) => ({
        product,
        quantity: item.quantity,
        cartItemId: nextLineId(),
        parentId,
        garmentName: item.name,
        displayName: `${product.name} - ${item.name}`,
        note: item.note,
      }));
      setCart((prev) =>
        foldCartByProduct([
          ...prev,
          {
            product,
            quantity: subItemQuantitySum(pieces),
            cartItemId: parentId,
            parentId: null,
            displayName: product.name,
            note,
          },
          ...children,
        ])
      );
    }
    setSubItemProduct(null);
  };

  const handleAdd = useCallback((product: ProductItem) => {
    if (product.type === ProductType.SERVICE) {
      openSubItemEditor(product);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((e) => e.product.id === product.id && !e.parentId);
      if (!existing) {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            cartItemId: nextLineId(),
            parentId: null,
            displayName: product.name,
          },
        ];
      }
      if (prev.some((line) => line.parentId === existing.cartItemId)) return prev;
      return prev.map((e) =>
        e.cartItemId === existing.cartItemId ? { ...e, quantity: e.quantity + 1 } : e
      );
    });
  }, []);

  const handleDecrease = useCallback((product: ProductItem) => {
    let blocked = false;
    setCart((prev) => {
      const existing = prev.find((e) => e.product.id === product.id && !e.parentId);
      if (!existing) return prev;
      if (prev.some((line) => line.parentId === existing.cartItemId)) {
        blocked = true;
        return prev;
      }
      if (existing.quantity <= 1) {
        return prev.filter((e) => e.cartItemId !== existing.cartItemId);
      }
      return prev.map((e) =>
        e.cartItemId === existing.cartItemId ? { ...e, quantity: e.quantity - 1 } : e
      );
    });
    if (blocked) compatAlert("Số lượng món", "Hãy sửa số lượng từng món trong giỏ hàng");
  }, []);

  const changeEntryQuantity = useCallback((entry: StaffOrderCartItem, nextQuantity: number) => {
    if (!entry.cartItemId) return;
    const lineId = entry.cartItemId;
    let blocked = false;
    setCart((prev) => {
      if (prev.some((line) => line.parentId === lineId)) {
        blocked = true;
        return prev;
      }
      const next = nextQuantity < 1
        ? prev.filter((line) => line.cartItemId !== lineId)
        : prev.map((line) =>
            line.cartItemId === lineId ? { ...line, quantity: nextQuantity } : line
          );
      return syncParentQuantities(next);
    });
    if (blocked) {
      compatAlert("Số lượng món", "Số lượng dịch vụ bằng tổng từng món. Hãy sửa món con.");
    }
  }, []);

  const handleIncreaseEntry = useCallback((entry: StaffOrderCartItem) => {
    const hasChildren = cart.some((line) => line.parentId === entry.cartItemId);
    if (hasChildren) {
      openSubItemEditor(entry.product);
      return;
    }
    changeEntryQuantity(entry, entry.quantity + 1);
  }, [cart, changeEntryQuantity]);

  const handleDecreaseEntry = useCallback((entry: StaffOrderCartItem) => {
    changeEntryQuantity(entry, entry.quantity - 1);
  }, [changeEntryQuantity]);

  const handleRemoveEntry = useCallback((entry: StaffOrderCartItem) => {
    if (!entry.cartItemId) return;
    const lineId = entry.cartItemId;
    setCart((prev) =>
      syncParentQuantities(
        prev.filter((line) => line.cartItemId !== lineId && line.parentId !== lineId)
      )
    );
  }, []);

  const pickCustomer = (row: CustomerHit) => {
    const fullName = (row.full_name || "").trim();
    const phone = row.phone_number || "";
    setSelectedCustomer({
      id: row.id,
      fullName,
      phone,
      code: (row.customer_code || "").trim(),
    });
    setForm((current) => ({ ...current, fullName, phone }));
  };

  const loadMoreCustomers = async () => {
    const keyword = customerQuery.trim();
    if (!keyword || customerLoadingMore || !canLoadMoreCustomers) return;
    const nextPage = customerPage + 1;
    if (nextPage * CUSTOMER_PAGE_SIZE >= customerTotal && customerMatches.length >= customerTotal) return;
    setCustomerLoadingMore(true);
    try {
      const res = await staffOrderService.searchCustomers(keyword, nextPage, CUSTOMER_PAGE_SIZE);
      const rows: CustomerHit[] = Array.isArray(res?.data) ? res.data : [];
      if (rows.length === 0) {
        setCustomerTotal(customerMatches.length);
        return;
      }
      setCustomerMatches((prev) => [...prev, ...rows]);
      setCustomerPage(nextPage);
      setCustomerTotal(Number(res?.meta?.total ?? customerTotal));
    } catch {
      // Keep the rows already shown.
    } finally {
      setCustomerLoadingMore(false);
    }
  };

  const handleCheckout = async () => {
    const fullName = form.fullName.trim();
    const phone = form.phone.trim();
    if (!fullName) { compatAlert("Thiếu thông tin", "Vui lòng nhập tên khách hàng"); return; }
    if (!phone) { compatAlert("Thiếu thông tin", "Vui lòng nhập số điện thoại"); return; }
    const lines = foldCartByProduct(cart);
    setCart(lines);
    const groups = groupLinesByParent(lines);
    if (groups.length === 0) { compatAlert("Lỗi", "Giỏ hàng trống"); return; }
    const quantityMismatch = groups.some((group) => {
      if (group.children.length === 0) return false;
      return group.parent.quantity !== subItemQuantitySum(group.children);
    });
    if (quantityMismatch) {
      compatAlert("Lỗi", "Tổng số món phải bằng số lượng dịch vụ");
      return;
    }

    setCheckoutLoading(true);
    try {
      const response = await staffOrderService.staffCheckout({
        phone_number: phone,
        full_name: fullName,
        items: buildCheckoutItems(lines),
        shipping_full_name: fullName,
        shipping_phone_number: phone,
        shipping_address_detail: storeAddress?.address_detail ?? "Nhận tại cửa hàng",
        shipping_district: storeAddress?.district ?? "",
        shipping_district_id: addressId(storeAddress?.district_id),
        shipping_province: storeAddress?.province ?? "",
        shipping_province_id: addressId(storeAddress?.province_id),
        shipping_ward: storeAddress?.ward ?? "",
        shipping_ward_id: addressId(storeAddress?.ward_id),
        is_need_shipment: false,
        is_split_shipment: false,
        same_day_service: sameDayService,
        note: form.note.trim() || "Nhận tại cửa hàng",
      });

      const created = response?.data;
      const orderId = created?.id as string | undefined;
      const paymentStatus = created?.payment_status as string | undefined;
      const orderCode = created?.code as string | undefined;
      const createdByStore = created?.created_by_store === true;

      setCart([]);
      setForm({ fullName: "", phone: "", note: "" });
      setCustomerQuery("");
      setSelectedCustomer(null);
      setCustomerMatches([]);
      setCustomerPage(0);
      setCustomerTotal(0);
      setCustomerLookup("idle");
      setSameDayService(false);
      setShowCheckout(false);
      setShowCart(false);

      const codeText = orderCode ? `Mã đơn ${orderCode}` : "Đã tạo đơn hàng.";
      const askCashConfirm = () => {
        if (!orderId) return;
        compatAlert(
          "Đơn đã tạo",
          "Hóa đơn đang chờ xác nhận tiền mặt. Xác nhận đã nhận tiền?",
          [
            { text: "Để sau", style: "cancel" },
            {
              text: "Đã nhận tiền",
              onPress: async () => {
                try {
                  await orderService.confirmPayment(orderId);
                  compatAlert("Thành công", "Đã xác nhận đã nhận tiền.");
                } catch (confirmErr: any) {
                  compatAlert(
                    "Lỗi",
                    confirmErr?.message || "Không thể xác nhận thanh toán"
                  );
                }
              },
            },
          ]
        );
      };
      const confirmForCustomer = async () => {
        if (!orderId) return;
        try {
          const confirmed = await staffOrderService.confirmForCustomer(orderId);
          const status = confirmed?.data?.payment_status as string | undefined;
          if (isStorePaymentConfirm(status)) askCashConfirm();
          else compatAlert("Thành công", "Đã xác nhận thay khách.");
        } catch (confirmErr: any) {
          const message = String(confirmErr?.message || "");
          const raw = message.toLowerCase();
          if (raw.includes("only a store-created order") || raw.includes("order is already paid")) {
            compatAlert("Đơn đã tạo", codeText);
            return;
          }
          if (raw.includes("not awaiting customer confirmation")) {
            try {
              const fresh = await orderService.getStaffOrderById(orderId);
              const status = fresh?.data?.payment_status as string | undefined;
              if (isStorePaymentConfirm(status)) askCashConfirm();
              else compatAlert("Thành công", "Đã xác nhận thay khách.");
            } catch (refreshErr: any) {
              compatAlert("Lỗi", refreshErr?.message || "Không tải lại được đơn.");
            }
            return;
          }
          if (raw.includes("staff is not in this store")) {
            compatAlert("Lỗi", "Bạn không thuộc cửa hàng của sản phẩm này");
            return;
          }
          compatAlert("Lỗi", message || "Không thể xác nhận thay khách");
        }
      };

      if (orderId && isStorePaymentConfirm(paymentStatus)) {
        askCashConfirm();
      } else if (orderId && canConfirmForCustomer(createdByStore, paymentStatus)) {
        compatAlert(
          "Đơn đã tạo",
          `${codeText}\nXác nhận thay khách?`,
          [
            { text: "Để sau", style: "cancel" },
            { text: "Xác nhận thay khách", onPress: confirmForCustomer },
          ]
        );
      } else {
        compatAlert("Đơn đã tạo", codeText);
      }
    } catch (e: any) {
      compatAlert("Lỗi", staffCheckoutErrorText(e.message));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const catalog = useMemo(() => groupCatalogProducts(filtered), [filtered]);

  const renderEntry = ({ item }: { item: CatalogEntry }) => {
    if (item.kind === "single") {
      return (
        <ProductRow
          product={item.product}
          cartQty={cartMap[item.product.id] ?? 0}
          loading={false}
          onAdd={() => handleAdd(item.product)}
          onRemove={() => handleDecrease(item.product)}
        />
      );
    }
    return (
      <View style={styles.variantBox}>
        <VariantGroupBox
          title={item.title}
          products={item.products}
          onSelect={handleAdd}
          optionTrailing={(product) => {
            const cartQty = cartMap[product.id] ?? 0;
            const rowLoading = false;
            if (rowLoading) return <ActivityIndicator size="small" color="#2563EB" />;
            if (cartQty === 0) {
              return (
                <TouchableOpacity style={pRow.addBtn} onPress={() => handleAdd(product)} activeOpacity={0.8}>
                  <FontAwesome5 name="plus" size={13} color="#fff" />
                </TouchableOpacity>
              );
            }
            return (
              <View style={pRow.qtyGroup}>
                <TouchableOpacity style={pRow.qtyBtn} onPress={() => handleDecrease(product)} activeOpacity={0.8}>
                  <FontAwesome5 name="minus" size={11} color="#2563EB" />
                </TouchableOpacity>
                <Text style={pRow.qtyNum}>{cartQty}</Text>
                <TouchableOpacity style={pRow.qtyBtn} onPress={() => handleAdd(product)} activeOpacity={0.8}>
                  <FontAwesome5 name="plus" size={11} color="#2563EB" />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </View>
    );
  };

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
          data={catalog}
          keyExtractor={(item) => (item.kind === "group" ? item.key : item.product.id)}
          renderItem={renderEntry}
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
        <TouchableOpacity
          style={styles.cartBar}
          onPress={() => {
            setCart((prev) => foldCartByProduct(prev));
            setShowCart(true);
          }}
          activeOpacity={0.9}
        >
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
        itemLoading={{}}
        onClose={() => setShowCart(false)}
        onCheckout={() => {
          setShowCart(false);
          setShowCheckout(true);
        }}
        onIncrease={handleIncreaseEntry}
        onDecrease={handleDecreaseEntry}
        onRemove={handleRemoveEntry}
      />

      <Modal visible={!!subItemProduct} transparent animationType="fade" onRequestClose={() => setSubItemProduct(null)}>
        <View style={subModal.overlay}>
          <View style={subModal.card}>
            <Text style={subModal.title}>{subItemProduct?.name}</Text>
            <ScrollView>
              {subItemProduct && (
                <ServiceSubItemsEditor
                  serviceName={subItemProduct.name}
                  items={subItemDrafts}
                  parentNote={parentNote}
                  onParentNoteChange={setParentNote}
                  onChange={setSubItemDrafts}
                />
              )}
            </ScrollView>
            <View style={subModal.actions}>
              <TouchableOpacity onPress={() => setSubItemProduct(null)} style={subModal.cancel}>
                <Text style={subModal.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitSubItems} style={subModal.save}>
                <Text style={subModal.saveText}>Thêm vào giỏ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={co.field}>
                    <Text style={co.label}>Tìm khách hàng</Text>
                    <TextInput
                      style={co.input}
                      placeholder="Tên, số điện thoại hoặc email"
                      placeholderTextColor="#9CA3AF"
                      value={customerQuery}
                      onChangeText={setCustomerQuery}
                    />
                    {customerLookup === "loading" ? (
                      <Text style={co.lookupHint}>Đang tìm khách...</Text>
                    ) : selectedCustomer ? (
                      <Text style={co.lookupKnown}>
                        Đã chọn: {selectedCustomer.fullName || "Khách chưa có tên"} · {selectedCustomer.phone}
                        {selectedCustomer.code ? ` · ${selectedCustomer.code}` : ""}
                      </Text>
                    ) : customerLookup === "empty" ? (
                      <Text style={co.lookupNew}>Không thấy khách. Sẽ tạo mới khi đặt hàng.</Text>
                    ) : customerLookup === "done" ? (
                      <Text style={co.lookupNew}>Chưa chọn khách. Sẽ tạo mới khi đặt hàng.</Text>
                    ) : null}
                    {customerMatches.length > 0 ? (
                      <View style={co.matchList}>
                        {customerMatches.map((row) => {
                          const chosen = selectedCustomer?.id === row.id;
                          return (
                            <TouchableOpacity
                              key={row.id}
                              style={[co.matchRow, chosen && co.matchRowSelected]}
                              onPress={() => pickCustomer(row)}
                            >
                              <Text style={co.matchName} numberOfLines={1}>
                                {(row.full_name || "").trim() || "Khách chưa có tên"}
                              </Text>
                              <Text style={co.matchPhone}>{row.phone_number}</Text>
                              {row.customer_code ? (
                                <Text style={co.matchCode}>{row.customer_code}</Text>
                              ) : null}
                            </TouchableOpacity>
                          );
                        })}
                        {canLoadMoreCustomers ? (
                          <TouchableOpacity
                            style={co.matchMore}
                            onPress={loadMoreCustomers}
                            disabled={customerLoadingMore}
                          >
                            {customerLoadingMore ? (
                              <ActivityIndicator size="small" color="#2563EB" />
                            ) : (
                              <Text style={co.matchMoreText}>Tải thêm</Text>
                            )}
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                  <View style={co.field}>
                    <Text style={co.label}>Tên khách hàng *</Text>
                    <TextInput
                      style={co.input}
                      placeholder="Nguyễn Văn A"
                      placeholderTextColor="#9CA3AF"
                      value={form.fullName}
                      onChangeText={(v) => {
                        setForm((f) => ({ ...f, fullName: v }));
                        setCustomerQuery(v);
                      }}
                    />
                    {profileNameKept ? (
                      <Text style={co.nameKept}>
                        Tên hồ sơ giữ nguyên: {selectedCustomer?.fullName}
                      </Text>
                    ) : null}
                  </View>
                  <View style={co.field}>
                    <Text style={co.label}>Số điện thoại *</Text>
                    <TextInput
                      style={co.input}
                      placeholder="0901234567"
                      placeholderTextColor="#9CA3AF"
                      value={form.phone}
                      onChangeText={(v) => {
                        setForm((f) => ({ ...f, phone: v }));
                        setCustomerQuery(v);
                        setSelectedCustomer((prev) => (prev && samePhone(prev.phone, v) ? prev : null));
                      }}
                      keyboardType="phone-pad"
                    />
                    {unpickedPhone ? (
                      <Text style={co.nameKept}>
                        Số này đã có khách {(unpickedPhone.full_name || "").trim() || "chưa có tên"}. Không chọn dòng thì tên đã lưu giữ nguyên.
                      </Text>
                    ) : null}
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
                  <View style={co.switchField}>
                    <View style={co.switchInfo}>
                      <Text style={co.label}>Dịch vụ trong ngày</Text>
                      <Text style={co.switchHint}>
                        Phụ thu 50% trên tạm tính (ước tính phía client)
                      </Text>
                    </View>
                    <Switch
                      value={sameDayService}
                      onValueChange={setSameDayService}
                      trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                      thumbColor={sameDayService ? "#2563EB" : "#F3F4F6"}
                    />
                  </View>
                  <View style={co.summary}>
                    <Text style={co.summaryTitle}>Tóm tắt đơn hàng</Text>
                    {pieceLines(cart).map((e) => (
                      <View key={e.cartItemId || e.product.id} style={co.row}>
                        <Text style={co.rowName} numberOfLines={1}>
                          {e.displayName} ×{e.quantity}
                        </Text>
                        <Text style={co.rowAmt}>
                          {formatCurrencyVND(chargedLineAmount(e.product.price, e.quantity, false))}
                        </Text>
                      </View>
                    ))}
                    <View style={co.divider} />
                    <View style={co.row}>
                      <Text style={co.rowName}>Tạm tính</Text>
                      <Text style={co.rowAmt}>{formatCurrencyVND(totalPrice)}</Text>
                    </View>
                    {sameDayService ? (
                      <View style={co.row}>
                        <Text style={co.rowName}>Phí trong ngày (+50%)</Text>
                        <Text style={co.rowAmt}>{formatCurrencyVND(sameDayServiceFee)}</Text>
                      </View>
                    ) : null}
                    <View style={co.row}>
                      <Text style={co.totalLabel}>Tổng cộng</Text>
                      <Text style={co.totalAmt}>{formatCurrencyVND(previewTotal)}</Text>
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
  variantBox: { paddingHorizontal: 12, paddingVertical: 6 },

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
  switchField: {
    marginBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchInfo: { flex: 1, minWidth: 0 },
  switchHint: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 5 },
  nameKept: { fontSize: 12, color: "#B45309", marginTop: 4 },
  lookupHint: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  lookupKnown: { fontSize: 12, fontWeight: "700", color: "#047857", marginTop: 4 },
  lookupNew: { fontSize: 12, fontWeight: "700", color: "#B45309", marginTop: 4 },
  matchList: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
  },
  matchRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#fff",
  },
  matchRowSelected: { backgroundColor: "#EFF6FF" },
  matchName: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  matchPhone: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  matchCode: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  matchMore: { paddingVertical: 10, alignItems: "center", backgroundColor: "#F9FAFB" },
  matchMoreText: { fontSize: 13, fontWeight: "700", color: "#2563EB" },
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

const subModal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    width: "50%",
    maxHeight: "80%",
  },
  title: { fontSize: 16, fontWeight: "700", color: "#111827" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12 },
  cancel: { paddingHorizontal: 14, paddingVertical: 10 },
  cancelText: { color: "#6B7280", fontWeight: "700" },
  save: { backgroundColor: "#2563EB", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  saveText: { color: "#FFFFFF", fontWeight: "700" },
});
