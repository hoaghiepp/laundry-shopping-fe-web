import { CustomerListScreen } from "@/components/screens/store/CustomerListScreen";
import { ProductType } from "@/constants/enum";
import {
    storeMainContentMarginBottom,
    storeMainContentPaddingTop,
} from "@/constants/storeWebLayout";
import { compatAlert } from "@/lib/compatAlert";
import { Order, orderService } from "@/services/api/orderService";
import { StoreCustomer, storeService } from "@/services/api/storeService";
import { formatCurrencyVND } from "@/utils/format";
import { FontAwesome5 } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type ViewTab = "stats" | "list";
type ProductTab = ProductType.SERVICE | ProductType.GOODS;
type DatePickerMode = "from" | "to" | null;

export interface CustomerSelectContext {
  fromDate: Date;
  toDate: Date;
  returnView?: ViewTab;
}

interface CustomerPeriodStat {
  customerId: string;
  fullName: string;
  phone: string;
  customerCode: string;
  orderCount: number;
  totalQuantity: number;
  totalRevenue: number;
  profile?: StoreCustomer;
}

interface CustomerScreenProps {
  storeId?: string;
  onSelectCustomer: (
    customer: StoreCustomer,
    context?: CustomerSelectContext,
  ) => void;
  initialView?: ViewTab;
}

const toDateKey = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const toInputDate = (d: Date) => toDateKey(d);

const fromInputDate = (value: string) => {
  const [y, m, day] = value.split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

type CustAcc = {
  orderIds: Set<string>;
  qty: number;
  revenue: number;
  name: string;
  phone: string;
};

async function loadCustomerProfiles(
  storeId: string,
  ids: Set<string>,
): Promise<Map<string, StoreCustomer>> {
  const map = new Map<string, StoreCustomer>();
  if (!ids.size) return map;
  let page = 0;
  const size = 100;
  for (let guard = 0; guard < 30 && map.size < ids.size; guard++) {
    const res = await storeService.getCustomerOfStore(storeId, { page, size });
    for (const c of res.data || []) {
      if (ids.has(c.id)) map.set(c.id, c);
    }
    const total = res.meta?.total ?? 0;
    if ((page + 1) * size >= total) break;
    page += 1;
  }
  return map;
}

function toCustomerRow(
  id: string,
  acc: CustAcc,
  profile?: StoreCustomer,
): CustomerPeriodStat {
  return {
    customerId: id,
    fullName: profile?.full_name || acc.name || `Khách ${id.slice(0, 8)}`,
    phone: profile?.phone_number || acc.phone || "—",
    customerCode: profile?.customer_code || "—",
    orderCount: acc.orderIds.size,
    totalQuantity: acc.qty,
    totalRevenue: acc.revenue,
    profile,
  };
}

function stubCustomer(row: CustomerPeriodStat): StoreCustomer {
  return (
    row.profile ?? {
      id: row.customerId,
      account_id: "",
      full_name: row.fullName,
      phone_number: row.phone,
      email: "",
      customer_code: row.customerCode,
      wallet_balance: 0,
      referral_code: "",
      deleted: false,
      created_date: "",
      last_modified_date: "",
    }
  );
}

export const CustomerScreen: React.FC<CustomerScreenProps> = ({
  storeId,
  onSelectCustomer,
  initialView = "stats",
}) => {
  const [viewTab, setViewTab] = useState<ViewTab>(initialView);
  const [productTab, setProductTab] = useState<ProductTab>(ProductType.SERVICE);
  const now = new Date();
  const [fromDate, setFromDate] = useState<Date>(now);
  const [toDate, setToDate] = useState<Date>(now);
  const [pickerMode, setPickerMode] = useState<DatePickerMode>(null);
  const [loading, setLoading] = useState(false);
  const [customerStats, setCustomerStats] = useState<CustomerPeriodStat[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const fetchStats = useCallback(async () => {
    if (!storeId) {
      setCustomerStats([]);
      setTotalOrders(0);
      setTotalRevenue(0);
      return;
    }
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    try {
      setLoading(true);
      const PAGE_SIZE = 1000;
      const orders: Order[] = [];
      for (let page = 0; page < 200; page++) {
        const response = await orderService.searchStoreOrders(
          {
            hub_id: storeId,
            from_date: from.toISOString(),
            to_date: to.toISOString(),
            fetch_order_items: true,
          },
          { page, size: PAGE_SIZE },
        );
        const batch = response.data || [];
        orders.push(...batch);
        if (batch.length !== PAGE_SIZE) break;
      }
      setTotalOrders(orders.length);

      const periodMap = new Map<string, CustAcc>();
      let revenueSum = 0;
      const customerIds = new Set<string>();

      const ensure = (id: string, order: Order) => {
        if (!periodMap.has(id)) {
          periodMap.set(id, {
            orderIds: new Set(),
            qty: 0,
            revenue: 0,
            name: order.shipping_full_name_snapshot || "",
            phone: order.shipping_phone_number_snapshot || "",
          });
        }
        return periodMap.get(id)!;
      };

      for (const order of orders) {
        const cid = order.customer_id;
        if (!cid) continue;
        customerIds.add(cid);
        const periodAcc = ensure(cid, order);
        periodAcc.orderIds.add(order.id);

        for (const item of order.order_items || []) {
          const ptype = String(
            item?.product_type ?? item?.type ?? ProductType.GOODS,
          );
          if (ptype !== productTab) continue;
          const qty =
            typeof item?.adjusted_quantity === "number"
              ? item.adjusted_quantity
              : (item?.quantity ?? 0);
          const income = item?.total_price ?? item?.sub_total ?? 0;
          revenueSum += income;
          periodAcc.qty += qty;
          periodAcc.revenue += income;
        }
      }

      setTotalRevenue(revenueSum);
      const profiles = await loadCustomerProfiles(storeId, customerIds);
      setCustomerStats(
        [...periodMap.entries()]
          .map(([id, acc]) => toCustomerRow(id, acc, profiles.get(id)))
          .filter(
            (r) =>
              r.orderCount > 0 || r.totalQuantity > 0 || r.totalRevenue > 0,
          )
          .sort((a, b) => b.totalRevenue - a.totalRevenue),
      );
    } catch (e: any) {
      compatAlert("Lỗi", e.message || "Không thể tải thống kê khách hàng");
    } finally {
      setLoading(false);
    }
  }, [storeId, fromDate, toDate, productTab]);

  useEffect(() => {
    if (viewTab === "stats") fetchStats();
  }, [viewTab, fetchStats]);
  useEffect(() => {
    setViewTab(initialView);
  }, [initialView]);

  const productTabLabel =
    productTab === ProductType.SERVICE ? "Dịch vụ" : "Hàng hóa";
  const maxDateStr = toInputDate(now);
  const selectContext: CustomerSelectContext = {
    fromDate,
    toDate,
    returnView: "stats",
  };

  const openCustomer = (row: CustomerPeriodStat) => {
    onSelectCustomer(stubCustomer(row), selectContext);
  };

  const customerRow = (row: CustomerPeriodStat) => (
    <TouchableOpacity
      key={row.customerId}
      style={styles.customerCard}
      onPress={() => openCustomer(row)}
      activeOpacity={0.85}
    >
      <View style={styles.customerAvatar}>
        <Text style={styles.customerAvatarText}>
          {row.fullName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.customerMain}>
        <Text style={styles.customerName} numberOfLines={1}>
          {row.fullName}
        </Text>
        <Text style={styles.customerMeta}>
          {row.customerCode} · {row.phone}
        </Text>
        <Text style={styles.customerMeta}>
          {row.orderCount} đơn · SL {row.totalQuantity}
        </Text>
      </View>
      <View style={styles.customerRight}>
        <Text style={styles.customerRevenue}>
          {formatCurrencyVND(row.totalRevenue)}
        </Text>
        <FontAwesome5 name="chevron-right" size={11} color="#D1D5DB" />
      </View>
    </TouchableOpacity>
  );

  const customerList = (rows: CustomerPeriodStat[]) => {
    if (!rows.length) {
      return (
        <View style={styles.emptyBlock}>
          <FontAwesome5 name="users" size={32} color="#D1D5DB" />
          <Text style={styles.emptyText}>Không có khách hàng trong kỳ này</Text>
        </View>
      );
    }
    return <View style={{ gap: 8 }}>{rows.map(customerRow)}</View>;
  };

  const statsBody = (
    <>
      <View style={styles.kpiRow}>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>Khách (có mua)</Text>
          <Text style={styles.kpiValue}>{customerStats.length}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>Đơn hàng</Text>
          <Text style={styles.kpiValue}>{totalOrders}</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>Doanh thu ({productTabLabel})</Text>
          <Text style={[styles.kpiValue, styles.revenue]}>
            {formatCurrencyVND(totalRevenue)}
          </Text>
        </View>
      </View>
      <View style={styles.typeRow}>
        {([ProductType.SERVICE, ProductType.GOODS] as ProductTab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typePill, productTab === t && styles.typePillOn]}
            onPress={() => setProductTab(t)}
          >
            <Text
              style={[styles.typeText, productTab === t && styles.typeTextOn]}
            >
              {t === ProductType.SERVICE ? "Dịch vụ" : "Hàng hóa"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 24 }}
        />
      ) : (
        customerList(customerStats)
      )}
    </>
  );

  const dateFiltersWeb = (
    <View style={styles.webDateRow}>
      <Text style={styles.webDateLabel}>Từ</Text>
      {Platform.OS === "web" ? (
        <input
          type="date"
          value={toInputDate(fromDate)}
          max={maxDateStr}
          onChange={(e) => {
            const d = fromInputDate(e.target.value);
            if (d) {
              setFromDate(d);
              if (d > toDate) setToDate(d);
            }
          }}
          style={webInputStyle}
        />
      ) : null}
      <Text style={styles.webDateLabel}>Đến</Text>
      {Platform.OS === "web" ? (
        <input
          type="date"
          value={toInputDate(toDate)}
          max={maxDateStr}
          min={toInputDate(fromDate)}
          onChange={(e) => {
            const d = fromInputDate(e.target.value);
            if (d) setToDate(d);
          }}
          style={webInputStyle}
        />
      ) : null}
    </View>
  );

  const viewTabs = (
    <View style={styles.viewTabs}>
      {(["stats", "list"] as ViewTab[]).map((t) => (
        <TouchableOpacity
          key={t}
          style={[styles.viewTabBtn, viewTab === t && styles.viewTabBtnOn]}
          onPress={() => setViewTab(t)}
        >
          <Text
            style={[styles.viewTabLbl, viewTab === t && styles.viewTabLblOn]}
          >
            {t === "stats" ? "Thống kê" : "Danh sách"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View style={styles.webRoot}>
        <View
          style={[
            styles.webToolbar,
            { paddingTop: storeMainContentPaddingTop() + 12 },
          ]}
        >
          <Text style={styles.webTitle}>Khách hàng</Text>
          {viewTab === "stats" ? dateFiltersWeb : null}
          {loading && viewTab === "stats" ? (
            <ActivityIndicator color="#2563EB" />
          ) : null}
          <Text style={styles.webSub}>
            Thống kê theo từng khách · chọn khách để xem lịch sử chi tiết
          </Text>
          {viewTabs}
        </View>
        {viewTab === "list" && storeId ? (
          <CustomerListScreen
            storeId={storeId}
            embedded
            onSelectCustomer={(c) => onSelectCustomer(c)}
          />
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.webScroll,
              { paddingBottom: storeMainContentMarginBottom() + 24 },
            ]}
          >
            {statsBody}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#1e40af", "#1e40af"]} style={styles.header}>
        <Text style={styles.title}>Khách hàng</Text>
        {viewTab === "stats" && (
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.datePill}
              onPress={() => setPickerMode("from")}
            >
              <Text style={styles.dateTxt}>{formatDate(fromDate)}</Text>
            </TouchableOpacity>
            <Text style={styles.dateSep}>–</Text>
            <TouchableOpacity
              style={styles.datePill}
              onPress={() => setPickerMode("to")}
            >
              <Text style={styles.dateTxt}>{formatDate(toDate)}</Text>
            </TouchableOpacity>
          </View>
        )}
        {pickerMode && (
          <DateTimePicker
            value={pickerMode === "from" ? fromDate : toDate}
            mode="date"
            onChange={(_, d) => {
              if (Platform.OS === "android") setPickerMode(null);
              if (d) {
                if (pickerMode === "from") {
                  setFromDate(d);
                  if (d > toDate) setToDate(d);
                } else setToDate(d);
                setPickerMode(null);
              }
            }}
            maximumDate={new Date()}
          />
        )}
        {viewTabs}
      </LinearGradient>
      {viewTab === "list" && storeId ? (
        <CustomerListScreen
          storeId={storeId}
          embedded
          onSelectCustomer={(c) => onSelectCustomer(c)}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {statsBody}
        </ScrollView>
      )}
    </View>
  );
};

const webInputStyle = {
  border: "1px solid #E5E7EB",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 13,
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9FAFB" },
  webRoot: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 },
  title: { color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 8 },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  datePill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dateTxt: { color: "#fff", fontSize: 12, fontWeight: "600" },
  dateSep: { color: "rgba(255,255,255,0.7)" },
  viewTabs: { flexDirection: "row", gap: 8 },
  viewTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
  },
  viewTabBtnOn: { backgroundColor: "#fff" },
  viewTabLbl: {
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
  },
  viewTabLblOn: { color: "#1e40af" },
  scroll: { padding: 16, paddingBottom: 96, gap: 12 },
  webToolbar: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  webTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  webSub: { fontSize: 13, color: "#6B7280", marginVertical: 8 },
  webDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 8,
  },
  webDateLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  webScroll: {
    padding: 24,
    gap: 12,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },
  kpiRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kpi: {
    flex: 1,
    minWidth: 100,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  kpiLabel: { fontSize: 11, color: "#6B7280", fontWeight: "600" },
  kpiValue: { fontSize: 20, fontWeight: "800", marginTop: 4, color: "#111827" },
  typeRow: { flexDirection: "row", gap: 8 },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  typePillOn: { backgroundColor: "#2563EB" },
  typeText: { fontWeight: "700", color: "#374151" },
  typeTextOn: { color: "#fff" },
  revenue: { color: "#16a34a", fontWeight: "700" },
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  customerAvatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  customerMain: { flex: 1, gap: 2 },
  customerName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  customerMeta: { fontSize: 12, color: "#6B7280" },
  customerRight: { alignItems: "flex-end", gap: 6 },
  customerRevenue: { fontSize: 13, fontWeight: "800", color: "#16a34a" },
  emptyBlock: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyText: { color: "#9CA3AF" },
});
