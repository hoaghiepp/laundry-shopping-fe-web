import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ProductEmptyStateProps {
  loading: boolean;
  hasSearchQuery: boolean;
  onClearSearch?: () => void;
}

export const ProductEmptyState: React.FC<ProductEmptyStateProps> = ({
  loading,
  hasSearchQuery,
  onClearSearch,
}) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.emptyText}>Đang tải sản phẩm...</Text>
      </View>
    );
  }

  if (hasSearchQuery) {
    return (
      <View style={styles.container}>
        <FontAwesome5 name="search" size={48} color="#D1D5DB" />
        <Text style={styles.emptyText}>Không tìm thấy sản phẩm</Text>
        <Text style={styles.emptySubtext}>
          Thử tìm kiếm với từ khóa khác
        </Text>
        {onClearSearch && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClearSearch}
            activeOpacity={0.7}
          >
            <Text style={styles.clearButtonText}>Xóa bộ lọc</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FontAwesome5 name="box-open" size={48} color="#D1D5DB" />
      <Text style={styles.emptyText}>Chưa có sản phẩm nào</Text>
      <Text style={styles.emptySubtext}>
        Kéo xuống để làm mới danh sách
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  clearButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#2563EB",
    borderRadius: 8,
  },
  clearButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});

