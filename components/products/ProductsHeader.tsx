import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ProductsHeaderProps {
  title: string;
  onBack: () => void;
  resultsCount?: number;
  searchQuery?: string;
  loading?: boolean;
}

export const ProductsHeader: React.FC<ProductsHeaderProps> = ({
  title,
  onBack,
  resultsCount,
  searchQuery,
  loading = false,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="arrow-left" size={18} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.placeholder} />
      </View>

      {!loading && resultsCount !== undefined && (
        <Text style={styles.resultsCount}>
          {resultsCount} sản phẩm
          {searchQuery?.trim() && ` cho "${searchQuery}"`}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  placeholder: {
    width: 40,
  },
  resultsCount: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
});

