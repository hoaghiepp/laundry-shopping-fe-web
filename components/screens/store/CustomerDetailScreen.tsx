import { ProductType } from '@/constants/enum';
import { compatAlert } from '@/lib/compatAlert';
import { orderService } from '@/services/api/orderService';
import { productService } from '@/services/api/productService';
import { StoreCustomer } from '@/services/api/storeService';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  customer: StoreCustomer;
  storeId: string;
  onBack: () => void;
}

interface ProductUsageStat {
  productId: string;
  productName: string;
  thumbnailUrl?: string;
  totalQuantity: number;
  totalIncome: number;
}

export const CustomerDetailScreen: React.FC<Props> = ({ customer, storeId, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [serviceStats, setServiceStats] = useState<ProductUsageStat[]>([]);
  const [goodsStats, setGoodsStats] = useState<ProductUsageStat[]>([]);

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
    return amount?.toString() ?? '0';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const fetchData = useCallback(async () => {
    if (!storeId || !customer.id) return;
    try {
      setLoading(true);

      const response = await orderService.searchStoreOrders(
        {
          hub_id: storeId,
          customer_id: customer.id,
          fetch_order_items: true,
        },
        { page: 0, size: 1000 }
      );
      const orders = response.data || [];
      setTotalOrders(orders.length);

      // Cumulative by product_id
      const serviceQty = new Map<string, number>();
      const serviceIncome = new Map<string, number>();
      const goodsQty = new Map<string, number>();
      const goodsIncome = new Map<string, number>();
      let spent = 0;

      for (const order of orders) {
        spent += order.final_total || 0;
        for (const item of order.order_items || []) {
          const ptype = String(item?.product_type ?? item?.type ?? 'GOODS');
          const productId = String(item?.product_id ?? '');
          if (!productId) continue;
          const qty =
            typeof item?.adjusted_quantity === 'number'
              ? item.adjusted_quantity
              : typeof item?.quantity === 'number'
              ? item.quantity
              : 0;
          const income = typeof item?.total_price === 'number'
            ? item.total_price
            : typeof item?.sub_total === 'number'
            ? item.sub_total
            : 0;

          if (ptype === ProductType.SERVICE) {
            serviceQty.set(productId, (serviceQty.get(productId) ?? 0) + qty);
            serviceIncome.set(productId, (serviceIncome.get(productId) ?? 0) + income);
          } else {
            goodsQty.set(productId, (goodsQty.get(productId) ?? 0) + qty);
            goodsIncome.set(productId, (goodsIncome.get(productId) ?? 0) + income);
          }
        }
      }

      setTotalSpent(spent);

      // Enrich with product info
      const enrichStats = async (
        qtyMap: Map<string, number>,
        incomeMap: Map<string, number>
      ): Promise<ProductUsageStat[]> => {
        const ids = Array.from(qtyMap.keys());
        if (ids.length === 0) return [];
        const res = await productService.searchProducts(
          0,
          Math.max(200, ids.length),
          undefined,
          { store_id: storeId, ids }
        );
        const productList: any[] = res?.data || [];
        const productMap = new Map<string, any>(productList.map((p) => [p.id, p]));
        return ids
          .map((id) => {
            const p = productMap.get(id);
            return {
              productId: id,
              productName: p?.name ?? id,
              thumbnailUrl: p?.thumbnail_url,
              totalQuantity: qtyMap.get(id) ?? 0,
              totalIncome: incomeMap.get(id) ?? 0,
            };
          })
          .sort((a, b) => b.totalIncome - a.totalIncome);
      };

      const [svc, gds] = await Promise.all([
        enrichStats(serviceQty, serviceIncome),
        enrichStats(goodsQty, goodsIncome),
      ]);
      setServiceStats(svc);
      setGoodsStats(gds);
    } catch (e: any) {
      compatAlert('Lỗi', e.message || 'Không thể tải dữ liệu khách hàng');
    } finally {
      setLoading(false);
    }
  }, [storeId, customer.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const renderTable = (stats: ProductUsageStat[], title: string, icon: string, accentColor: string) => (
    <View style={styles.tableCard}>
      <View style={styles.sectionHeader}>
        <FontAwesome5 name={icon} size={13} color={accentColor} />
        <Text style={[styles.sectionTitle, { color: accentColor }]}>{title}</Text>
      </View>

      {stats.length === 0 ? (
        <Text style={styles.emptySection}>Không có dữ liệu</Text>
      ) : (
        <>
          <View style={styles.tableHeader}>
            <Text style={[styles.cell, styles.cellProduct, styles.headerCell]}>Sản phẩm</Text>
            <Text style={[styles.cell, styles.cellNum, styles.headerCell]}>SL</Text>
            <Text style={[styles.cell, styles.cellNum, styles.headerCell, { color: '#16a34a' }]}>
              Doanh thu
            </Text>
          </View>
          {stats.map((stat, index) => (
            <View
              key={stat.productId}
              style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
            >
              <View style={styles.productCell}>
                {stat.thumbnailUrl ? (
                  <Image source={{ uri: stat.thumbnailUrl }} style={styles.productThumb} />
                ) : (
                  <View style={styles.productThumbPlaceholder} />
                )}
                <Text style={[styles.cell, styles.productName]} numberOfLines={2}>
                  {stat.productName}
                </Text>
              </View>
              <Text style={[styles.cell, styles.cellNum, { color: '#374151' }]}>
                {stat.totalQuantity}
              </Text>
              <Text style={[styles.cell, styles.cellNum, { color: '#16a34a' }]}>
                {formatCurrency(stat.totalIncome)}
              </Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={[styles.cell, styles.cellProduct, styles.totalCell]}>Tổng cộng</Text>
            <Text style={[styles.cell, styles.cellNum, styles.totalCell]}>
              {stats.reduce((s, x) => s + x.totalQuantity, 0)}
            </Text>
            <Text style={[styles.cell, styles.cellNum, styles.totalCell, { color: '#16a34a' }]}>
              {formatCurrency(stats.reduce((s, x) => s + x.totalIncome, 0))}
            </Text>
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1e40af', '#1e40af']} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.75}>
            <FontAwesome5 name="arrow-left" size={16} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết khách hàng</Text>
          {loading && <ActivityIndicator size="small" color="#fff" />}
        </View>

        {/* Customer info */}
        <View style={styles.customerCard}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>{getInitials(customer.full_name)}</Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customer.full_name}</Text>
            <Text style={styles.customerSub}>{customer.customer_code}</Text>
          </View>
          <View style={styles.customerWallet}>
            <Text style={styles.walletLabel}>Ví</Text>
            <Text style={styles.walletValue}>{formatCurrency(customer.wallet_balance)}đ</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Tổng đơn</Text>
            <Text style={styles.summaryValue}>{loading ? '–' : totalOrders}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Tổng chi tiêu</Text>
            <Text style={styles.summaryValue}>{loading ? '–' : formatCurrency(totalSpent)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Tham gia</Text>
            <Text style={[styles.summaryValue, { fontSize: 13 }]}>
              {formatDate(customer.created_date)}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Contact row */}
      <View style={styles.contactRow}>
        <View style={styles.contactItem}>
          <FontAwesome5 name="phone" size={11} color="#6B7280" style={{ marginRight: 6 }} />
          <Text style={styles.contactText}>{customer.phone_number}</Text>
        </View>
        {!!customer.email && (
          <View style={styles.contactItem}>
            <FontAwesome5 name="envelope" size={11} color="#6B7280" style={{ marginRight: 6 }} />
            <Text style={styles.contactText} numberOfLines={1}>{customer.email}</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 48 }} />
        ) : (
          <>
            {renderTable(serviceStats, 'Dịch vụ', 'concierge-bell', '#8B5CF6')}
            {renderTable(goodsStats, 'Sản phẩm', 'box', '#F59E0B')}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  customerInfo: { flex: 1 },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  customerSub: {
    fontSize: 12,
    color: '#BFDBFE',
    marginTop: 2,
  },
  customerWallet: { alignItems: 'flex-end' },
  walletLabel: { fontSize: 10, color: '#BFDBFE' },
  walletValue: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  summaryLabel: {
    color: '#BFDBFE',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 13,
    color: '#374151',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 80,
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptySection: {
    padding: 16,
    color: '#9CA3AF',
    fontSize: 13,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderTopWidth: 2,
    borderTopColor: '#DBEAFE',
    alignItems: 'center',
  },
  cell: { fontSize: 13, color: '#374151' },
  cellProduct: { flex: 2, fontWeight: '500', paddingRight: 4 },
  cellNum: { flex: 1, textAlign: 'right', fontWeight: '700' },
  headerCell: { fontWeight: '800', fontSize: 11, color: '#6B7280' },
  totalCell: { fontWeight: '800' },
  productCell: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  productThumb: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  productThumbPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  productName: {
    flex: 1,
    fontWeight: '600',
    color: '#111827',
    fontSize: 12,
  },
});
