import { StoreType } from "@/constants/enum";
import { compatAlert } from "@/lib/compatAlert";
import { extractApiErrorMessage } from "@/services/api/apiUtils";
import { logisticService, LogisticsTripItem } from "@/services/api/logisticService";
import { storeService } from "@/services/api/storeService";
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

const FACTORY_STATUSES = ["RECEIVED_FACTORY", "WASHING", "DRIED", "IRONED", "PACKED"];

interface TripBuilderScreenProps {
  sourceStoreId: string;
  sourceKind: "hub" | "factory";
  onBack: () => void;
  onDone: () => void;
}

export const TripBuilderScreen: React.FC<TripBuilderScreenProps> = ({
  sourceStoreId,
  sourceKind,
  onBack,
  onDone,
}) => {
  const [destinations, setDestinations] = useState<any[]>([]);
  const [destinationId, setDestinationId] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [containerCode, setContainerCode] = useState("");
  const [drivers, setDrivers] = useState<any[]>([]);
  const [driverId, setDriverId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createdTrip, setCreatedTrip] = useState<any>(null);

  const title = sourceKind === "hub" ? "Tạo chuyến đi xưởng" : "Tạo chuyến trả cửa hàng";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [storeResponse, trackingResponse, staffResponse] = await Promise.all([
          storeService.searchStore(
            {
              deleted: false,
              type: sourceKind === "hub" ? StoreType.FACTORY : StoreType.HUB,
            },
            { page: 0, size: 100 }
          ),
          logisticService.searchTrackingItems(
            sourceKind === "hub"
              ? { current_store_id: sourceStoreId, status: "TAGGED" }
              : { current_store_id: sourceStoreId },
            { page: 0, size: 200 }
          ),
          storeService
            .searchStaff({ store_id: sourceStoreId, deleted: false }, { page: 0, size: 100 })
            .catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const stores = storeResponse?.data || [];
        setDestinations(stores);
        if (stores.length === 1) setDestinationId(stores[0].id);
        setDrivers(staffResponse?.data || []);
        const rows = (trackingResponse?.data || []).filter((row: any) => eligible(row, sourceKind));
        setItems(rows);
      } catch (error) {
        if (!cancelled) {
          compatAlert("Lỗi", extractApiErrorMessage(error, "Không thể tải món đồ để tạo chuyến"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [sourceStoreId, sourceKind]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createTrip = async () => {
    if (!destinationId) {
      compatAlert("Thiếu điểm đến", "Chọn xưởng hoặc cửa hàng nhận hàng.");
      return;
    }
    if (selected.size === 0) {
      compatAlert("Chưa chọn món", "Chọn ít nhất một món đồ.");
      return;
    }
    const bag = containerCode.trim();
    const logisticTripItems: LogisticsTripItem[] = items
      .filter((item) => selected.has(item.id))
      .map((item) => ({
        service_item_tracking_id: item.id,
        container_code: bag || undefined,
      }));
    setSaving(true);
    try {
      const response = await logisticService.createTrips({
        source_store_id: sourceStoreId,
        destination_store_id: destinationId,
        driver_staff_id: driverId || undefined,
        logistic_trip_items: logisticTripItems,
      });
      const tripId = response?.data?.id;
      const fresh = tripId ? await logisticService.getTripDetails(tripId) : response;
      setCreatedTrip(fresh?.data || response?.data);
      setSelected(new Set());
    } catch (error) {
      compatAlert("Lỗi", extractApiErrorMessage(error, "Không thể tạo chuyến"));
    } finally {
      setSaving(false);
    }
  };

  const refreshTrip = async (tripId: string) => {
    const fresh = await logisticService.getTripDetails(tripId);
    setCreatedTrip(fresh?.data);
    return fresh?.data;
  };

  const activeLines = (createdTrip?.logistic_trip_items || []).filter(
    (line: any) => line.status !== "REMOVED"
  );

  const addLines = async () => {
    if (!createdTrip?.id || selected.size === 0) return;
    const bag = containerCode.trim();
    setSaving(true);
    try {
      for (const item of items.filter((row) => selected.has(row.id))) {
        await logisticService.addTripItem(createdTrip.id, {
          service_item_tracking_id: item.id,
          container_code: bag || undefined,
        });
      }
      setSelected(new Set());
      await refreshTrip(createdTrip.id);
    } catch (error) {
      compatAlert("Lỗi", extractApiErrorMessage(error, "Không thể thêm món vào chuyến"));
    } finally {
      setSaving(false);
    }
  };

  const removeLine = async (itemId: string) => {
    if (!createdTrip?.id) return;
    setSaving(true);
    try {
      await logisticService.removeTripItem(createdTrip.id, itemId);
      await refreshTrip(createdTrip.id);
    } catch (error) {
      compatAlert("Lỗi", extractApiErrorMessage(error, "Không thể bỏ món khỏi chuyến"));
    } finally {
      setSaving(false);
    }
  };

  const depart = async () => {
    if (!createdTrip?.id || activeLines.length === 0) return;
    setSaving(true);
    try {
      await logisticService.departTrip(createdTrip.id);
      compatAlert("Đã xuất phát", "Các món đang trên đường và điểm nhận đã được báo.");
      onDone();
    } catch (error) {
      compatAlert("Lỗi", extractApiErrorMessage(error, "Không thể xuất phát"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={createdTrip ? onDone : onBack} style={styles.back}>
          <FontAwesome5 name="arrow-left" size={16} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2563EB" />
        </View>
      ) : createdTrip ? (
        <View style={styles.container}>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            <Text style={styles.tripCode}>{createdTrip.trip_code || createdTrip.id}</Text>
            <Text style={styles.hint}>
              Chuyến đang tạo. Thêm hoặc bỏ món trước khi xuất phát.
            </Text>
            <Text style={styles.label}>Món trên chuyến ({activeLines.length})</Text>
            {activeLines.length === 0 ? (
              <Text style={styles.empty}>Chuyến chưa có món. Xuất phát đang tắt.</Text>
            ) : (
              activeLines.map((line: any) => (
                <View key={line.id} style={styles.item}>
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTitle}>
                      {items.find((row) => row.id === line.service_item_tracking_id)?.barcode ||
                        line.service_item_tracking_id}
                      {line.container_code ? ` · ${line.container_code}` : ""}
                    </Text>
                    <Text style={styles.itemMeta}>{line.order_code || line.status}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeLine(line.id)} disabled={saving}>
                    <Text style={styles.removeText}>Bỏ</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
            <Text style={styles.label}>Thêm món</Text>
            <TextInput
              style={styles.input}
              value={containerCode}
              onChangeText={setContainerCode}
              placeholder="Mã bao / sọt"
              placeholderTextColor="#9CA3AF"
            />
            {items
              .filter((item) => !activeLines.some((line: any) => line.service_item_tracking_id === item.id))
              .map((item) => {
                const on = selected.has(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.item, on && styles.itemOn]}
                    onPress={() => toggle(item.id)}
                  >
                    <FontAwesome5
                      name={on ? "check-square" : "square"}
                      size={16}
                      color={on ? "#2563EB" : "#9CA3AF"}
                    />
                    <View style={styles.itemBody}>
                      <Text style={styles.itemTitle}>{item.barcode || item.id}</Text>
                      <Text style={styles.itemMeta}>{item.order_code || trackingStatusLabel(item.status)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.secondary} onPress={addLines} disabled={saving || selected.size === 0}>
              <Text style={styles.secondaryText}>Thêm món đã chọn</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primary, (saving || activeLines.length === 0) && styles.disabled]}
              onPress={depart}
              disabled={saving || activeLines.length === 0}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>Xuất phát</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            <Text style={styles.label}>Tài xế</Text>
            <TouchableOpacity
              style={[styles.choice, !driverId && styles.choiceOn]}
              onPress={() => setDriverId("")}
            >
              <Text style={styles.choiceText}>Chưa chọn</Text>
            </TouchableOpacity>
            {drivers.map((staff) => (
              <TouchableOpacity
                key={staff.id}
                style={[styles.choice, driverId === staff.id && styles.choiceOn]}
                onPress={() => setDriverId(staff.id)}
              >
                <Text style={styles.choiceText}>{staff.full_name || staff.staff_code || staff.id}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.label}>Điểm đến</Text>
            {destinations.length === 0 ? (
              <Text style={styles.empty}>Chưa có điểm đến phù hợp.</Text>
            ) : (
              destinations.map((store) => (
                <TouchableOpacity
                  key={store.id}
                  style={[styles.choice, destinationId === store.id && styles.choiceOn]}
                  onPress={() => setDestinationId(store.id)}
                >
                  <Text style={styles.choiceText}>{store.name}</Text>
                </TouchableOpacity>
              ))
            )}

            <Text style={styles.label}>Mã bao / sọt</Text>
            <TextInput
              style={styles.input}
              value={containerCode}
              onChangeText={setContainerCode}
              placeholder="Ví dụ BAG-0042"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Món đồ ({selected.size}/{items.length})</Text>
            {items.length === 0 ? (
              <Text style={styles.empty}>
                {sourceKind === "hub"
                  ? "Không có món đã gắn thẻ tại cửa hàng này."
                  : "Không có món đang xử lý tại xưởng và chưa nằm trong mẻ."}
              </Text>
            ) : (
              items.map((item) => {
                const on = selected.has(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.item, on && styles.itemOn]}
                    onPress={() => toggle(item.id)}
                  >
                    <FontAwesome5
                      name={on ? "check-square" : "square"}
                      size={16}
                      color={on ? "#2563EB" : "#9CA3AF"}
                    />
                    <View style={styles.itemBody}>
                      <Text style={styles.itemTitle}>{item.barcode || item.id}</Text>
                      <Text style={styles.itemMeta}>
                        {item.order_code || "Chưa có mã đơn"} · {trackingStatusLabel(item.status)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity style={styles.primary} onPress={createTrip} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>Tạo chuyến</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

function eligible(item: any, sourceKind: "hub" | "factory"): boolean {
  if (item.current_trip_id) return false;
  if (item.item_condition === "MISSING") return false;
  if (sourceKind === "hub") return item.status === "TAGGED";
  return FACTORY_STATUSES.includes(item.status) && !item.current_batch_id;
}

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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { padding: 16, gap: 12 },
  tripCode: { fontSize: 20, fontWeight: "700", color: "#111827" },
  hint: { fontSize: 14, color: "#4B5563", lineHeight: 20 },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 24 },
  label: { marginTop: 12, marginBottom: 8, fontSize: 13, fontWeight: "700", color: "#374151" },
  empty: { color: "#6B7280", fontSize: 14 },
  choice: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  choiceOn: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  choiceText: { color: "#111827", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  item: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  itemOn: { borderColor: "#2563EB" },
  itemBody: { flex: 1 },
  itemTitle: { fontWeight: "700", color: "#111827" },
  itemMeta: { color: "#6B7280", marginTop: 2, fontSize: 13 },
  footer: { padding: 16, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E5E7EB", gap: 8 },
  disabled: { opacity: 0.5 },
  removeText: { color: "#DC2626", fontWeight: "700" },
  primary: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryText: { color: "#FFFFFF", fontWeight: "700" },
  secondary: {
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: { color: "#2563EB", fontWeight: "700" },
});
