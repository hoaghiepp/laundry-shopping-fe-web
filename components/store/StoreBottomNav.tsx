import { StoreTabType } from '@/constants/enum';
import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface StoreBottomNavProps {
  activeTab: StoreTabType;
  onTabChange: (tab: StoreTabType) => void;
  onCreateOrderPress: () => void;
}

const FAB_SIZE = 60;
const FAB_HALF = FAB_SIZE / 2;

export const StoreBottomNav: React.FC<StoreBottomNavProps> = ({
  activeTab,
  onTabChange,
  onCreateOrderPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Left group */}
      <View style={styles.sideGroup}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onTabChange(StoreTabType.ORDERS)}
          activeOpacity={0.7}
        >
          <FontAwesome5
            name="clipboard-list"
            size={18}
            color={activeTab === StoreTabType.ORDERS ? '#2563EB' : '#9CA3AF'}
          />
          <Text style={[styles.navText, activeTab === StoreTabType.ORDERS && styles.activeText]}>
            Đơn hàng
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onTabChange(StoreTabType.INVENTORY)}
          activeOpacity={0.7}
        >
          <FontAwesome5
            name="boxes"
            size={18}
            color={activeTab === StoreTabType.INVENTORY ? '#2563EB' : '#9CA3AF'}
          />
          <Text style={[styles.navText, activeTab === StoreTabType.INVENTORY && styles.activeText]}>
            Kho
          </Text>
        </TouchableOpacity>
      </View>

      {/* Right group */}
      <View style={styles.sideGroup}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onTabChange(StoreTabType.LOGISTICS)}
          activeOpacity={0.7}
        >
          <FontAwesome5
            name="truck-moving"
            size={18}
            color={activeTab === StoreTabType.LOGISTICS ? '#2563EB' : '#9CA3AF'}
          />
          <Text style={[styles.navText, activeTab === StoreTabType.LOGISTICS && styles.activeText]}>
            Giao nhận
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onTabChange(StoreTabType.REPORT)}
          activeOpacity={0.7}
        >
          <FontAwesome5
            name="chart-pie"
            size={18}
            color={activeTab === StoreTabType.REPORT ? '#2563EB' : '#9CA3AF'}
          />
          <Text style={[styles.navText, activeTab === StoreTabType.REPORT && styles.activeText]}>
            Báo cáo
          </Text>
        </TouchableOpacity>
      </View>

      {/* Floating create-order button (absolute centered) */}
      <TouchableOpacity style={styles.fabButton} onPress={onCreateOrderPress} activeOpacity={0.85}>
        <FontAwesome5 name="plus" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,

    height: 76,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingHorizontal: 28,
    paddingBottom: 18,

    ...Platform.select({
      web: {
        paddingBottom: 12,
      },
      default: {},
    }),
  },

  sideGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20, // Reduced gap to fit more items
  },

  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
  },

  navText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 4,
  },

  activeText: {
    color: '#2563EB',
  },

  fabButton: {
    position: 'absolute',
    top: -FAB_HALF + 6,
    left: '50%',
    // marginLeft: -FAB_HALF,

    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_HALF,

    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',

    borderWidth: 4,
    borderColor: '#F3F4F6',

    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,

    // Android shadow
    elevation: 8,
  },
});
