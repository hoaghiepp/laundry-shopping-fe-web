import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ProductType } from '@/constants/enum';
import { compatAlert } from '@/lib/compatAlert';
import { ProductItem } from '@/models/model';
import { storeService } from '@/services/api/storeService';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ImportStockScreenProps {
  storeId?: string;
  products: ProductItem[];
  onBack: () => void;
  onImported?: () => void;
}

export const ImportStockScreen: React.FC<ImportStockScreenProps> = ({
  storeId,
  products,
  onBack,
  onImported,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const importProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products
      .filter((p) => p.type === ProductType.GOODS)
      .filter((p) => (q ? p.name?.toLowerCase().includes(q) : true));
  }, [products, searchQuery]);

  const handleConfirm = async () => {
    const entries = Object.entries(quantities)
      .map(([id, raw]) => ({ id, qty: Number.parseInt(raw, 10) }))
      .filter((x) => Number.isFinite(x.qty) && x.qty > 0);

    if (entries.length === 0) {
      compatAlert('Nhập hàng', 'Vui lòng nhập số lượng cho ít nhất 1 sản phẩm');
      return;
    }

    try {
      setSubmitting(true);
      const startedAt = Date.now();

      if (!storeId) {
        throw new Error('Store ID not found');
      }

      await Promise.all([
        storeService.importProducts(storeId, {
          products: entries.map((e) => ({ product_id: e.id, quantity: e.qty })),
        }),
        new Promise<void>((resolve) => {
          const remaining = 500 - (Date.now() - startedAt);
          setTimeout(resolve, Math.max(0, remaining));
        }),
      ]);

      compatAlert('Thành công', 'Đã cập nhật tồn kho');
      onImported?.();
      onBack();
    } catch (error: any) {
      console.error('Error importing stock:', error);
      compatAlert('Lỗi', error?.message || 'Không thể nhập hàng');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitting) {
    return <LoadingScreen message="Đang nhập hàng..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.back}
            onPress={() => {
              onBack();
            }}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="chevron-left" size={16} color="#111827" />
            <Text style={styles.headerTitle}>Kho</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerConfirm}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <Text style={styles.headerConfirmText}>
              Xác nhận
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBar}>
        <FontAwesome5 name="search" size={14} color="#9CA3AF" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Tìm theo tên..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          editable={!submitting}
        />
        {!!searchQuery.trim() && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            disabled={submitting}
          >
            <FontAwesome5 name="times-circle" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {importProducts.map((product) => {
          const value = quantities[product.id] ?? '';
          return (
            <View key={`import-${product.id}`} style={styles.card}>
              <View style={styles.cardLeft}>
                <Image
                  source={{ uri: product.thumbnail_url || '' }}
                  style={styles.image}
                  contentFit="contain"
                />
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.meta}>
                    Tồn kho: {product.stock_quantity ?? 0} {product.unit || ''}
                  </Text>
                </View>
              </View>

              <View style={styles.qtyWrap}>
                <Text style={styles.qtyLabel}>Nhập</Text>
                <TextInput
                  value={value}
                  onChangeText={(t) => {
                    const next = t.replace(/[^\d]/g, '');
                    setQuantities((prev) => ({ ...prev, [product.id]: next }));
                  }}
                  style={styles.qtyInput}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  editable={!submitting}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 120 ,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  headerConfirm: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  qtyWrap: {
    alignItems: 'flex-end',
    gap: 6,
  },
  qtyLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
  },
  qtyInput: {
    width: 72,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
    paddingVertical: 0,
    paddingHorizontal: 10,
  },
});

