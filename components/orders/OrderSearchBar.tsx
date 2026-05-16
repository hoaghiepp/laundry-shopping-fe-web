import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

interface OrderSearchBarProps {
  searchText: string;
  onSearchChange: (text: string) => void;
  onQRScan: () => void;
}

export const OrderSearchBar: React.FC<OrderSearchBarProps> = ({
  searchText,
  onSearchChange,
  onQRScan,
}) => {
  return (
    <View style={styles.searchBar}>
      <FontAwesome5 name="search" size={14} color="#9CA3AF" />
      <TextInput
        style={styles.searchInput}
        placeholder="Tìm tên, SĐT, mã đơn..."
        value={searchText}
        onChangeText={onSearchChange}
        placeholderTextColor="#9CA3AF"
      />
      <TouchableOpacity onPress={onQRScan} activeOpacity={1}>
        <FontAwesome5 name="qrcode" size={18} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  searchBar: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    color: "#374151",
  },
});

