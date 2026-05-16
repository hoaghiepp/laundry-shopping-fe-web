import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { OrderTab } from "./utils/orderHelpers";

interface OrderTabsProps {
  activeTab: OrderTab;
  onTabChange: (tab: OrderTab) => void;
  tabCounts?: {
    new: number;
    processing: number;
    waiting_transport: number;
    waiting_return: number;
    finished: number;
    cancelled: number;
  };
}

export const OrderTabs: React.FC<OrderTabsProps> = ({
  activeTab,
  onTabChange,
  tabCounts,
}) => {
  const getTabCount = (tab: OrderTab) => {
    return tabCounts ? tabCounts[tab] : 0;
  };
  const formatLabel = (label: string, tab: OrderTab) => {
    if (!tabCounts) return label;
    return `${label} (${getTabCount(tab)})`;
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
    >
      <TouchableOpacity
        style={[styles.tab, activeTab === "new" && styles.activeTab]}
        onPress={() => onTabChange("new")}
        activeOpacity={1}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "new" && styles.activeTabText,
          ]}
        >
          {formatLabel("Mới", "new")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === "processing" && styles.activeTab]}
        onPress={() => onTabChange("processing")}
        activeOpacity={1}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "processing" && styles.activeTabText,
          ]}
        >
          {formatLabel("Đang xử lý", "processing")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === "waiting_transport" && styles.activeTab,
        ]}
        onPress={() => onTabChange("waiting_transport")}
        activeOpacity={1}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "waiting_transport" && styles.activeTabText,
          ]}
        >
          {formatLabel("Chờ vận chuyển", "waiting_transport")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === "waiting_return" && styles.activeTab,
        ]}
        onPress={() => onTabChange("waiting_return")}
        activeOpacity={1}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "waiting_return" && styles.activeTabText,
          ]}
        >
          {formatLabel("Chờ trả", "waiting_return")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === "finished" && styles.activeTab]}
        onPress={() => onTabChange("finished")}
        activeOpacity={1}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "finished" && styles.activeTabText,
          ]}
        >
          {formatLabel("Hoàn thành", "finished")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === "cancelled" && styles.activeTab,
        ]}
        onPress={() => onTabChange("cancelled")}
        activeOpacity={1}
      >
        <Text
          style={[
            styles.tabText,
            activeTab === "cancelled" && styles.activeTabText,
          ]}
        >
          {formatLabel("Đã hủy", "cancelled")}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: "row",
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    backgroundColor: "#FFFFFF",
  },
  activeTab: {
    borderBottomColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#2563EB",
  },
});

