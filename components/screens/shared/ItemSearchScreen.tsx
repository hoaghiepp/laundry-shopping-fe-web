import { conditionLabel, formatDate } from "@/components/store/logistics/logisticsUtils";
import { compatAlert } from "@/lib/compatAlert";
import { extractApiErrorMessage } from "@/services/api/apiUtils";
import { logisticService, SearchTrackingItemsRequest } from "@/services/api/logisticService";
import { ITEM_TRACKING_STATUSES, trackingStatusLabel } from "@/utils/serviceLines";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const CONDITIONS = [
  { value: "", label: "Mọi tình trạng" },
  { value: "NORMAL", label: "Bình thường" },
  { value: "DAMAGED", label: "Hư hỏng" },
  { value: "MISSING", label: "Thất lạc" },
];

const STORE_TYPES = [
  { value: "", label: "Mọi điểm" },
  { value: "HUB", label: "Cửa hàng" },
  { value: "FACTORY", label: "Xưởng" },
];

interface ItemSearchScreenProps {
  currentStoreId?: string;
  onBack?: () => void;
  /** Pixels already used by the store header and tab bar. */
  topInset?: number;
  onOpenPassport: (trackingId: string, barcode?: string) => void;
}

export const ItemSearchScreen: React.FC<ItemSearchScreenProps> = ({
  currentStoreId,
  onBack,
  topInset = 48,
  onOpenPassport,
}) => {
  const [barcode, setBarcode] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [status, setStatus] = useState("");
  const [condition, setCondition] = useState("");
  const [storeType, setStoreType] = useState("");
  const [onlyThisStore, setOnlyThisStore] = useState(!!currentStoreId);
  const [stalled, setStalled] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    const body: SearchTrackingItemsRequest = {};
    if (barcode.trim()) body.barcode = barcode.trim();
    if (orderCode.trim()) body.order_code = orderCode.trim();
    if (status) body.status = status;
    if (condition) body.item_condition = condition;
    if (storeType) body.store_type = storeType;
    if (onlyThisStore && currentStoreId) body.current_store_id = currentStoreId;
    if (stalled) body.stalled_before = new Date().toISOString();

    setLoading(true);
    try {
      const response = await logisticService.searchTrackingItems(body, { page: 0, size: 50 });
      setRows(response?.data || []);
      setSearched(true);
    } catch (error) {
      compatAlert("Lỗi", extractApiErrorMessage(error, "Không thể tìm món đồ"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <FontAwesome5 name="arrow-left" size={16} color="#1F2937" />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.title}>Tra cứu món đồ</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          style={styles.input}
          value={barcode}
          onChangeText={setBarcode}
          accessibilityLabel="Barcode"
          placeholder="Barcode"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          value={orderCode}
          onChangeText={setOrderCode}
          accessibilityLabel="Mã đơn"
          placeholder="Mã đơn"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="characters"
        />
        <Text style={styles.label}>Trạng thái</Text>
        <View style={styles.chips}>
          <Chip label="Tất cả" active={!status} onPress={() => setStatus("")} />
          {ITEM_TRACKING_STATUSES.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              active={status === item.value}
              onPress={() => setStatus(item.value)}
            />
          ))}
        </View>
        <Text style={styles.label}>Tình trạng</Text>
        <View style={styles.chips}>
          {CONDITIONS.map((item) => (
            <Chip
              key={item.label}
              label={item.label}
              active={condition === item.value}
              onPress={() => setCondition(item.value)}
            />
          ))}
        </View>
        <Text style={styles.label}>Loại điểm</Text>
        <View style={styles.chips}>
          {STORE_TYPES.map((item) => (
            <Chip
              key={item.label}
              label={item.label}
              active={storeType === item.value}
              onPress={() => setStoreType(item.value)}
            />
          ))}
        </View>
        {currentStoreId ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Chỉ điểm hiện tại</Text>
            <Switch value={onlyThisStore} onValueChange={setOnlyThisStore} />
          </View>
        ) : null}
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Món đang kẹt</Text>
          <Switch value={stalled} onValueChange={setStalled} />
        </View>
        <TouchableOpacity style={styles.primary} onPress={search} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Tìm</Text>}
        </TouchableOpacity>

        {rows.map((row) => (
          <TouchableOpacity
            key={row.id}
            style={styles.card}
            onPress={() => row.id && onOpenPassport(row.id, row.barcode)}
          >
            <Text style={styles.cardTitle}>{row.barcode || row.id}</Text>
            <Text style={styles.meta}>Đơn {row.order_code || "—"}</Text>
            <Text style={styles.meta}>
              {trackingStatusLabel(row.status)} · {conditionLabel(row.item_condition)}
            </Text>
            <Text style={styles.meta}>
              {row.last_event_at ? formatDate(row.last_event_at) : "Chưa có sự kiện"}
            </Text>
          </TouchableOpacity>
        ))}
        {searched && !loading && rows.length === 0 ? (
          <Text style={styles.meta}>Không có món đồ khớp bộ lọc.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
};

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipOn]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  content: { padding: 16, paddingBottom: 32, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  label: { marginTop: 8, fontSize: 13, fontWeight: "700", color: "#374151" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  chipOn: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  chipText: { color: "#374151", fontSize: 12 },
  chipTextOn: { color: "#1D4ED8", fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  rowLabel: { color: "#374151", fontWeight: "600" },
  primary: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    minHeight: 44,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "700" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 8,
  },
  cardTitle: { fontWeight: "700", color: "#111827" },
  meta: { color: "#4B5563", fontSize: 13, marginTop: 2 },
});
