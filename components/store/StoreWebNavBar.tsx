import { StoreTabType } from "@/constants/enum";
import {
  STORE_WEB_HEADER_HEIGHT,
  STORE_WEB_NAV_HEIGHT,
} from "@/constants/storeWebLayout";
import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

interface StoreWebNavBarProps {
  activeTab: StoreTabType;
  onTabChange: (tab: StoreTabType) => void;
  onCreateOrderPress: () => void;
}

const tabs: { tab: StoreTabType; label: string; icon: string }[] = [
  { tab: StoreTabType.ORDERS, label: "Đơn hàng", icon: "clipboard-list" },
  { tab: StoreTabType.INVENTORY, label: "Kho", icon: "boxes" },
  { tab: StoreTabType.LOGISTICS, label: "Giao nhận", icon: "truck-moving" },
  { tab: StoreTabType.REPORT, label: "Báo cáo", icon: "chart-pie" },
];

export const StoreWebNavBar: React.FC<StoreWebNavBarProps> = ({
  activeTab,
  onTabChange,
  onCreateOrderPress,
}) => {
  if (Platform.OS !== "web") {
    return null;
  }

  return (
    <View style={styles.bar}>
      <View style={styles.tabsRow}>
        {tabs.map(({ tab, label, icon }) => {
          const active = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => onTabChange(tab)}
              style={({ pressed }) => [
                styles.tab,
                active && styles.tabActive,
                pressed && !active && styles.tabHover,
              ]}
            >
              <FontAwesome5
                name={icon as "clipboard-list"}
                size={14}
                color={active ? "#1D4ED8" : "#6B7280"}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={onCreateOrderPress}
        style={({ pressed }) => [styles.createBtn, pressed && styles.createBtnHover]}
      >
        <FontAwesome5 name="plus" size={14} color="#FFFFFF" />
        <Text style={styles.createBtnText}>Tạo đơn</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: STORE_WEB_HEADER_HEIGHT,
    height: STORE_WEB_NAV_HEIGHT,
    zIndex: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 4,
    flexWrap: "wrap",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  tabHover: {
    backgroundColor: "#F3F4F6",
  },
  tabActive: {
    backgroundColor: "#EFF6FF",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  tabLabelActive: {
    color: "#1D4ED8",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginLeft: 12,
  },
  createBtnHover: {
    backgroundColor: "#1D4ED8",
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
