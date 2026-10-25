import { ItemTimelineScreen } from "@/components/screens/shared/ItemTimelineScreen";
import {
  conditionLabel,
  eventTypeLabel,
  formatDate,
  locationTypeLabel,
  tripTypeLabel,
} from "@/components/store/logistics/logisticsUtils";
import { compatAlert } from "@/lib/compatAlert";
import { extractApiErrorMessage } from "@/services/api/apiUtils";
import { logisticService } from "@/services/api/logisticService";
import { trackingStatusLabel } from "@/utils/serviceLines";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ItemPassportScreenProps {
  trackingId?: string;
  initialBarcode?: string;
  topInset?: number;
  onBack: () => void;
}

const LOCATION_COLORS: Record<string, { bg: string; color: string }> = {
  AT_STORE: { bg: "#DBEAFE", color: "#1D4ED8" },
  ON_TRIP: { bg: "#FEF3C7", color: "#B45309" },
  AT_BATCH: { bg: "#EDE9FE", color: "#6D28D9" },
  LOST: { bg: "#FEE2E2", color: "#B91C1C" },
};

export const ItemPassportScreen: React.FC<ItemPassportScreenProps> = ({
  trackingId,
  initialBarcode,
  topInset = 48,
  onBack,
}) => {
  const [barcode, setBarcode] = useState(initialBarcode || "");
  const [passport, setPassport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    if (trackingId) {
      void lookupById(trackingId);
      return;
    }
    if (initialBarcode) {
      void lookupByBarcode(initialBarcode);
    }
  }, [trackingId, initialBarcode]);

  const lookupById = async (id: string) => {
    setLoading(true);
    setPassport(null);
    try {
      const response = await logisticService.getPassport(id);
      const data = response?.data;
      setPassport(data);
      if (data?.item?.barcode) setBarcode(data.item.barcode);
    } catch (error) {
      compatAlert("Lỗi", extractApiErrorMessage(error, "Không tìm thấy món đồ"));
    } finally {
      setLoading(false);
    }
  };

  const lookupByBarcode = async (value: string) => {
    const code = value.trim();
    if (!code) return;
    setLoading(true);
    setPassport(null);
    try {
      const response = await logisticService.getPassportByBarcode(code);
      setPassport(response?.data);
    } catch (error) {
      compatAlert("Lỗi", extractApiErrorMessage(error, "Không tìm thấy món đồ"));
    } finally {
      setLoading(false);
    }
  };

  const item = passport?.item;
  const location = passport?.location;
  const trip = location?.trip;
  const lastEvent = passport?.last_event;
  const idleSeconds = Number(passport?.idle_seconds || 0);
  const locationStyle = LOCATION_COLORS[location?.type] || { bg: "#F3F4F6", color: "#374151" };

  if (showTimeline && item?.id) {
    return (
      <ItemTimelineScreen
        trackingId={item.id}
        barcode={item.barcode}
        topInset={topInset}
        onBack={() => setShowTimeline(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <FontAwesome5 name="arrow-left" size={16} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Hộ chiếu món đồ</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={barcode}
          onChangeText={setBarcode}
          placeholder="Barcode, ví dụ S816/436"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          onSubmitEditing={() => lookupByBarcode(barcode)}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => lookupByBarcode(barcode)}>
          <Text style={styles.searchText}>Tra cứu</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#2563EB" style={{ marginTop: 24 }} />
      ) : passport ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.barcode}>{item?.barcode}</Text>
            <Text style={styles.meta}>Đơn {item?.order_code || "—"}</Text>
            <Text style={styles.meta}>
              Trạng thái: {trackingStatusLabel(item?.status)} · {conditionLabel(item?.item_condition)}
            </Text>
            <View style={[styles.badge, { backgroundColor: locationStyle.bg }]}>
              <Text style={[styles.badgeText, { color: locationStyle.color }]}>
                {locationTypeLabel(location?.type)}
              </Text>
            </View>
            {location?.store?.name ? (
              <Text style={styles.meta}>
                {location.store.name}
                {location.store.type ? ` · ${location.store.type}` : ""}
              </Text>
            ) : null}
            {location?.container_code ? (
              <Text style={styles.meta}>Bao / sọt: {location.container_code}</Text>
            ) : null}
            {location?.batch_id ? <Text style={styles.meta}>Mẻ: {location.batch_id}</Text> : null}
            {trip ? (
              <Text style={styles.meta}>
                Chuyến {trip.trip_code} · {tripTypeLabel(trip.trip_type)} · {trip.status}
                {trip.source_store?.name ? ` · từ ${trip.source_store.name}` : ""}
                {trip.destination_store?.name ? ` đến ${trip.destination_store.name}` : ""}
              </Text>
            ) : null}
            <Text style={styles.meta}>Sự kiện gần nhất cách đây {formatIdle(idleSeconds)}</Text>
            {lastEvent ? (
              <Text style={styles.meta}>
                {eventTypeLabel(lastEvent.event_type)}
                {lastEvent.occurred_at ? ` · ${formatDate(lastEvent.occurred_at)}` : ""}
              </Text>
            ) : null}
            {item?.id ? (
              <TouchableOpacity onPress={() => setShowTimeline(true)}>
                <Text style={styles.link}>Xem lịch sử</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
};

function formatIdle(seconds: number): string {
  if (!seconds || seconds < 60) return "vừa xong";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
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
  searchRow: { flexDirection: "row", gap: 8, padding: 16 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  searchBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  searchText: { color: "#FFFFFF", fontWeight: "700" },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 4,
  },
  barcode: { fontSize: 18, fontWeight: "700", color: "#111827" },
  meta: { color: "#4B5563", fontSize: 13, marginTop: 2 },
  badge: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { fontWeight: "700", fontSize: 12 },
  link: { color: "#2563EB", fontWeight: "700", marginTop: 12 },
});
