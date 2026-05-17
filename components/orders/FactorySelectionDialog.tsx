import { StoreListItem } from "@/services/api/storeService";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
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
  const [pickerVisible, setPickerVisible] = useState(false);

  useEffect(() => {
    if (!visible) setPickerVisible(false);
  }, [visible]);

  const factoryOptions = useMemo(
    () => factories.filter((factory) => !factory.deleted),
    [factories]
  );

  const selectedFactory = factoryOptions.find((f) => f.id === selectedFactoryId);

  const handleClose = () => {
    setPickerVisible(false);
    onCancel();
  };

  const handleSelectFactory = (factoryId: string) => {
    onSelectFactory(factoryId);
    setPickerVisible(false);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={styles.dialogOverlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <View
            style={styles.dialogContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>Chọn nhà máy</Text>
              <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
                <FontAwesome5 name="times" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.dialogBody}>
              <Text style={styles.fieldLabel}>Nhà máy</Text>
              <TouchableOpacity
                style={styles.selectTrigger}
                onPress={() => setPickerVisible(true)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.selectTriggerText,
                    !selectedFactory && styles.selectTriggerPlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {selectedFactory?.name ?? "Chọn nhà máy..."}
                </Text>
                <FontAwesome5 name="chevron-down" size={12} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.dialogFooter}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.cancelButton]}
                onPress={handleClose}
                activeOpacity={0.8}
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
                activeOpacity={0.8}
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

      <Modal
        visible={visible && pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View
            style={styles.pickerWindow}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Chọn nhà máy</Text>
              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="times" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={factoryOptions}
              keyExtractor={(item) => item.id}
              style={styles.pickerList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.id === selectedFactoryId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.pickerOption,
                      isSelected && styles.pickerOptionSelected,
                    ]}
                    onPress={() => handleSelectFactory(item.id)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        isSelected && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {isSelected && (
                      <FontAwesome5 name="check" size={14} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.pickerEmpty}>
                  <Text style={styles.pickerEmptyText}>Không có nhà máy</Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
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
    overflow: "hidden",
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
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 6,
  },
  selectTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  selectTriggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginRight: 8,
  },
  selectTriggerPlaceholder: {
    color: "#9CA3AF",
    fontWeight: "400",
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  pickerWindow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 420,
    maxHeight: "70%",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  pickerList: {
    flexGrow: 0,
  },
  pickerOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  pickerOptionSelected: {
    backgroundColor: "#EFF6FF",
  },
  pickerOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginRight: 8,
  },
  pickerOptionTextSelected: {
    color: "#2563EB",
  },
  pickerEmpty: {
    padding: 32,
    alignItems: "center",
  },
  pickerEmptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
