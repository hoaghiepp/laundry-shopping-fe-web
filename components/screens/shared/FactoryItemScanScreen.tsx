import { compatAlert } from "@/lib/compatAlert";
import { extractApiErrorMessage } from "@/services/api/apiUtils";
import { logisticService } from "@/services/api/logisticService";
import { trackingStatusLabel } from "@/utils/serviceLines";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const FACTORY_SCAN_STATUSES = [
  { value: "WASHING", label: "Đang giặt" },
  { value: "DRIED", label: "Đã sấy" },
  { value: "IRONED", label: "Đã là" },
  { value: "PACKED", label: "Đã đóng gói" },
];

interface FactoryItemScanScreenProps {
  onBack: () => void;
}

export const FactoryItemScanScreen: React.FC<FactoryItemScanScreenProps> = ({ onBack }) => {
  const [barcode, setBarcode] = useState("");
  const [status, setStatus] = useState("WASHING");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastStatus, setLastStatus] = useState("");

  const submit = async () => {
    const code = barcode.trim();
    if (!code) {
      compatAlert("Thiếu barcode", "Nhập barcode của món đồ.");
      return;
    }
    setSaving(true);
    try {
      const response = await logisticService.scanTrackingItem({
        barcode: code,
        status,
        note: note.trim() || undefined,
      });
      const next = response?.data?.status || status;
      setLastStatus(next);
      setNote("");
      compatAlert("Đã cập nhật", `${code} · ${trackingStatusLabel(next)}`);
    } catch (error) {
      compatAlert("Lỗi", extractApiErrorMessage(error, "Không thể cập nhật trạng thái"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.back}>
          <FontAwesome5 name="arrow-left" size={16} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Quét trạng thái xưởng</Text>
      </View>
      <View style={styles.body}>
        <TextInput
          style={styles.input}
          value={barcode}
          onChangeText={setBarcode}
          placeholder="Barcode, ví dụ S816/436"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Trạng thái</Text>
        {FACTORY_SCAN_STATUSES.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[styles.choice, status === item.value && styles.choiceOn]}
            onPress={() => setStatus(item.value)}
          >
            <Text style={styles.choiceText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="Ghi chú (không bắt buộc)"
          placeholderTextColor="#9CA3AF"
        />
        {lastStatus ? (
          <Text style={styles.meta}>Lần quét gần nhất: {trackingStatusLabel(lastStatus)}</Text>
        ) : null}
        <TouchableOpacity style={styles.primary} onPress={submit} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Cập nhật</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    paddingTop: 48,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  back: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  body: { padding: 16, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  label: { marginTop: 8, fontSize: 13, fontWeight: "700", color: "#374151" },
  choice: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  choiceOn: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  choiceText: { color: "#111827", fontWeight: "600" },
  meta: { color: "#4B5563", fontSize: 13 },
  primary: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "700" },
});
