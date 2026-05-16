import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface HomeHeaderProps {
  userName: string;
  location: string;
  onProfilePress: () => void;
  onStoreFinderPress: () => void;
  onNotificationPress: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  userName,
  location,
  onProfilePress,
  onStoreFinderPress,
  onNotificationPress,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.userInfo} onPress={onProfilePress} activeOpacity={0.7} className="group">
        <Text style={styles.greeting}>Xin chào,</Text>
        <View style={styles.nameRow}>
          <Text style={styles.name} className="group-hover:underline">{userName}</Text>
          <View style={styles.editIcon} className="group-hover:opacity-100">
            <FontAwesome5 name="pen" size={8} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.locationRow}>
          <View style={styles.locationInfo}>
            <FontAwesome5 name="map-marker-alt" size={10} color="#BFDBFE" />
            <Text style={styles.locationText}>{location}</Text>
          </View>
          {/* <TouchableOpacity
            style={styles.storeButton}
            onPress={onStoreFinderPress}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="store" size={8} color="#FFFFFF" />
            <Text style={styles.storeButtonText}>Tìm tiệm</Text>
          </TouchableOpacity> */}
        </View>
      </TouchableOpacity>

      {/* <TouchableOpacity style={styles.notificationButton} onPress={onNotificationPress}>
        <FontAwesome5 name="bell" size={18} color="#FFFFFF" />
        <View style={styles.notificationDot} />
      </TouchableOpacity> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2563EB',
    padding: 20,
    paddingBottom: 80,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    color: '#BFDBFE',
    fontSize: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  editIcon: {
    backgroundColor: '#3B82F6',
    padding: 4,
    borderRadius: 999,
    opacity: 0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  locationText: {
    color: '#BFDBFE',
    fontSize: 12,
    flexShrink: 1,
  },
  storeButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  storeButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  notificationButton: {
    backgroundColor: '#3B82F6',
    padding: 8,
    borderRadius: 999,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2563EB',
  },
});

