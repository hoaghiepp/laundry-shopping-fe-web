import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

export type SortOption = "default" | "price-asc" | "price-desc" | "name-asc";

interface SortOptionConfig {
  value: SortOption;
  label: string;
  icon?: string;
}

interface ProductSortBarProps {
  selectedOption: SortOption;
  onOptionSelect: (option: SortOption) => void;
}

const SORT_OPTIONS: SortOptionConfig[] = [
  { value: "default", label: "Mặc định" },
  { value: "name-asc", label: "Tên A-Z", icon: "sort-alpha-down" },
  { value: "price-asc", label: "Giá tăng", icon: "arrow-up" },
  { value: "price-desc", label: "Giá giảm", icon: "arrow-down" },
];

export const ProductSortBar: React.FC<ProductSortBarProps> = ({
  selectedOption,
  onOptionSelect,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {SORT_OPTIONS.map((option) => {
        const isActive = selectedOption === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.sortButton,
              isActive && styles.sortButtonActive,
            ]}
            onPress={() => onOptionSelect(option.value)}
            activeOpacity={0.7}
          >
            {option.icon && (
              <FontAwesome5
                name={option.icon}
                size={12}
                color={isActive ? "#FFFFFF" : "#6B7280"}
                style={styles.sortIcon}
              />
            )}
            <Text
              style={[
                styles.sortButtonText,
                isActive && styles.sortButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  content: {
    gap: 8,
    paddingRight: 16,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  sortButtonActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  sortIcon: {
    marginRight: 2,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  sortButtonTextActive: {
    color: "#FFFFFF",
  },
});

