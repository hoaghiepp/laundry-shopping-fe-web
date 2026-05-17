import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface FloatingActionButtonsProps {
  selectedOrdersCount: number;
  selectedBatchesCount: number;
  hasSelectedBatch: boolean;
  onCreateBatch: () => void;
  onBatchShipment: () => void;
  onPrintOrders?: () => void;
  isPrintingOrders?: boolean;
  onConfirmGroupShipment?: () => void;
  showGroupConfirm?: boolean;
}

export const FloatingActionButtons: React.FC<
  FloatingActionButtonsProps
> = ({
  selectedOrdersCount,
  selectedBatchesCount,
  hasSelectedBatch,
  onCreateBatch,
  onBatchShipment,
  onPrintOrders,
  isPrintingOrders = false,
  onConfirmGroupShipment,
  showGroupConfirm = false,
}) => {
  if (selectedOrdersCount === 0 && !hasSelectedBatch && !showGroupConfirm) {
    return null;
  }

  return (
    <>
      {selectedOrdersCount > 0 && onPrintOrders && (
        <View style={styles.printButtonContainer}>
          <TouchableOpacity
            style={[styles.printOrdersButton, isPrintingOrders && styles.buttonDisabled]}
            onPress={onPrintOrders}
            activeOpacity={0.8}
            disabled={isPrintingOrders}
          >
            <View style={styles.floatingButtonContent}>
              <View style={styles.printOrdersBadge}>
                <Text style={styles.printOrdersBadgeText}>
                  {selectedOrdersCount}
                </Text>
              </View>
              {isPrintingOrders ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <FontAwesome5 name="print" size={14} color="#2563EB" solid />
              )}
              <Text style={styles.printOrdersButtonText}>In đơn</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {selectedOrdersCount > 0 && (
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={onCreateBatch}
            activeOpacity={1}
          >
            <View style={styles.floatingButtonContent}>
              <View style={styles.floatingButtonBadge}>
                <Text style={styles.floatingButtonBadgeText}>
                  {selectedOrdersCount}
                </Text>
              </View>
              <FontAwesome5 name="truck" size={14} color="#FFFFFF" solid />
              <Text style={styles.floatingButtonText}>Tạo lô</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {hasSelectedBatch && (
        <View style={styles.floatingButtonContainerLeft} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.shipButton}
            onPress={onBatchShipment}
            activeOpacity={0.8}
          >
            <View style={styles.floatingButtonContent}>
              <FontAwesome5
                name="shipping-fast"
                size={14}
                color="#FFFFFF"
                solid
              />
              <Text style={styles.floatingButtonText}>Vận chuyển</Text>
              <View style={styles.floatingButtonBadgeLeft}>
                <Text style={styles.floatingButtonBadgeText}>
                  {selectedBatchesCount}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {showGroupConfirm && onConfirmGroupShipment && (
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={onConfirmGroupShipment}
            activeOpacity={1}
          >
            <View style={styles.floatingButtonContent}>
              <FontAwesome5
                name="check-circle"
                size={14}
                color="#FFFFFF"
                solid
              />
              <Text style={styles.floatingButtonText}>Xác nhận vận chuyển</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  printButtonContainer: {
    position: "absolute",
    bottom: 76,
    right: 16,
    alignItems: "flex-end",
    zIndex: 1000,
    elevation: 10,
  },
  printOrdersButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  printOrdersButtonText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "700",
  },
  printOrdersBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  printOrdersBadgeText: {
    color: "#1D4ED8",
    fontSize: 10,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  floatingButtonContainer: {
    position: "absolute",
    bottom: 20,
    right: 16,
    alignItems: "flex-end",
    zIndex: 1000,
    elevation: 10,
  },
  floatingButtonContainerLeft: {
    position: "absolute",
    bottom: 20,
    left: 16,
    alignItems: "flex-start",
    zIndex: 1000,
    elevation: 10,
  },
  floatingButton: {
    backgroundColor: "#2563EB",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  shipButton: {
    backgroundColor: "#10B981",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmButton: {
    backgroundColor: "#10B981",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  floatingButtonBadge: {
    backgroundColor: "#1E40AF",
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingButtonBadgeLeft: {
    backgroundColor: "#108F65",
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingButtonBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  floatingButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
