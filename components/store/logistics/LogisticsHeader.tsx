import { storeMainContentPaddingTop } from "@/constants/storeWebLayout";
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type LogisticsTab = 'out' | 'in';

interface LogisticsHeaderProps {
  activeTab: LogisticsTab;
  onTabChange: (tab: LogisticsTab) => void;
}

export const LogisticsHeader: React.FC<LogisticsHeaderProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Điều phối Vận chuyển</Text>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'out' && styles.activeTabButton]}
          onPress={() => onTabChange('out')}
          activeOpacity={1}
        >
          <Text style={[styles.tabText, activeTab === 'out' && styles.activeTabText]}>
            Chuyển đi (Out)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'in' && styles.activeTabButton]}
          onPress={() => onTabChange('in')}
          activeOpacity={1}
        >
          <Text style={[styles.tabText, activeTab === 'in' && styles.activeTabText]}>
            Nhận về (In)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginTop: Platform.OS === "web" ? storeMainContentPaddingTop() : 40,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  tabContainer: {
    backgroundColor: '#F3F4F6',
    padding: 4,
    borderRadius: 8,
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#1E40AF',
  },
});

