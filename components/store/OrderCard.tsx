import { ProductType } from '@/constants/enum';
import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface OrderCardData {
  id: string;
  status:
    | 'new'
    | 'processing'
    | 'waiting_transport'
    | 'factory'
    | 'waiting_return'
    | 'wait_confirm'
    | 'finished'
    | 'cancelled'
    | 'cancelled_waiting_return'
    | 'customer_rejected_waiting_return'
    | 'exception';
  customerName: string;
  customerPhone: string;
  membershipTier?: string;
  items: {
    icon: string;
    name: string;
    note?: string;
    product_type?: string;
    quantity?: number;
    adjusted_quantity?: number;
  }[];
  specialBadge?: {
    text: string;
    color: string;
    bgColor: string;
    icon?: string;
  };
  paymentStatusBadge?: {
    text: string;
    color: string;
    bgColor: string;
  };
  actionButton?: {
    text: string;
    onPress: () => void;
  };
  note?: string;
  /** Formatted order total (e.g. final_total) */
  totalPrice?: string;
  amount?: string;
  createdTime?: string;
  relativeTime?: string;
  totalWeight?: {
    value: number;
    unit: string;
  };
  totalWeightAdjusted?: {
    value: number;
    unit: string;
  };
}

interface OrderCardStoreProps {
  order: OrderCardData;
  onPress: () => void;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  expandable?: boolean;
  defaultExpanded?: boolean;
}

export const OrderCardStore: React.FC<OrderCardStoreProps> = ({ 
  order, 
  onPress, 
  isSelected = false,
  onSelect,
  expandable = false,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const showDetails = !expandable || isExpanded;

  // Calculate total quantity for service items
  const serviceItems = order.items.filter(item => item.product_type === ProductType.SERVICE);
  const totalServiceQuantity = serviceItems.length;
  const totalGoodsQuantity = order.items.length - totalServiceQuantity;
  const hasServiceItems = serviceItems.length > 0;


  const getBorderColor = () => {
    switch (order.status) {
      case 'new': return '#3B82F6';
      case 'processing': return '#F59E0B';
      case 'waiting_transport': return '#8B5CF6';
      case 'factory': return '#6B7280';
      case 'waiting_return': return '#10B981';
      case 'wait_confirm': return '#F59E0B';
      case 'finished': return '#10B981';
      case 'cancelled': return '#6B7280';
      case 'cancelled_waiting_return': return '#EF4444';
      case 'customer_rejected_waiting_return': return '#EF4444';
      case 'exception': return '#EF4444';
      default: return '#D1D5DB';
    }
  };

  const getSelectionColors = () => {
    switch (order.status) {
      case 'new': 
        return { bg: '#EFF6FF', border: '#2563EB', shadow: '#2563EB' };
      case 'processing': 
        return { bg: '#FFFBEB', border: '#F59E0B', shadow: '#F59E0B' };
      case 'waiting_transport': 
        return { bg: '#F5F3FF', border: '#8B5CF6', shadow: '#8B5CF6' };
      case 'waiting_return': 
        return { bg: '#D1FAE5', border: '#10B981', shadow: '#10B981' };
      case 'finished':
        return { bg: '#ECFDF5', border: '#10B981', shadow: '#10B981' };
      case 'cancelled': 
        return { bg: '#F3F4F6', border: '#9CA3AF', shadow: '#9CA3AF' };
      case 'cancelled_waiting_return': 
        return { bg: '#FEE2E2', border: '#EF4444', shadow: '#EF4444' };
      case 'customer_rejected_waiting_return': 
        return { bg: '#FEE2E2', border: '#EF4444', shadow: '#EF4444' };
      case 'factory': 
        return { bg: '#F9FAFB', border: '#6B7280', shadow: '#6B7280' };
      case 'wait_confirm': 
        return { bg: '#FFFBEB', border: '#F59E0B', shadow: '#F59E0B' };
      case 'exception': 
        return { bg: '#FEF2F2', border: '#EF4444', shadow: '#EF4444' };
      default: 
        return { bg: '#F9FAFB', border: '#D1D5DB', shadow: '#D1D5DB' };
    }
  };

  const getStatusBadge = () => {
    switch (order.status) {
      case 'new': return { text: 'Mới nhận', bg: '#DBEAFE', color: '#1E40AF' };
      case 'processing': return { text: 'Đang xử lý', bg: '#FEF3C7', color: '#92400E' };
      case 'waiting_transport': return { text: 'Chờ vận chuyển', bg: '#EDE9FE', color: '#6B21A8' };
      case 'factory': return { text: 'Ở xưởng', bg: '#F3F4F6', color: '#4B5563' };
      case 'waiting_return': return { text: 'Chờ trả', bg: '#D1FAE5', color: '#065F46' };
      case 'wait_confirm': return { text: 'Chờ xác nhận', bg: '#FEF3C7', color: '#92400E' };
      case 'finished': return { text: 'Hoàn thành', bg: '#ECFDF5', color: '#065F46' };
      case 'cancelled': return { text: 'Đã hủy', bg: '#F3F4F6', color: '#4B5563' };
      case 'cancelled_waiting_return': return { text: 'Đã hủy - Chờ trả', bg: '#FEE2E2', color: '#991B1B' };
      case 'customer_rejected_waiting_return': return { text: 'Khách từ chối - Chờ trả', bg: '#FEE2E2', color: '#991B1B' };
      case 'exception': return { text: 'Sự cố', bg: '#FEE2E2', color: '#991B1B' };
      default: return { text: '', bg: '#F3F4F6', color: '#6B7280' };
    }
  };

  const statusBadge = getStatusBadge();
  const selectionColors = getSelectionColors();

  const handleCheckboxPress = (e: any) => {
    e.stopPropagation();
    onSelect?.(!isSelected);
  };

  const handleToggleExpand = (e: any) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container, 
        { borderLeftColor: getBorderColor() },
        isSelected && {
          ...styles.selectedContainer,
          backgroundColor: selectionColors.bg,
          borderColor: selectionColors.border,
          shadowColor: selectionColors.shadow,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.95}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onSelect && (
            <TouchableOpacity
              style={[
                styles.checkbox,
                isSelected && {
                  ...styles.checkboxSelected,
                  borderColor: selectionColors.border,
                  backgroundColor: selectionColors.border,
                }
              ]}
              onPress={handleCheckboxPress}
              activeOpacity={1}
            >
              {isSelected && (
                <FontAwesome5 name="check" size={10} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          )}
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderId}>{order.id}</Text>
            {order.createdTime && (
              <View style={styles.timeContainer}>
                <Text style={styles.createdTime}>{order.createdTime}</Text>
                {order.relativeTime && (
                  <Text style={styles.relativeTime}> • {order.relativeTime}</Text>
                )}
              </View>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.badges}>
          {order.specialBadge && (
            <View style={[styles.badge, { backgroundColor: order.specialBadge.bgColor }]}>
              {order.specialBadge.icon && (
                <FontAwesome5 name={order.specialBadge.icon} size={8} color={order.specialBadge.color} style={{ marginRight: 4 }} />
              )}
              <Text style={[styles.badgeText, { color: order.specialBadge.color }]}>
                {order.specialBadge.text}
              </Text>
            </View>
          )}
          {order.paymentStatusBadge && (
            <View style={[styles.badge, { backgroundColor: order.paymentStatusBadge.bgColor }]}>
              <Text style={[styles.badgeText, { color: order.paymentStatusBadge.color }]}>
                {order.paymentStatusBadge.text}
              </Text>
            </View>
          )}
          {statusBadge.text && (
            <View style={[styles.badge, { backgroundColor: statusBadge.bg }]}>
              <Text style={[styles.badgeText, { color: statusBadge.color }]}>
                {statusBadge.text}
              </Text>
            </View>
          )}
          </View>
          {expandable && (
            <TouchableOpacity
              style={styles.expandToggle}
              onPress={handleToggleExpand}
              activeOpacity={0.8}
            >
              <FontAwesome5
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={12}
                color="#6B7280"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.customerRow}>
        <View style={styles.avatar}>
          <FontAwesome5 name="crown" size={12} color="#60A5FA" />
        </View>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{order.customerName}</Text>
          <Text style={styles.customerDetails}>
            {order.customerPhone}
          </Text>
        </View>
      </View>

      {showDetails && order.items.length > 0 && (
        <View style={styles.itemsContainer}>
          {order.items.slice(0, 3).map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <FontAwesome5 name={item.icon} size={12} color={item.icon === 'box-open' ? '#FB923C' : '#60A5FA'} style={styles.itemIcon} />
              <Text style={styles.itemText}>
                {item.name} {item.note && <Text style={styles.itemNote}>({item.note})</Text>}
              </Text>
            </View>
          ))}
          {order.items.length > 3 && (
            <View style={styles.itemRow}>
              <View style={styles.itemIcon} />
              <Text style={styles.itemText}>...</Text>
            </View>
          )}
        </View>
      )}

      {showDetails && hasServiceItems && (totalServiceQuantity > 0) && (
        <View style={styles.serviceQuantityContainer}>
          {totalServiceQuantity > 0 && (
            <View style={styles.quantityItem}>
              <Text style={styles.quantityLabel}>Tổng số lượng dịch vụ:</Text>
              <Text style={styles.quantityValue}>{totalServiceQuantity}</Text>
            </View>
          )}
          {totalGoodsQuantity > 0 && (
            <View style={styles.quantityItem}>
              <Text style={styles.quantityLabel}>Tổng số lượng hàng:</Text>
              <Text style={styles.quantityValue}>{totalGoodsQuantity}</Text>
            </View>
          )}
        </View>
      )}

      {showDetails && (order.totalWeight || order.totalWeightAdjusted) && (
        <View style={styles.weightContainer}>
          {order.totalWeight && (
            <View style={styles.weightItem}>
              <Text style={styles.weightLabel}>Tổng cân nặng:</Text>
              <Text style={styles.weightValue}>
                {order.totalWeight.value.toFixed(1)} {order.totalWeight.unit}
              </Text>
            </View>
          )}
          {order.totalWeightAdjusted && (
            <View style={styles.weightItem}>
              <Text style={styles.weightLabel}>Cân nặng điều chỉnh:</Text>
              <Text style={styles.weightValue}>
                {order.totalWeightAdjusted.value.toFixed(1)} {order.totalWeightAdjusted.unit}
              </Text>
            </View>
          )}
        </View>
      )}

      {order.totalPrice && !order.amount && (
        <View style={styles.totalPriceRow}>
          <Text style={styles.totalPriceLabel}>Tổng tiền</Text>
          <Text style={styles.totalPriceValue}>{order.totalPrice}</Text>
        </View>
      )}

      {(order.note || order.actionButton || order.amount) && (
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            {order.note && <Text style={styles.note}>{order.note}</Text>}
            {order.amount && (
              <View>
                <Text style={styles.amountLabel}>Cần thu tiền mặt:</Text>
                <Text style={styles.amount}>{order.amount}</Text>
              </View>
            )}
          </View>
          {order.actionButton && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={order.actionButton.onPress}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>{order.actionButton.text}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  selectedContainer: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
    borderWidth: 2,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  orderIdContainer: {
    flex: 1,
  },
  orderId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  createdTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  relativeTime: {
    fontSize: 10,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  expandToggle: {
    paddingLeft: 4,
    paddingVertical: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FDE68A',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  customerDetails: {
    fontSize: 10,
    color: '#6B7280',
  },
  itemsContainer: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemIcon: {
    width: 16,
    marginRight: 8,
  },
  itemText: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
  },
  itemNote: {
    color: '#9CA3AF',
  },
  serviceQuantityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  quantityItem: {
    flex: 1,
  },
  quantityLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  weightContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  weightItem: {
    flex: 1,
  },
  weightLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 2,
  },
  weightValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  totalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalPriceLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  totalPriceValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerLeft: {
    flex: 1,
  },
  note: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  amountLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  actionButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});







