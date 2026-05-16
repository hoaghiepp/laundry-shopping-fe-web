import { ProductType } from '@/constants/enum';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getItemStatusDisplay, getItemTypeDisplay } from './logisticsUtils';

interface TripItemCardProps {
  item: any;
  index: number;
  orderCode?: string;
  barcode?: string;
  orderData?: any; // Order data with order_items
  storeId?: string;
  onOrderPress?: () => void;
}

export const TripItemCard: React.FC<TripItemCardProps> = ({
  item,
  index,
  orderCode,
  barcode,
  orderData,
  storeId,
  onOrderPress,
}) => {
  const [orderInfo, setOrderInfo] = useState<any>(orderData);
  const itemStatus = getItemStatusDisplay(item.status);

  // Calculate total service quantity from order items
  const calculateServiceQuantity = (order: any): number => {
    if (!order?.order_items || !Array.isArray(order.order_items)) {
      return 0;
    }

    const serviceItems = order.order_items.filter(
      (item: any) => (item.product_type as ProductType) === ProductType.SERVICE
    );

    return serviceItems.reduce((sum: number, item: any) => {
      const quantity = Number(item.adjusted_quantity) || 0;
      return sum + quantity;
    }, 0);
  };

  const totalServiceQuantity = orderInfo ? calculateServiceQuantity(orderInfo) : 0;

  return (
    <View style={styles.tripItemCard}>
      <View style={styles.tripItemHeader}>
        <Text style={styles.tripItemNumber}>#{index + 1}</Text>
        <View
          style={[
            styles.tripItemStatusBadge,
            { backgroundColor: itemStatus.bg },
          ]}
        >
          <Text
            style={[
              styles.tripItemStatusText,
              { color: itemStatus.color },
            ]}
          >
            {itemStatus.text}
          </Text>
        </View>
      </View>
      <View style={styles.tripItemInfo}>
        <Text style={styles.tripItemLabel}>Loại:</Text>
        <Text style={styles.tripItemValue}>
          {getItemTypeDisplay(item.type)}
        </Text>
      </View>
      <View style={styles.tripItemInfo}>
        <Text style={styles.tripItemLabel}>Mã đơn hàng:</Text>
        {onOrderPress && orderCode ? (
          <TouchableOpacity onPress={onOrderPress} activeOpacity={0.7}>
            <Text style={[styles.tripItemValue, styles.tripItemValueLink]}>
              {orderCode}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.tripItemValue}>
            {orderCode || item.service_item_tracking_id}
          </Text>
        )}
      </View>
      {barcode && (
        <View style={styles.tripItemInfo}>
          <Text style={styles.tripItemLabel}>Mã lô:</Text>
          <Text style={[styles.tripItemValue, styles.barcodeValue]}>
            {barcode}
          </Text>
        </View>
      )}
      {totalServiceQuantity > 0 && (
        <View style={styles.tripItemInfo}>
          <Text style={styles.tripItemLabel}>Tổng SL dịch vụ:</Text>
          <Text style={[styles.tripItemValue, styles.serviceQuantity]}>
            {totalServiceQuantity.toFixed(1)} kg
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tripItemCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tripItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripItemNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  tripItemStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tripItemStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  tripItemInfo: {
    flexDirection: 'row',
    marginTop: 4,
  },
  tripItemLabel: {
    fontSize: 12,
    color: '#6B7280',
    width: 100,
  },
  tripItemValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  tripItemValueLink: {
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  barcodeValue: {
    color: '#7C3AED',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  serviceQuantity: {
    color: '#16A34A',
    fontWeight: 'bold',
  },
});

