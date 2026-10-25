import { extractApiErrorMessage } from "@/services/api/apiUtils";
import { logisticService } from "@/services/api/logisticService";
import {
  orderItemLabel,
  trackingStatusLabel,
} from "@/utils/serviceLines";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const FACTORY_SCAN_STATUSES = [
  { value: "WASHING", label: "Đang giặt" },
  { value: "DRIED", label: "Đã sấy" },
  { value: "IRONED", label: "Đã là" },
  { value: "PACKED", label: "Đã đóng gói" },
];

interface GarmentScanDialogProps {
  visible: boolean;
  barcode: string;
  garmentName: string;
  orderCode?: string;
  status?: string;
  currentStoreId?: string;
  onClose: () => void;
  onUpdated?: () => void;
}

export const GarmentScanDialog: React.FC<GarmentScanDialogProps> = ({
  visible,
  barcode,
  garmentName,
  orderCode,
  status,
  currentStoreId,
  onClose,
  onUpdated,
}) => {
  const [currentStatus, setCurrentStatus] = useState(status || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    setCurrentStatus(status || "");
    setError("");
  }, [status, barcode, visible]);

  const applyStatus = async (next: string) => {
    if (!barcode) return;
    setSaving(true);
    setError("");
    try {
      await logisticService.scanTrackingItem({
        barcode,
        status: next,
      });
      setCurrentStatus(next);
      onUpdated?.();
    } catch (err: any) {
      setError(extractApiErrorMessage(err, "Không thể cập nhật trạng thái"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Món đồ</Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome5 name="times" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{garmentName}</Text>
          <Text style={styles.meta}>Mã vạch: {barcode}</Text>
          {orderCode ? <Text style={styles.meta}>Đơn: {orderCode}</Text> : null}
          <Text style={styles.meta}>Trạng thái: {trackingStatusLabel(currentStatus)}</Text>
          {currentStoreId ? <Text style={styles.meta}>Cửa hàng: {currentStoreId}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {saving ? <ActivityIndicator color="#2563EB" style={{ marginVertical: 12 }} /> : null}
          <ScrollView style={styles.list}>
            {FACTORY_SCAN_STATUSES.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[styles.statusBtn, currentStatus === item.value && styles.statusBtnOn]}
                onPress={() => applyStatus(item.value)}
                disabled={saving}
              >
                <Text style={[styles.statusText, currentStatus === item.value && styles.statusTextOn]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export function garmentNameFromOrder(order: any, orderItemId?: string | null): string {
  const items = order?.order_items || [];
  const match = items.find((item: any) => String(item.id) === String(orderItemId));
  return match ? orderItemLabel(match) : order?.code || "Món đồ";
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    maxHeight: "85%",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 16, fontWeight: "700", color: "#111827" },
  name: { fontSize: 18, fontWeight: "700", color: "#1E3A8A", marginTop: 12 },
  meta: { fontSize: 13, color: "#4B5563", marginTop: 4 },
  bagLabel: { fontSize: 12, color: "#6B7280", marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  error: { color: "#DC2626", marginTop: 8, fontSize: 12 },
  list: { marginTop: 12 },
  statusBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    marginBottom: 8,
  },
  statusBtnOn: { backgroundColor: "#DBEAFE" },
  statusText: { color: "#374151", fontWeight: "600" },
  statusTextOn: { color: "#1D4ED8" },
});
