import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  ordersBadge?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  ordersBadge = 0,
}) => {
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
            {tab.id === 'orders' && ordersBadge > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {ordersBadge > 99 ? '99+' : String(ordersBadge)}
                </Text>
              </View>
            ) : null}
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
    top: -6,
    right: -10,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
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

