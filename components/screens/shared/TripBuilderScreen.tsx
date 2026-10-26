import { loadTransportOrders } from "@/components/orders/loadTransportOrders";
import { CarrierSelectionDialog } from "@/components/store/logistics/CarrierSelectionScreen";
import { StoreType } from "@/constants/enum";
import { compatAlert } from "@/lib/compatAlert";
import { extractApiErrorCode, extractApiErrorMessage } from "@/services/api/apiUtils";
import {
  AddressLocation,
  goshipService,
  ShipmentRequest,
} from "@/services/api/goshipService";
import { logisticService } from "@/services/api/logisticService";
import { storeService } from "@/services/api/storeService";
import {
  OrderGroup,
  selectionTotals,
  TransportDirection,
} from "@/utils/transportGroups";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface TripBuilderScreenProps {
  sourceStoreId: string;
  sourceKind: TransportDirection;
  onBack: () => void;
  onDone: () => void;
  initialGroups?: OrderGroup[];
}

export const TripBuilderScreen: React.FC<TripBuilderScreenProps> = ({
  sourceStoreId,
  sourceKind,
  onBack,
  onDone,
  initialGroups,
}) => {
  const seedRef = useRef(initialGroups);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [destinationId, setDestinationId] = useState("");
  const [groups, setGroups] = useState<OrderGroup[]>(seedRef.current ?? []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createdTrip, setCreatedTrip] = useState<any>(null);
  const [carrierOpen, setCarrierOpen] = useState(false);
  const [hubProfile, setHubProfile] = useState<any>(null);
  const [destProfile, setDestProfile] = useState<any>(null);

  const title = sourceKind === "hub" ? "Tạo chuyến đi xưởng" : "Tạo chuyến trả cửa hàng";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [storeResponse, loaded] = await Promise.all([
          storeService.searchStore(
            {
              deleted: false,
              type: sourceKind === "hub" ? StoreType.FACTORY : StoreType.HUB,
            },
            { page: 0, size: 100 }
          ),
          seedRef.current
            ? Promise.resolve(seedRef.current)
            : loadTransportOrders(sourceStoreId, sourceKind),
        ]);
        if (cancelled) return;
        const stores = storeResponse?.data || [];
        setDestinations(stores);
        if (stores.length === 1) setDestinationId(stores[0].id);
        setGroups(loaded);
      } catch (error) {
        if (!cancelled) {
          compatAlert("Lỗi", extractApiErrorMessage(error, "Không thể tải đơn để tạo chuyến"));
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

  const selectedGroups = groups.filter((group) => group.selectedIds.length > 0);

  const explain = (error: unknown, fallback: string) => {
    const code = extractApiErrorCode(error);
    if (code === "400045" || code === "400053") {
      loadTransportOrders(sourceStoreId, sourceKind)
        .then((fresh) => {
          setGroups((prev) => {
            const message = extractApiErrorMessage(error, "");
            const kept =
              code === "400053"
                ? prev.filter((group) => !message.includes(group.orderCode))
                : prev;
            const byId = new Map(kept.map((group) => [group.orderId, group]));
            return fresh
              .filter((group) => (code === "400053" ? byId.has(group.orderId) : true))
              .map((group) => {
                const old = byId.get(group.orderId);
                if (!old) return group;
                const eligible = new Set(group.garments.map((item) => item.id));
                return {
                  ...group,
                  selectedIds: old.selectedIds.filter((id) => eligible.has(id)),
                };
              });
          });
        })
        .catch(() => undefined);
    }
    compatAlert("Lỗi", extractApiErrorMessage(error, fallback));
  };

  const createTrip = async () => {
    if (!destinationId) {
      compatAlert("Thiếu điểm đến", "Chọn xưởng hoặc cửa hàng nhận hàng.");
      return;
    }
    if (selectedGroups.length === 0) {
      compatAlert("Chưa chọn món", "Chọn ít nhất một đơn.");
      return;
    }
    const logisticTripItems = selectedGroups.flatMap((group) =>
      group.selectedIds.map((id) => ({
        service_item_tracking_id: id,
      }))
    );
    setSaving(true);
    try {
      const response = await logisticService.createTrips({
        source_store_id: sourceStoreId,
        destination_store_id: destinationId,
        logistic_trip_items: logisticTripItems,
      });
      const tripId = response?.data?.id;
      const fresh = tripId ? await logisticService.getTripDetails(tripId) : response;
      setCreatedTrip(fresh?.data || response?.data);
    } catch (error) {
      explain(error, "Không thể tạo chuyến");
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
  const onTrip = new Set(activeLines.map((line: any) => line.service_item_tracking_id));

  const removeOrder = async (lines: any[]) => {
    if (!createdTrip?.id || lines.length === 0) return;
    setSaving(true);
    try {
      for (const line of lines) {
        await logisticService.removeTripItem(createdTrip.id, line.id);
      }
      await refreshTrip(createdTrip.id);
    } catch (error) {
      explain(error, "Không thể bỏ đơn khỏi chuyến");
      if (createdTrip?.id) await refreshTrip(createdTrip.id).catch(() => undefined);
    } finally {
      setSaving(false);
    }
  };

  const pendingIds = (group: OrderGroup) =>
    group.garments
      .map((item) => item.id)
      .filter((id) => !onTrip.has(id))
      .filter((id) => group.selectedIds.length === 0 || group.selectedIds.includes(id));

  const addOrder = async (group: OrderGroup) => {
    if (!createdTrip?.id) return;
    const ids = pendingIds(group);
    if (ids.length === 0) return;
    setSaving(true);
    try {
      for (const id of ids) {
        await logisticService.addTripItem(createdTrip.id, {
          service_item_tracking_id: id,
        });
      }
      await refreshTrip(createdTrip.id);
    } catch (error) {
      explain(error, "Không thể thêm đơn vào chuyến");
      if (createdTrip?.id) await refreshTrip(createdTrip.id).catch(() => undefined);
    } finally {
      setSaving(false);
    }
  };

  const locationOf = (profile: any): AddressLocation | null => {
    const address = profile?.address;
    if (!address || typeof address !== "object") return null;
    const district = address.district_id || address.district;
    const city = address.province_id || address.province;
    if (!district || !city) return null;
    return { district, city, ward: address.ward_id || address.ward };
  };

  const openCarrier = async () => {
    const destStoreId = createdTrip?.destination_store_id || destinationId;
    if (!createdTrip?.id || !destStoreId) return;
    setSaving(true);
    try {
      const [sourceRes, destRes] = await Promise.all([
        storeService.getStoreProfile(createdTrip.source_store_id || sourceStoreId),
        storeService.getStoreProfile(destStoreId),
      ]);
      if (!locationOf(sourceRes?.data) || !locationOf(destRes?.data)) {
        compatAlert("Lỗi", "Cửa hàng chưa có địa chỉ để lấy báo giá.");
        return;
      }
      setHubProfile(sourceRes.data);
      setDestProfile(destRes.data);
      setCarrierOpen(true);
    } catch (error) {
      compatAlert("Lỗi", extractApiErrorMessage(error, "Không thể tải địa chỉ cửa hàng"));
    } finally {
      setSaving(false);
    }
  };

  const selectCarrier = async (
    _carrierId: string,
    tripId: string,
    rateData?: any,
    parcelData?: any,
    addresses?: { from: any; to: any }
  ) => {
    if (!rateData || !parcelData || !addresses?.from || !addresses?.to) {
      compatAlert("Lỗi", "Thiếu thông tin đơn vị vận chuyển.");
      throw new Error("missing carrier");
    }
    const rateId = String(rateData.rate || rateData.id || rateData.rate_id || "");
    if (!rateId) {
      compatAlert("Lỗi", "Không tìm thấy mã bảng giá.");
      throw new Error("missing rate");
    }
    const shipmentRequest: ShipmentRequest = {
      shipment: {
        rate: rateId,
        payer: 1,
        order_id: createdTrip?.trip_code || createdTrip?.code || tripId,
        address_from: {
          name: hubProfile?.name || "",
          phone: hubProfile?.phone_contact || hubProfile?.phone_number || "",
          street: addresses.from.address_detail,
          ward: addresses.from.ward_id,
          district: addresses.from.district_id,
          city: addresses.from.province_id,
        },
        address_to: {
          name: destProfile?.name || "",
          phone: destProfile?.phone_contact || destProfile?.phone_number || "",
          street: addresses.to.address_detail,
          ward: addresses.to.ward_id,
          district: addresses.to.district_id,
          city: addresses.to.province_id,
        },
        parcel: {
          cod: parcelData.cod || 0,
          amount: parcelData.amount || 0,
          weight: String(parcelData.weight || "1000"),
          width: String(parcelData.width || "10"),
          height: String(parcelData.height || "10"),
          length: String(parcelData.length || "10"),
        },
      },
    };
    try {
      await goshipService.createShipment(shipmentRequest);
      await logisticService.departTrip(tripId);
    } catch (error) {
      compatAlert("Lỗi", extractApiErrorMessage(error, "Không thể tạo vận đơn"));
      throw error;
    }
    setCarrierOpen(false);
    compatAlert("Đã gọi xe", "Đơn vận chuyển đã tạo và chuyến đã xuất phát.");
    onDone();
  };

  const depart = async () => {
    if (!createdTrip?.id || activeLines.length === 0) return;
    setSaving(true);
    try {
      await logisticService.departTrip(createdTrip.id);
      compatAlert("Đã xuất phát", "Các món đang trên đường và điểm nhận đã được báo.");
      onDone();
    } catch (error) {
      explain(error, "Không thể xuất phát");
    } finally {
      setSaving(false);
    }
  };

  const review = reviewOrders(groups, activeLines);
  const addable = groups.filter((group) => pendingIds(group).length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={createdTrip ? onDone : onBack}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <FontAwesome5 name="arrow-left" size={16} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>{createdTrip ? "Kiểm tra chuyến" : title}</Text>
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
              Chuyến đang tạo. Thêm hoặc bỏ đơn trước khi xuất phát.
            </Text>
            {review.length === 0 ? (
              <Text style={styles.empty}>Chuyến chưa có món. Xuất phát đang tắt.</Text>
            ) : (
              review.map((bucket) => (
                <View key={bucket.key} style={styles.orderCard}>
                  <View style={styles.orderHead}>
                    <View style={styles.orderBody}>
                      <Text style={styles.orderCode}>{bucket.title}</Text>
                      <Text style={styles.meta}>{bucket.lines.length} món</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeHit}
                      onPress={() => removeOrder(bucket.lines)}
                      disabled={saving}
                      accessibilityRole="button"
                      accessibilityLabel={`Bỏ đơn ${bucket.title}`}
                    >
                      <Text style={styles.removeText}>Bỏ đơn</Text>
                    </TouchableOpacity>
                  </View>
                  {bucket.lines.map((line) => (
                    <Text key={line.id} style={styles.barcode}>
                      {barcodeFor(groups, line)}
                    </Text>
                  ))}
                </View>
              ))
            )}

            {addable.length > 0 ? (
              <>
                <Text style={styles.label}>Thêm đơn</Text>
                {addable.map((group) => (
                  <View key={group.orderId} style={styles.orderCard}>
                    <Text style={styles.orderCode}>{group.orderCode}</Text>
                    <Text style={styles.meta}>{pendingIds(group).length} món</Text>
                    <TouchableOpacity
                      style={styles.secondary}
                      onPress={() => addOrder(group)}
                      disabled={saving}
                      accessibilityRole="button"
                      accessibilityLabel={`Thêm đơn ${group.orderCode}`}
                    >
                      <Text style={styles.secondaryText}>Thêm đơn</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            ) : null}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.primary, (saving || activeLines.length === 0) && styles.disabled]}
              onPress={() => void openCarrier()}
              disabled={saving || activeLines.length === 0}
              accessibilityRole="button"
              accessibilityLabel="Gọi xe"
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>Gọi xe</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondary, (saving || activeLines.length === 0) && styles.disabled]}
              onPress={depart}
              disabled={saving || activeLines.length === 0}
              accessibilityRole="button"
              accessibilityLabel="Xuất phát"
            >
              <Text style={styles.secondaryText}>Xuất phát</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            <Text style={styles.label}>Điểm đến</Text>
            {destinations.length === 0 ? (
              <Text style={styles.empty}>Chưa có điểm đến phù hợp.</Text>
            ) : (
              destinations.map((store) => {
                const on = destinationId === store.id;
                return (
                  <TouchableOpacity
                    key={store.id}
                    style={[styles.choice, on && styles.choiceOn]}
                    onPress={() => setDestinationId(store.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={store.name}
                  >
                    <Text style={styles.choiceText}>{store.name}</Text>
                  </TouchableOpacity>
                );
              })
            )}

            <Text style={styles.label}>Đơn đã chọn ({selectionTotals(groups).orders})</Text>
            {selectedGroups.length === 0 ? (
              <Text style={styles.empty}>Chưa chọn đơn nào.</Text>
            ) : (
              selectedGroups.map((group) => (
                <View key={group.orderId} style={styles.orderCard}>
                  <Text style={styles.orderCode}>{group.orderCode}</Text>
                  <Text style={styles.meta}>{group.selectedIds.length} món</Text>
                  {group.garments
                    .filter((item) => group.selectedIds.includes(item.id))
                    .map((item) => (
                      <Text key={item.id} style={styles.barcode}>
                        {item.barcode}
                      </Text>
                    ))}
                </View>
              ))
            )}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.primary, saving && styles.disabled]}
              onPress={createTrip}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Tạo chuyến"
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryText}>Tạo chuyến</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
      {carrierOpen && createdTrip && hubProfile && destProfile && locationOf(hubProfile) && locationOf(destProfile) ? (
        <CarrierSelectionDialog
          visible={carrierOpen}
          tripId={createdTrip.id}
          tripCode={createdTrip.trip_code || createdTrip.code || createdTrip.id}
          sourceAddress={locationOf(hubProfile) as AddressLocation}
          destinationAddress={locationOf(destProfile) as AddressLocation}
          sourceStoreId={hubProfile.id || createdTrip.source_store_id || sourceStoreId}
          destinationStoreId={destProfile.id || createdTrip.destination_store_id || destinationId}
          sourceStoreName={hubProfile.name}
          destinationStoreName={destProfile.name}
          onSelectCarrier={selectCarrier}
          onClose={() => setCarrierOpen(false)}
        />
      ) : null}
    </View>
  );
};

function barcodeFor(groups: OrderGroup[], line: any) {
  for (const group of groups) {
    const garment = group.garments.find((item) => item.id === line.service_item_tracking_id);
    if (garment) return garment.barcode;
  }
  return line.barcode || line.service_item_tracking_id;
}

function reviewOrders(groups: OrderGroup[], lines: any[]) {
  const idToGroup = new Map<string, OrderGroup>();
  groups.forEach((group) => {
    group.garments.forEach((item) => idToGroup.set(item.id, group));
  });
  const buckets = new Map<string, { key: string; title: string; lines: any[] }>();
  for (const line of lines) {
    const group = idToGroup.get(line.service_item_tracking_id);
    const key = String(group?.orderId || line.order_code || line.id);
    const title = String(group?.orderCode || line.order_code || "Món khác");
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { key, title, lines: [] };
      buckets.set(key, bucket);
    }
    bucket.lines.push(line);
  }
  return Array.from(buckets.values());
}

const webPointer = Platform.OS === "web" ? ({ cursor: "pointer" } as const) : undefined;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  back: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    ...(webPointer || {}),
  },
  title: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tripCode: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  hint: { marginTop: 4, fontSize: 14, lineHeight: 22, color: "#475569" },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 24, gap: 8 },
  label: { marginTop: 8, marginBottom: 4, fontSize: 13, fontWeight: "700", color: "#334155" },
  empty: { color: "#475569", fontSize: 14, lineHeight: 22 },
  choice: {
    minHeight: 44,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    ...(webPointer || {}),
  },
  choiceOn: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  choiceText: { color: "#0F172A", fontWeight: "600", fontSize: 15 },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    gap: 4,
  },
  orderHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderBody: { flex: 1 },
  orderCode: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  meta: { fontSize: 13, color: "#475569" },
  barcode: { fontSize: 14, color: "#334155", marginTop: 4 },
  removeHit: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    ...(webPointer || {}),
  },
  footer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  disabled: { opacity: 0.5 },
  removeText: { color: "#B91C1C", fontWeight: "700" },
  primary: {
    minHeight: 44,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    ...(webPointer || {}),
  },
  primaryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  secondary: {
    minHeight: 44,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    ...(webPointer || {}),
  },
  secondaryText: { color: "#1D4ED8", fontWeight: "700" },
});
