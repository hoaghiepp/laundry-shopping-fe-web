import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text as UIText } from '@/components/ui/text';
import { formatCurrencyVND } from '@/utils/format';

interface PriceBreakdown {
  label: string;
  value: number;
  type?: 'default' | 'discount' | 'total';
}

interface PriceSummaryCardProps {
  breakdown: PriceBreakdown[];
  total: number;
  estimatedDelivery?: string;
}

export const PriceSummaryCard: React.FC<PriceSummaryCardProps> = ({
  breakdown,
  total,
  estimatedDelivery,
}) => {
  const renderPriceRow = (item: PriceBreakdown, index: number) => {
    const isTotal = item.type === 'total';
    const isDiscount = item.type === 'discount';

    return (
      <View
        key={index}
        style={[
          styles.priceRow,
          isTotal && styles.totalRow,
          index < breakdown.length - 1 && !isTotal && styles.priceRowBorder,
        ]}
      >
        <UIText
          style={[
            styles.priceLabel,
            isDiscount && styles.discountLabel,
            isTotal && styles.totalLabel,
          ]}
        >
          {item.label}
        </UIText>
        <UIText
          style={[
            styles.priceValue,
            isDiscount && styles.discountValue,
            isTotal && styles.totalValue,
          ]}
        >
          {isDiscount && item.value > 0 ? '-' : ''}
          {formatCurrencyVND(Math.abs(item.value))}
        </UIText>
      </View>
    );
  };

  return (
    <Box style={styles.container}>
      <UIText style={styles.title}>Tổng thanh toán</UIText>
      <View style={styles.breakdown}>
        {breakdown.map((item, index) => renderPriceRow(item, index))}
      </View>
      {estimatedDelivery && (
        <View style={styles.deliveryInfo}>
          <UIText style={styles.deliveryText}>
            📦 Giao hàng dự kiến: {estimatedDelivery}
          </UIText>
        </View>
      )}
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  breakdown: {
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRowBorder: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  priceLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  priceValue: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  discountLabel: {
    color: '#059669',
  },
  discountValue: {
    color: '#059669',
    fontWeight: '700',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
  },
  deliveryInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  deliveryText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});

