import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CustomerInfoCardProps {
  name: string;
  phone: string;
  address: string;
  membershipTier?: string;
  onCallPress: () => void;
}

export const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({
  name,
  phone,
  address,
  membershipTier,
  onCallPress,
}) => {
  const getInitials = (fullName: string) => {
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return parts[parts.length - 2][0] + parts[parts.length - 1][0];
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const handleCallPress = async () => {
    try {
      // Open phone dialer with phone number pre-filled
      await Linking.openURL(`tel:${phone}`);
      // Call the original callback if provided
      onCallPress();
    } catch (error) {
      console.error('Error opening phone dialer:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{name}</Text>
            {membershipTier && (
              <View style={styles.tierBadge}>
                <Text style={styles.tierText}>{membershipTier}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${phone}`)} activeOpacity={1}>
            <Text style={styles.phoneText}>
              <FontAwesome5 name="phone-alt" size={10} color="#9CA3AF" /> <Text style={styles.phoneNumber}>{phone}</Text>
            </Text>
          </TouchableOpacity>
          <Text style={styles.address} numberOfLines={1}>
            <FontAwesome5 name="map-marker-alt" size={10} color="#9CA3AF" /> {address}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.callButton} onPress={handleCallPress} activeOpacity={1}>
        <FontAwesome5 name="phone" size={12} color="#2563EB" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  content: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  tierBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tierText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: 'normal',
  },
  phoneText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  phoneNumber: {
    color: '#2563EB',
  },
  address: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  callButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});







