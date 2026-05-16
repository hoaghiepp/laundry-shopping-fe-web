import { FactoryTab } from '@/constants/enum';
import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FactoryBottomNavProps {
  activeTab: FactoryTab;
  onTabChange: (tab: FactoryTab) => void;
  incomingTripsCount?: number;
}

export const FactoryBottomNav: React.FC<FactoryBottomNavProps> = ({
  activeTab,
  onTabChange,
  incomingTripsCount = 0,
}) => {
  const tabs: { id: FactoryTab; icon: string; label: string }[] = [
    { id: FactoryTab.DASHBOARD, icon: 'list-ul', label: 'Việc làm' },
    { id: FactoryTab.LOGISTICS, icon: 'truck-loading', label: 'Giao nhận' },
    { id: FactoryTab.SCAN, icon: 'qrcode', label: 'Quét' },
    { id: FactoryTab.PROFILE, icon: 'user', label: 'Cá nhân' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.navItem}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <FontAwesome5
                name={tab.icon as any}
                size={18}
                color={isActive ? '#2563EB' : '#9CA3AF'}
              />
              {tab.id === FactoryTab.LOGISTICS && incomingTripsCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{incomingTripsCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 64,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    // Above elevated cards (profile/info use elevation ~8) so tab bar wins hit-testing on Android
    zIndex: 20,
    elevation: Platform.OS === 'android' ? 20 : 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    marginTop: 4,
  },
  navLabelActive: {
    color: '#2563EB',
  },
});
