import { OrderCardData, OrderCardStore } from "@/components/store/OrderCard";
import { Order } from "@/services/api/orderService";
import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface BatchGroupCardProps {
  barcode: string;
  orderCodes: string[];
  orders: OrderCardData[];
  orderMap: Map<string, Order>;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (selected: boolean) => void;
  onToggleExpand: () => void;
  onOrderPress: (order: Order) => void;
  onPrintOrderCode: (orderCode: string) => void;
}

export const BatchGroupCard: React.FC<BatchGroupCardProps> = ({
  barcode,
  orderCodes,
  orders,
  orderMap,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onOrderPress,
  onPrintOrderCode,
}) => {
  return (
    <View style={styles.groupCard}>
      <View style={styles.groupCardHeader}>
        <TouchableOpacity
          style={styles.groupCheckbox}
          onPress={() => onSelect(!isSelected)}
          activeOpacity={1}
        >
          <View
            style={[styles.checkbox, isSelected && styles.checkboxSelected]}
          >
            {isSelected && (
              <FontAwesome5 name="check" size={10} color="#FFFFFF" />
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.groupCardHeaderContent}>
          <Text style={styles.groupCardTitle}>{barcode}</Text>
          <Text style={styles.groupCardSubtitle}>
            {orderCodes.length} đơn
          </Text>
        </View>
        <TouchableOpacity
          style={styles.printButton}
          onPress={() => {
            orderCodes.forEach((code) => onPrintOrderCode(code));
          }}
          activeOpacity={1}
        >
          <FontAwesome5 name="print" size={14} color="#2563EB" />
          <Text style={styles.printButtonText}>In mã đơn</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.expandButton}
        onPress={onToggleExpand}
        activeOpacity={1}
      >
        <Text style={styles.expandButtonText}>
          {isExpanded ? "Thu gọn" : "Mở rộng"} ({orderCodes.length})
        </Text>
        <FontAwesome5
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={12}
          color="#6B7280"
        />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.groupedOrdersContainer}>
          {orderCodes.map((orderCode) => {
            const orderCard = orders.find((o) => o.id === orderCode);
            const order = orderMap.get(orderCode);
            if (!orderCard) return null;

            return (
              <View key={orderCode} style={styles.shrunkOrderCard}>
                <OrderCardStore
                  order={orderCard}
                  onPress={() => order && onOrderPress(order)}
                  // Orders in batches cannot be selected individually
                  isSelected={undefined}
                  onSelect={undefined}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  groupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  groupCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  groupCheckbox: {
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#2563EB",
  },
  groupCardHeaderContent: {
    flex: 1,
  },
  groupCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  groupCardSubtitle: {
    fontSize: 11,
    color: "#6B7280",
  },
  printButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  printButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 6,
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  groupedOrdersContainer: {
    marginTop: 12,
    gap: 8,
  },
  shrunkOrderCard: {
    opacity: 1,
  },
});

