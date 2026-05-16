import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', icon: 'home', label: 'Trang chủ' },
    { id: 'cart', icon: 'shopping-bag', label: 'Giỏ hàng', badge: 2 },
    { id: 'orders', icon: 'clipboard-list', label: 'Đơn hàng' },
    { id: 'wallet', icon: 'wallet', label: 'Tài sản' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tab}
          onPress={() => onTabChange(tab.id)}
          activeOpacity={1}
        >
          <View style={styles.iconContainer}>
            <FontAwesome5
              name={tab.icon}
              size={20}
              color={activeTab === tab.id ? '#3B82F6' : '#9CA3AF'}
            />
            
          </View>
          <Text
            style={[styles.label, activeTab === tab.id ? styles.activeLabel : styles.inactiveLabel]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
  },
  activeLabel: {
    color: '#3B82F6',
  },
  inactiveLabel: {
    color: '#9CA3AF',
  },
});

