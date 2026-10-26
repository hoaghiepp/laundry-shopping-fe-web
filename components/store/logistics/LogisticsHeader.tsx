import { storeMainContentPaddingTop } from "@/constants/storeWebLayout";
import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export type LogisticsTab = 'out' | 'in';

interface LogisticsHeaderProps {
  activeTab: LogisticsTab;
  onTabChange: (tab: LogisticsTab) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const LogisticsHeader: React.FC<LogisticsHeaderProps> = ({
  activeTab,
  onTabChange,
  onRefresh,
  refreshing = false,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Điều phối Vận chuyển</Text>
        {onRefresh && (
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Làm mới danh sách chuyến"
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#1D4ED8" />
            ) : (
              <FontAwesome5 name="sync-alt" size={14} color="#1D4ED8" />
            )}
            <Text style={styles.refreshText}>Làm mới</Text>
          </TouchableOpacity>
        )}
      </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
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

