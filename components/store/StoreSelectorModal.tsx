import { StoreListItem } from "@/services/api/storeService";
import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface StoreSelectorModalProps {
  visible: boolean;
  stores: StoreListItem[];
  selectedStoreId: string | null;
  onSelect: (store: StoreListItem) => void;
  onClose: () => void;
}

export const StoreSelectorModal: React.FC<StoreSelectorModalProps> = ({
  visible,
  stores,
  selectedStoreId,
  onSelect,
  onClose,
}) => {
  const list = (
    <FlatList
      data={stores.filter((store) => !store.deleted)}
      keyExtractor={(item) => item.id}
      style={Platform.OS === "web" ? styles.listWeb : undefined}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.storeItem,
            selectedStoreId === item.id && styles.storeItemSelected,
          ]}
          onPress={() => {
            onSelect(item);
            onClose();
          }}
          activeOpacity={0.7}
        >
          <View style={styles.storeItemContent}>
            <FontAwesome5
              name="store"
              size={16}
              color={selectedStoreId === item.id ? "#2563EB" : "#6B7280"}
              style={styles.storeIcon}
            />
            <View style={styles.storeItemText}>
              <Text
                style={[
                  styles.storeName,
                  selectedStoreId === item.id && styles.storeNameSelected,
                ]}
              >
                {item.name}
              </Text>
              <Text style={styles.storeType}>
                {item.type === "HUB" ? "Tiệm" : item.type}
              </Text>
            </View>
          </View>
          {selectedStoreId === item.id && (
            <FontAwesome5 name="check" size={16} color="#2563EB" />
          )}
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không có cửa hàng nào</Text>
        </View>
      }
    />
  );

  if (Platform.OS === "web") {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.webBackdrop} onPress={onClose}>
          <Pressable style={styles.webDialog} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn điểm giao dịch</Text>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                <FontAwesome5 name="times" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {list}
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.sheetBackdropFlex} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chọn điểm giao dịch</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <FontAwesome5 name="times" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
          {list}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdropFlex: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 32,
  },
  webBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  webDialog: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  listWeb: {
    maxHeight: 400,
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
    fontWeight: "700",
    color: "#1F2937",
  },
  storeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  storeItemSelected: {
    backgroundColor: "#EFF6FF",
  },
  storeItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  storeIcon: {
    marginRight: 12,
  },
  storeItemText: {
    flex: 1,
  },
  storeName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  storeNameSelected: {
    color: "#2563EB",
  },
  storeType: {
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
