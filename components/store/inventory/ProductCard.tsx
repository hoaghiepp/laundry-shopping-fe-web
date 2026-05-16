import { ProductType } from '@/constants/enum';
import { ProductItem } from '@/models/model';
import { formatCurrencyVND } from '@/utils/format';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ProductCardProps {
  product: ProductItem;
  onPress: () => void;
  onAddStock: (itemName: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onAddStock,
}) => {
  const isLowStock = product.status === 'low';
  const isGoods = product.type === ProductType.GOODS;
  const isService = product.type === ProductType.SERVICE;
  const quantityLabel = isGoods ? 'Tồn kho' : isService ? 'Đơn vị' : '';

  console.log(product.thumbnail_url);
  return (
    <TouchableOpacity
      style={[styles.itemCard, isLowStock && styles.lowStockCard]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: product.thumbnail_url }}
        style={styles.itemIcon}
        contentFit="contain"
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{product.name}</Text>
        <Text style={styles.itemMeta}>SKU: {product.sku}</Text>
        {product.price > 0 && (
          <Text style={styles.itemPrice}>
            {formatCurrencyVND(product.price)}
          </Text>
        )}
        <View style={styles.itemFooter}>
          <View style={styles.quantityContainer}>
            {quantityLabel && (
              <Text style={styles.quantityLabel}>{quantityLabel}: </Text>
            )}
            <Text style={[styles.quantity, isLowStock && styles.lowQuantity]}>
              {product.stock_quantity} <Text style={styles.unit}>{product.unit}</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, isLowStock && styles.lowAddButton]}
            onPress={(e) => {
              e.stopPropagation();
              onAddStock(product.name);
            }}
            activeOpacity={0.7}
          >
            <FontAwesome5
              name="plus"
              size={8}
              color={isLowStock ? '#D97706' : '#2563EB'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.addButtonText, isLowStock && styles.lowAddButtonText]}>
              Sửa
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  itemCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  lowStockCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  itemIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 4,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  quantityLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 4,
  },
  quantity: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  lowQuantity: {
    color: '#F59E0B',
  },
  unit: {
    fontSize: 10,
    fontWeight: 'normal',
    color: '#9CA3AF',
  },
  addButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  lowAddButton: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  addButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  lowAddButtonText: {
    color: '#D97706',
  },
});

