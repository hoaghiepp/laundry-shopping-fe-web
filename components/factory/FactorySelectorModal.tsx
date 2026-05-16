import { StoreListItem } from "@/services/api/storeService";
import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface FactorySelectorModalProps {
  visible: boolean;
  factories: StoreListItem[];
  selectedFactoryId: string | null;
  onSelect: (factory: StoreListItem) => void;
  onClose: () => void;
}

export const FactorySelectorModal: React.FC<FactorySelectorModalProps> = ({
  visible,
  factories,
  selectedFactoryId,
  onSelect,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn xưởng sản xuất</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <FontAwesome5 name="times" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={factories.filter((factory) => !factory.deleted)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.factoryItem,
                  selectedFactoryId === item.id && styles.factoryItemSelected,
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.factoryItemContent}>
                  <FontAwesome5
                    name="industry"
                    size={16}
                    color={selectedFactoryId === item.id ? "#2563EB" : "#6B7280"}
                    style={styles.factoryIcon}
                  />
                  <View style={styles.factoryItemText}>
                    <Text
                      style={[
                        styles.factoryName,
                        selectedFactoryId === item.id && styles.factoryNameSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.factoryType}>
                      {item.type === "FACTORY" ? "Xưởng" : item.type}
                    </Text>
                  </View>
                </View>
                {selectedFactoryId === item.id && (
                  <FontAwesome5 name="check" size={16} color="#2563EB" />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Không có xưởng nào</Text>
              </View>
            }
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  factoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  factoryItemSelected: {
    backgroundColor: "#EFF6FF",
  },
  factoryItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  factoryIcon: {
    marginRight: 12,
  },
  factoryItemText: {
    flex: 1,
  },
  factoryName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  factoryNameSelected: {
    color: "#2563EB",
  },
  factoryType: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
