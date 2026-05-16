import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface FloatingActionButtonsProps {
  selectedOrdersCount: number;
  selectedBatchesCount: number;
  hasSelectedBatch: boolean;
  onCreateBatch: () => void;
  onBatchShipment: () => void;
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
  onConfirmGroupShipment,
  showGroupConfirm = false,
}) => {
  if (selectedOrdersCount === 0 && !hasSelectedBatch && !showGroupConfirm) {
    return null;
  }

  return (
    <>
      {/* "Tạo lô" button - Right side (only show if non-batch orders are selected) */}
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

      {/* "Vận chuyển" button - Left side when batch is selected */}
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

      {/* Confirm Group Shipment Button */}
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

