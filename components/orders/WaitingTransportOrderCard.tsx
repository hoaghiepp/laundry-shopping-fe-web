import { BlockReason, OrderGroup, selectionKind } from "@/utils/transportGroups";
import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const BLOCK_LABEL: Record<BlockReason, string> = {
  ON_TRIP: "Đang trên chuyến",
  IN_BATCH: "Đang trong mẻ",
  MISSING: "Thất lạc",
};

interface WaitingTransportOrderCardProps {
  group: OrderGroup;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleOrder: (selected: boolean) => void;
  onPressOrder: () => void;
}

export const WaitingTransportOrderCard = React.memo(function WaitingTransportOrderCard({
  group,
  expanded,
  onToggleExpand,
  onToggleOrder,
  onPressOrder,
}: WaitingTransportOrderCardProps) {
  const kind = selectionKind(group);
  const checked = kind === "all";
  const canSelect = group.garments.length > 0;
  const blockedCount = group.blocked.length;
  const summary = blockedCount
    ? `${group.garments.length} đi được · ${blockedCount} bị chặn`
    : `${group.garments.length} món`;

  return (
    <View style={[styles.card, kind !== "none" && styles.cardSelected]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.hit}
          onPress={() => canSelect && onToggleOrder(!checked)}
          disabled={!canSelect}
          accessibilityRole="checkbox"
          accessibilityState={{ checked, disabled: !canSelect }}
          accessibilityLabel={`Chọn đơn ${group.orderCode}`}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.checkbox,
              checked && styles.checkboxOn,
              !canSelect && styles.checkboxDisabled,
            ]}
          >
            {checked ? <FontAwesome5 name="check" size={10} color="#FFFFFF" /> : null}
          </View>
        </TouchableOpacity>

        <View style={styles.headerBody}>
          <TouchableOpacity
            style={styles.codeHit}
            onPress={onPressOrder}
            accessibilityRole="button"
            accessibilityLabel={`Mở đơn ${group.orderCode}`}
            activeOpacity={0.7}
          >
            <Text style={styles.orderCode}>{group.orderCode}</Text>
          </TouchableOpacity>
          {group.customerName || group.customerPhone ? (
            <Text style={styles.customer} numberOfLines={1}>
              {[group.customerName, group.customerPhone].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
          <Text style={styles.summary}>{summary}</Text>
        </View>

        <TouchableOpacity
          style={styles.expandHit}
          onPress={onToggleExpand}
          accessibilityRole="button"
          accessibilityLabel={
            expanded ? `Thu gọn ${group.orderCode}` : `Mở mã vạch ${group.orderCode}`
          }
          activeOpacity={0.7}
        >
          <Text style={styles.expandLabel}>{expanded ? "Thu gọn" : "Mã vạch"}</Text>
          <FontAwesome5
            name={expanded ? "chevron-up" : "chevron-down"}
            size={12}
            color="#5B21A6"
          />
        </TouchableOpacity>
      </View>

      {expanded ? (
        <View style={styles.lines}>
          {group.garments.map((garment) => (
            <View key={garment.id} style={styles.line}>
              <FontAwesome5 name="barcode" size={12} color="#64748B" />
              <Text style={styles.barcode}>{garment.barcode}</Text>
            </View>
          ))}
          {group.blocked.map((item) => (
            <View key={`${item.reason}-${item.barcode}`} style={styles.line}>
              <FontAwesome5 name="barcode" size={12} color="#94A3B8" />
              <Text style={styles.barcodeMuted}>{item.barcode}</Text>
              <View style={styles.blockBadge}>
                <Text style={styles.blockText}>{BLOCK_LABEL[item.reason]}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
});

const webPointer = Platform.OS === "web" ? ({ cursor: "pointer" } as const) : undefined;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
    borderLeftColor: "#7C3AED",
    overflow: "hidden",
  },
  cardSelected: {
    backgroundColor: "#F5F3FF",
    borderColor: "#C4B5FD",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  hit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    ...(webPointer || {}),
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    borderColor: "#6D28D9",
    backgroundColor: "#6D28D9",
  },
  checkboxDisabled: {
    borderColor: "#E2E8F0",
    backgroundColor: "#F1F5F9",
  },
  headerBody: {
    flex: 1,
    paddingVertical: 8,
  },
  codeHit: {
    alignSelf: "flex-start",
    minHeight: 44,
    justifyContent: "center",
    ...(webPointer || {}),
  },
  orderCode: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  customer: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: "#475569",
  },
  summary: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 20,
    color: "#475569",
  },
  expandHit: {
    minHeight: 44,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    ...(webPointer || {}),
  },
  expandLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5B21A6",
  },
  lines: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingBottom: 8,
  },
  line: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  barcode: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  barcodeMuted: {
    flex: 1,
    fontSize: 14,
    color: "#64748B",
  },
  blockBadge: {
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  blockText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
});
