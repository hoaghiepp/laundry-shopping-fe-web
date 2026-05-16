import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface CurrentOrderCardProps {
  orderId: string;
  status: string;
  onPress: () => void;
}

export const CurrentOrderCard: React.FC<CurrentOrderCardProps> = ({
  orderId,
  status,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <FontAwesome5 name="truck-loading" size={18} color="#3B82F6" />
        </View>
        <View style={styles.info}>
          <Text style={styles.orderId}>Đơn hàng #{orderId}</Text>
          <Text style={styles.status}>{status}</Text>
        </View>
      </View>
      <FontAwesome5 name="chevron-right" size={14} color="#D1D5DB" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  orderId: {
    fontSize: 12,
    color: '#6B7280',
  },
  status: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
});

