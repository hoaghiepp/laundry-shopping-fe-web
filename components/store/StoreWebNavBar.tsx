import { StoreTabType } from "@/constants/enum";
import {
  STORE_WEB_HEADER_HEIGHT,
  STORE_WEB_NAV_HEIGHT,
} from "@/constants/storeWebLayout";
import { FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";

interface StoreWebNavBarProps {
  activeTab: StoreTabType;
  onTabChange: (tab: StoreTabType) => void;
  onCreateOrderPress: () => void;
}

const tabs: { tab: StoreTabType; label: string; icon: string }[] = [
  { tab: StoreTabType.ORDERS, label: "Đơn hàng", icon: "clipboard-list" },
  { tab: StoreTabType.INVENTORY, label: "Kho", icon: "boxes" },
  { tab: StoreTabType.LOGISTICS, label: "Giao nhận", icon: "truck-moving" },
  { tab: StoreTabType.ITEM_SEARCH, label: "Tra cứu", icon: "search" },
  { tab: StoreTabType.REPORT, label: "Báo cáo", icon: "chart-pie" },
  { tab: StoreTabType.CUSTOMERS, label: "Khách hàng", icon: "users" },
];

/** react-native-web's Pressable also reports `hovered`/`focused`; RN's type omits them. */
type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

/** Pointer + colour transitions so hover/active changes ease instead of snapping. */
const fx = {
  interactive: {
    cursor: "pointer",
    transitionProperty: "background-color, box-shadow, color",
    transitionDuration: "160ms",
    transitionTimingFunction: "ease",
  } as ViewStyle,
  // react-native-web 0.21 drops `outline*` style props, so the focus ring is a
  // layered boxShadow halo instead.
  focusRing: {
    boxShadow: "0 0 0 2px #FFFFFF, 0 0 0 4px #93C5FD",
  } as ViewStyle,
};

const NavTab: React.FC<{
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}> = ({ label, icon, active, onPress }) => (
  <Pressable
    onPress={onPress}
    role="tab"
    aria-selected={active}
    style={(state) => {
      const { pressed, hovered, focused } = state as PressState;
      return [
        styles.tab,
        fx.interactive,
        active && styles.tabActive,
        !active && hovered && styles.tabHover,
        pressed && !active && styles.tabPressed,
        focused && fx.focusRing,
      ];
    }}
  >
    <FontAwesome5
      name={icon as "clipboard-list"}
      size={14}
      color={active ? "#1D4ED8" : "#475569"}
    />
    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
  </Pressable>
);

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
      {/* Tabs sit in their own inset surface so the bar reads as one zone
          instead of loose labels floating under the header. */}
      <View style={styles.tabGroup} role="tablist">
        {tabs.map(({ tab, label, icon }) => (
          <NavTab
            key={tab}
            label={label}
            icon={icon}
            active={activeTab === tab}
            onPress={() => onTabChange(tab)}
          />
        ))}
      </View>

      <Pressable
        onPress={onCreateOrderPress}
        role="button"
        style={(state) => {
          const { pressed, hovered, focused } = state as PressState;
          return [
            styles.createBtn,
            fx.interactive,
            hovered && styles.createBtnHover,
            pressed && styles.createBtnPressed,
            focused && fx.focusRing,
          ];
        }}
      >
        <FontAwesome5 name="plus" size={13} color="#FFFFFF" />
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
    borderBottomColor: "#E2E8F0",
    // Flat CSS shadow instead of the deprecated shadow* props (web-only bar).
    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.06)",
  },
  tabGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    gap: 2,
    paddingVertical: 3,
    paddingHorizontal: 3,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    // Narrow viewports scroll the pill row instead of pushing "Tạo đơn" off-screen.
    overflow: "scroll",
    // Hide the scrollbar so the inset pill group keeps clean edges.
    // (`scrollbarWidth` is a web-only property missing from RN's style types.)
    ...({ scrollbarWidth: "none" } as ViewStyle),
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 8,
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9,
  },
  tabHover: {
    backgroundColor: "#E2E8F0",
  },
  tabPressed: {
    backgroundColor: "#CBD5E1",
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.12)",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
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
    borderRadius: 9,
    marginLeft: 16,
    boxShadow: "0 1px 3px rgba(37, 99, 235, 0.35)",
  },
  createBtnHover: {
    backgroundColor: "#1D4ED8",
    boxShadow: "0 3px 10px rgba(37, 99, 235, 0.4)",
  },
  createBtnPressed: {
    backgroundColor: "#1E40AF",
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
