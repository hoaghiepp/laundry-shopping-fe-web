import {
  conditionLabel,
  eventTypeLabel,
  formatDate,
} from "@/components/store/logistics/logisticsUtils";
import { compatAlert } from "@/lib/compatAlert";
import { extractApiErrorMessage } from "@/services/api/apiUtils";
import { logisticService } from "@/services/api/logisticService";
import { trackingStatusLabel } from "@/utils/serviceLines";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ItemTimelineScreenProps {
  trackingId: string;
  barcode?: string;
  topInset?: number;
  onBack: () => void;
}

export const ItemTimelineScreen: React.FC<ItemTimelineScreenProps> = ({
  trackingId,
  barcode,
  topInset = 48,
  onBack,
}) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await logisticService.getTimeline(trackingId, { page: 0, size: 50 });
        const rows = [...(response?.data || [])].sort((a, b) => {
          const left = a?.occurred_at ? new Date(a.occurred_at).getTime() : 0;
          const right = b?.occurred_at ? new Date(b.occurred_at).getTime() : 0;
          return right - left;
        });
        if (!cancelled) setEvents(rows);
      } catch (error) {
        if (!cancelled) {
          compatAlert("Lỗi", extractApiErrorMessage(error, "Không thể tải lịch sử món đồ"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [trackingId]);

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
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Lịch sử món đồ</Text>
          {barcode ? <Text style={styles.subtitle}>{barcode}</Text> : null}
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color="#2563EB" style={{ marginTop: 24 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {events.length === 0 ? (
            <Text style={styles.meta}>Chưa có sự kiện.</Text>
          ) : (
            events.map((event) => (
              <View key={event.id} style={styles.event}>
                <Text style={styles.eventTitle}>{eventTypeLabel(event.event_type)}</Text>
                <Text style={styles.meta}>
                  {event.occurred_at ? formatDate(event.occurred_at) : ""}
                  {event.to_status ? ` · ${trackingStatusLabel(event.to_status)}` : ""}
                  {event.item_condition ? ` · ${conditionLabel(event.item_condition)}` : ""}
                </Text>
                {event.trip_code ? <Text style={styles.meta}>Chuyến {event.trip_code}</Text> : null}
                {event.container_code ? <Text style={styles.meta}>Bao {event.container_code}</Text> : null}
                {event.note ? <Text style={styles.meta}>{event.note}</Text> : null}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

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
  subtitle: { color: "#6B7280", fontSize: 13 },
  content: { padding: 16, paddingBottom: 32 },
  meta: { color: "#4B5563", fontSize: 13, marginTop: 2 },
  event: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  eventTitle: { fontWeight: "700", color: "#111827" },
});
