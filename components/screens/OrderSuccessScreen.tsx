import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Order } from '@/services/api/orderService';
import { formatCurrencyVND } from '@/utils/format';

interface OrderSuccessScreenProps {
  order: Order;
  onViewOrder: () => void;
  onBackToHome: () => void;
}

const getPaymentStatusLabel = (status: string | undefined): string => {
  switch (status) {
    case 'PAID':
      return 'Đã thanh toán';
    case 'PARTIAL_PAID':
      return 'Thanh toán một phần';
    case 'UNPAID':
      return 'Chưa thanh toán';
    default:
      return status || 'Không xác định';
  }
};

const getShippingAddress = (order: Order): string => {
  return [
    order.shipping_address_detail_snapshot,
    order.shipping_ward_snapshot,
    order.shipping_district_snapshot,
    order.shipping_province_snapshot,
  ]
    .filter(Boolean)
    .join(', ');
};

export const OrderSuccessScreen: React.FC<OrderSuccessScreenProps> = ({
  order,
  onViewOrder,
  onBackToHome,
}) => {
  const paymentLabel = getPaymentStatusLabel(order.payment_status as unknown as string);
  const totalAmount = formatCurrencyVND(order.final_total || 0);
  const address = getShippingAddress(order);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <FontAwesome5 name="check" size={48} color="#10B981" />
        </View>
        <Text style={styles.title}>Đặt hàng thành công!</Text>
        <Text style={styles.subtitle}>
          Cảm ơn bạn đã sử dụng dịch vụ. Shipper sẽ liên hệ với bạn trong thời gian sớm nhất.
        </Text>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mã đơn hàng:</Text>
            <Text style={styles.detailValue}>#{order.code || order.id}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tổng thanh toán:</Text>
            <Text style={styles.detailValueBlue}>{totalAmount}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Trạng thái thanh toán:</Text>
            <Text style={styles.detailValue}>{paymentLabel}</Text>
          </View>
          {/* <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Người nhận:</Text>
            <Text style={styles.detailValue}>
              {order.shipping_full_name_snapshot || '---'}
              {order.shipping_phone_number_snapshot
                ? ` (${order.shipping_phone_number_snapshot})`
                : ''}
            </Text>
          </View> */}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Địa chỉ giao:</Text>
            <Text style={styles.detailValue} numberOfLines={2}>
              {address || '---'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={onViewOrder} activeOpacity={0.8}>
          <Text style={styles.primaryButtonText}>Xem Đơn Hàng</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onBackToHome}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Về Trang Chủ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    backgroundColor: '#D1FAE5',
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  detailValueBlue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
});



