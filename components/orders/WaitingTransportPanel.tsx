import { loadTransportOrders } from "@/components/orders/loadTransportOrders";
import { WaitingTransportOrderCard } from "@/components/orders/WaitingTransportOrderCard";
import { TripBuilderScreen } from "@/components/screens/shared/TripBuilderScreen";
import {
  OrderGroup,
  selectionTotals,
  TransportDirection,
  withOrderSelection,
} from "@/utils/transportGroups";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface WaitingTransportPanelProps {
  storeId: string;
  sourceKind: TransportDirection;
  reloadKey?: string | number;
  onCount?: (count: number) => void;
  onOrderPress?: (orderId: string, orderCode: string) => void;
}

export const WaitingTransportPanel: React.FC<WaitingTransportPanelProps> = ({
  storeId,
  sourceKind,
  reloadKey,
  onCount,
  onOrderPress,
}) => {
  const [groups, setGroups] = useState<OrderGroup[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [building, setBuilding] = useState(false);
  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;

  const load = useCallback(async () => {
    const next = await loadTransportOrders(storeId, sourceKind);
    setGroups(next);
    onCountRef.current?.(next.length);
    return next;
  }, [sourceKind, storeId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    load()
      .catch(() => {
        if (!cancelled) setError("Không tải được danh sách chờ vận chuyển.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load, reloadKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    setError("");
    try {
      await load();
    } catch {
      setError("Không tải được danh sách chờ vận chuyển.");
    } finally {
      setRefreshing(false);
    }
  };

  const totals = selectionTotals(groups);

  if (building) {
    return (
      <TripBuilderScreen
        sourceStoreId={storeId}
        sourceKind={sourceKind}
        initialGroups={groups}
        onBack={() => setBuilding(false)}
        onDone={() => {
          setBuilding(false);
          void onRefresh();
        }}
      />
    );
  }

  return (
    <View style={styles.wrap}>
      {loading && groups.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.centerText}>Đang tải đơn chờ vận chuyển...</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.orderId}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <FontAwesome5 name="inbox" size={40} color="#CBD5E1" />
              <Text style={styles.centerText}>
                {error || "Không có đơn chờ vận chuyển"}
              </Text>
              {error ? (
                <TouchableOpacity style={styles.retry} onPress={() => void onRefresh()} activeOpacity={0.8}>
                  <Text style={styles.retryText}>Tải lại</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          renderItem={({ item }) => (
            <WaitingTransportOrderCard
              group={item}
              expanded={expanded.has(item.orderId)}
              onToggleExpand={() =>
                setExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(item.orderId)) next.delete(item.orderId);
                  else next.add(item.orderId);
                  return next;
                })
              }
              onToggleOrder={(selected) =>
                setGroups((prev) =>
                  prev.map((group) =>
                    group.orderId === item.orderId ? withOrderSelection(group, selected) : group
                  )
                )
              }
              onPressOrder={() => onOrderPress?.(item.orderId, item.orderCode)}
            />
          )}
        />
      )}

      {groups.length > 0 ? (
        <View style={styles.bar}>
          <Text style={styles.barCount}>
            {totals.orders} đơn, {totals.garments} món
          </Text>
          <TouchableOpacity
            style={[styles.barButton, totals.garments === 0 && styles.barButtonOff]}
            onPress={() => setBuilding(true)}
            disabled={totals.garments === 0}
            accessibilityRole="button"
            accessibilityLabel="Tạo chuyến"
            activeOpacity={0.8}
          >
            <Text style={styles.barButtonText}>Tạo chuyến</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const webPointer = Platform.OS === "web" ? ({ cursor: "pointer" } as const) : undefined;

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  list: { padding: 16, paddingBottom: 96 },
  gap: { height: 10 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  centerText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
    textAlign: "center",
  },
  retry: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    ...(webPointer || {}),
  },
  retryText: { color: "#FFFFFF", fontWeight: "700" },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  barCount: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  barButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    ...(webPointer || {}),
  },
  barButtonOff: { opacity: 0.45 },
  barButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
