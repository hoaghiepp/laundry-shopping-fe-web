import { Select } from "@/components/address";
import { StoreListItem } from "@/services/api/storeService";
import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface FactorySelectionDialogProps {
  visible: boolean;
  factories: StoreListItem[];
  selectedFactoryId: string | null;
  onSelectFactory: (factoryId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const FactorySelectionDialog: React.FC<
  FactorySelectionDialogProps
> = ({
  visible,
  factories,
  selectedFactoryId,
  onSelectFactory,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.dialogOverlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View style={styles.dialogContent} onStartShouldSetResponder={() => true}>
          <View style={styles.dialogHeader}>
            <Text style={styles.dialogTitle}>Chọn nhà máy</Text>
            <TouchableOpacity onPress={onCancel} activeOpacity={1}>
              <FontAwesome5 name="times" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.dialogBody}>
            <Select
              label="Nhà máy"
              placeholder="Chọn nhà máy..."
              value={selectedFactoryId}
              options={factories
                .filter((factory) => !factory.deleted)
                .map((factory) => ({
                  value: factory.id,
                  label: factory.name,
                }))}
              onSelect={(value: string | number) =>
                onSelectFactory(value as string)
              }
            />
          </View>
          <View style={styles.dialogFooter}>
            <TouchableOpacity
              style={[styles.dialogButton, styles.cancelButton]}
              onPress={onCancel}
              activeOpacity={1}
            >
              <Text style={styles.cancelButtonText}>Hủy bỏ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dialogButton,
                styles.dialogConfirmButton,
                !selectedFactoryId && styles.dialogConfirmButtonDisabled,
              ]}
              onPress={onConfirm}
              disabled={!selectedFactoryId}
              activeOpacity={1}
            >
              <Text
                style={[
                  styles.dialogConfirmButtonText,
                  !selectedFactoryId && styles.dialogConfirmButtonTextDisabled,
                ]}
              >
                Vận chuyển
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dialogContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    padding: 0,
  },
  dialogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  dialogBody: {
    padding: 20,
  },
  dialogFooter: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 12,
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  dialogConfirmButton: {
    backgroundColor: "#2563EB",
  },
  dialogConfirmButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  dialogConfirmButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  dialogConfirmButtonTextDisabled: {
    color: "#9CA3AF",
  },
});

