import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FactoryHeaderProps {
  factoryName: string;
  onFactoryPress: () => void;
  onNotificationPress: () => void;
  onProfilePress: () => void;
  onManageAccountPress?: () => void;
  hasNotification?: boolean;
  showManageAccount?: boolean;
  incomingTripsCount?: number;
  onManageFactoryPress?: () => void;
  showManageFactoryButton?: boolean;
}

export const FactoryHeader: React.FC<FactoryHeaderProps> = ({
  factoryName,
  onFactoryPress,
  onNotificationPress,
  onProfilePress,
  onManageAccountPress,
  hasNotification = false,
  showManageAccount = false,
  incomingTripsCount = 0,
  onManageFactoryPress,
  showManageFactoryButton = false,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.factoryInfo}
        onPress={onFactoryPress}
        activeOpacity={0.7}
      >
        <Text style={styles.label}>XƯỞNG SẢN XUẤT</Text>
        <View style={styles.factoryNameRow}>
          <FontAwesome5 name="industry" size={12} color="#FFFFFF" style={styles.icon} />
          <Text style={styles.factoryName}>{factoryName}</Text>
          <FontAwesome5 name="caret-down" size={12} color="#FFFFFF" style={styles.caretIcon} />
        </View>
      </TouchableOpacity>
      
      <View style={styles.actions}>
        {showManageFactoryButton && onManageFactoryPress && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onManageFactoryPress}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="industry" size={12} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {showManageAccount && onManageAccountPress && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onManageAccountPress}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="user-cog" size={12} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* <TouchableOpacity
          style={styles.actionButton}
          onPress={onNotificationPress}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="truck" size={12} color="#FFFFFF" />
          {incomingTripsCount > 0 && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{incomingTripsCount}</Text>
            </View>
          )}
        </TouchableOpacity> */}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onProfilePress}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="user" size={12} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 12,
    paddingTop: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  factoryInfo: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 2,
  },
  factoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 4,
  },
  factoryName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  caretIcon: {
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#1E3A8A',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
