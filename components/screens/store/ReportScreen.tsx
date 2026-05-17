import { ReportWebLayout } from '@/components/screens/store/report/ReportWebLayout';
import type {
  DailyInvStat,
  ProductStat,
  ServiceUsageStat,
  TabType,
} from '@/components/screens/store/report/reportTypes';
import { OrderStatus, ProductType } from '@/constants/enum';
import { compatAlert } from '@/lib/compatAlert';
import { Order, orderService } from '@/services/api/orderService';
import { productService } from '@/services/api/productService';
import { storeService } from '@/services/api/storeService';
import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ReportScreenProps {
  storeId?: string;
}

type DatePickerMode = 'from' | 'to' | null;

export const ReportScreen: React.FC<ReportScreenProps> = ({ storeId }) => {
  const [tab, setTab] = useState<TabType>('inventory');

  const now = new Date();
  const [fromDate, setFromDate] = useState<Date>(now);
  const [toDate, setToDate] = useState<Date>(now);
  const [pickerMode, setPickerMode] = useState<DatePickerMode>(null);

  const [invLoading, setInvLoading] = useState(false);
  const [productStats, setProductStats] = useState<ProductStat[]>([]);
  const [dailyInvStats, setDailyInvStats] = useState<DailyInvStat[]>([]);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [totalImport, setTotalImport] = useState(0);
  const [totalExport, setTotalExport] = useState(0);
  const [totalImportValue, setTotalImportValue] = useState(0);
  const [totalExportValue, setTotalExportValue] = useState(0);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);

  const [ordersLoading, setOrdersLoading] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [processingOrdersCount, setProcessingOrdersCount] = useState(0);
  const [completedOrdersCount, setCompletedOrdersCount] = useState(0);
  const [serviceUsage, setServiceUsage] = useState<ServiceUsageStat[]>([]);
  const [reportOrders, setReportOrders] = useState<Order[]>([]);
  const [storeName, setStoreName] = useState('');

  const formatDate = (date: Date) =>
    date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const toDateKey = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const isSameDay = (a: Date, b: Date) => toDateKey(a) === toDateKey(b);

  const eachDayInRange = (from: Date, to: Date) => {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(0, 0, 0, 0);
    const days: Date[] = [];
    for (let d = start; d <= end; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
      days.push(new Date(d));
    }
    return days;
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setPickerMode(null);
    }
    if (date) {
      if (pickerMode === 'from') {
        setFromDate(date);
        if (Platform.OS === 'ios') setPickerMode(null);
      } else if (pickerMode === 'to') {
        setToDate(date);
        if (Platform.OS === 'ios') setPickerMode(null);
      }
    } else {
      setPickerMode(null);
    }
  };

  const fetchInventoryStats = useCallback(
    async () => {
      if (!storeId) {
        setProductStats([]);
        setDailyInvStats([]);
        setExpandedDays({});
        setTotalImport(0);
        setTotalExport(0);
        setTotalImportValue(0);
        setTotalExportValue(0);
        setTotalInventoryValue(0);
        return;
      }
      try {
        setInvLoading(true);

        // Inventory value is based on current goods stock in store
        try {
          const goodsRes = await productService.searchProducts(0, 1000, undefined, {
            store_id: storeId,
            type: ProductType.GOODS,
          });
          const goods: any[] = goodsRes?.data || [];
          const invValue = goods.reduce((sum, p) => {
            const qty = typeof p?.stock_quantity === 'number' ? p.stock_quantity : 0;
            const price = typeof p?.price === 'number' ? p.price : 0;
            return sum + qty * price;
          }, 0);
          setTotalInventoryValue(invValue);
        } catch {
          setTotalInventoryValue(0);
        }

        if (!isSameDay(fromDate, toDate)) {
          setProductStats([]);

          const days = eachDayInRange(fromDate, toDate);
          if (days.length > 31) {
            compatAlert('Lỗi', 'Vui lòng chọn khoảng thời gian tối đa 31 ngày');
            setDailyInvStats([]);
            setExpandedDays({});
            setTotalImport(0);
            setTotalExport(0);
            setTotalImportValue(0);
            setTotalExportValue(0);
            return;
          }

          const results = await Promise.allSettled(
            days.map(async (day) => {
              const from = new Date(day);
              from.setHours(0, 0, 0, 0);
              const to = new Date(day);
              to.setHours(23, 59, 59, 999);

              const request = {
                store_id: storeId,
                product_ids: [],
                from_time: from.toISOString(),
                to_time: to.toISOString(),
              };
              const response = await storeService.staticstics(request);
              const byProductId = response?.data?.by_product_id ?? {};

              let imp = 0;
              let exp = 0;
              for (const data of Object.values<any>(byProductId)) {
                imp += data?.total_quantity_by_type?.IMPORT ?? 0;
                exp += data?.total_quantity_by_type?.EXPORT ?? 0;
              }

              return {
                dateKey: toDateKey(day),
                label: formatDate(day),
                importQty: imp,
                exportQty: exp,
                totalQty: imp + exp,
                byProductId,
              };
            })
          );

          const fulfilled = results
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
            .map((r) => r.value)
            .filter((v) => (v?.importQty ?? 0) > 0 || (v?.exportQty ?? 0) > 0);

          if (fulfilled.length === 0) {
            setDailyInvStats([]);
            setExpandedDays({});
            setTotalImport(0);
            setTotalExport(0);
            return;
          }

          const allProductIds = Array.from(
            new Set(fulfilled.flatMap((d) => Object.keys(d.byProductId ?? {})))
          );

          const productMap = new Map<string, any>();
          if (allProductIds.length > 0) {
            const productResponse = await productService.searchProducts(
              0,
              Math.max(200, allProductIds.length),
              undefined,
              { store_id: storeId, ids: allProductIds }
            );
            const productList: any[] = productResponse?.data || [];
            for (const p of productList) productMap.set(p.id, p);
          }

          const stats: DailyInvStat[] = [];
          let totalImp = 0;
          let totalExp = 0;
          let totalImpValue = 0;
          let totalExpValue = 0;

          for (const d of fulfilled) {
            const byProductId = d.byProductId ?? {};
            const products = Object.entries<any>(byProductId)
              .map(([productId, data]) => {
                const p = productMap.get(productId);
                const importQty = data?.total_quantity_by_type?.IMPORT ?? 0;
                const exportQty = data?.total_quantity_by_type?.EXPORT ?? 0;
                const price = typeof p?.price === 'number' ? p.price : 0;
                totalImpValue += importQty * price;
                totalExpValue += exportQty * price;
                return {
                  productId,
                  productName: p?.name ?? productId,
                  productThumbnailUrl: p?.thumbnail_url,
                  price,
                  importQty,
                  exportQty,
                  totalQty: importQty + exportQty,
                };
              })
              .filter((x) => x.importQty > 0 || x.exportQty > 0)
              .sort((a, b) => b.totalQty - a.totalQty);

            stats.push({
              dateKey: d.dateKey,
              label: d.label,
              importQty: d.importQty,
              exportQty: d.exportQty,
              totalQty: d.totalQty,
              products,
            });

            totalImp += d.importQty;
            totalExp += d.exportQty;
          }

          stats.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
          setDailyInvStats(stats);
          setExpandedDays((prev) => {
            const next: Record<string, boolean> = {};
            for (const s of stats) next[s.dateKey] = prev[s.dateKey] ?? false;
            return next;
          });
          setTotalImport(totalImp);
          setTotalExport(totalExp);
          setTotalImportValue(totalImpValue);
          setTotalExportValue(totalExpValue);
          return;
        }

        setDailyInvStats([]);
        setExpandedDays({});

        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);

        const request = {
          store_id: storeId,
          product_ids: [],
          from_time: from.toISOString(),
          to_time: to.toISOString(),
        };

        console.log('request', request);

        const response = await storeService.staticstics(request);

        const byProductId = response?.data?.by_product_id ?? {};
        const productIds = Object.keys(byProductId);

        // Enrich products: name, thumbnail, stock_quantity
        // Use the provided ids filter to avoid fetching everything.
        const productResponse = await productService.searchProducts(0, Math.max(200, productIds.length), undefined, {
          store_id: storeId,
          ids: productIds,
        });
        const productList: any[] = productResponse?.data || [];
        const productMap = new Map<string, any>(productList.map((p) => [p.id, p]));

        let totalImp = 0;
        let totalExp = 0;
        let totalImpValue = 0;
        let totalExpValue = 0;

        const stats: ProductStat[] = Object.entries(byProductId).map(
          ([productId, data]) => {
            const product = productMap.get(productId);
            const importQty = data.total_quantity_by_type?.IMPORT ?? 0;
            const exportQty = data.total_quantity_by_type?.EXPORT ?? 0;
            const stockQty = typeof product?.stock_quantity === 'number' ? product.stock_quantity : importQty - exportQty;
            const price = typeof product?.price === 'number' ? product.price : 0;
            totalImp += importQty;
            totalExp += exportQty;
            totalImpValue += importQty * price;
            totalExpValue += exportQty * price;
            return {
              productId,
              productName: product?.name ?? productId,
              productThumbnailUrl: product?.thumbnail_url,
              price,
              importQty,
              exportQty,
              stockQty,
            };
          }
        );

        setProductStats(stats);
        setTotalImport(totalImp);
        setTotalExport(totalExp);
        setTotalImportValue(totalImpValue);
        setTotalExportValue(totalExpValue);
      } catch (e: any) {
        compatAlert('Lỗi', e.message || 'Không thể tải thống kê kho');
        setProductStats([]);
        setDailyInvStats([]);
        setExpandedDays({});
        setTotalImport(0);
        setTotalExport(0);
        setTotalImportValue(0);
        setTotalExportValue(0);
        setTotalInventoryValue(0);
      } finally {
        setInvLoading(false);
      }
    },
    [storeId, fromDate, toDate]
  );

  const fetchOrderStats = useCallback(async () => {
      if (!storeId) {
        setReportOrders([]);
        return;
      }
      try {
        setOrdersLoading(true);
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);

      const response = await orderService.searchStoreOrders(
        {
          hub_id: storeId,
          from_date: from.toISOString(),
          to_date: to.toISOString(),
          fetch_order_items: true,
        },
        { page: 0, size: 1000 }
      );
      const orders: Order[] = response.data || [];
      setReportOrders(orders);
      setTotalOrders(orders.length);
      const serviceRevenue = orders.reduce((sum, o) => {
        const items = o.order_items || [];
        return sum + items
          .filter((item: any) => String(item?.product_type ?? item?.type ?? '') === ProductType.SERVICE)
          .reduce((s: number, item: any) => s + (item?.total_price ?? item?.sub_total ?? 0), 0);
      }, 0);
      setTotalRevenue(serviceRevenue);
      setNewOrdersCount(orders.filter((o) => o.status === OrderStatus.CREATED).length);
      setProcessingOrdersCount(orders.filter((o) => o.status === OrderStatus.PROCESSING).length);
      setCompletedOrdersCount(orders.filter((o) => o.status === OrderStatus.FINISHED).length);

      // Service usage statistics (group by service product_id)
      const usageMap = new Map<string, number>();
      const incomeMap = new Map<string, number>();
      for (const order of orders) {
        const items = order.order_items || [];
        for (const item of items) {
          const productType = String(item?.product_type ?? item?.type ?? 'GOODS');
          if (productType !== ProductType.SERVICE) continue;
          const productId = String(item?.product_id ?? '');
          if (!productId) continue;
          const qty =
            typeof item?.adjusted_quantity === 'number'
              ? item.adjusted_quantity
              : typeof item?.quantity === 'number'
              ? item.quantity
              : 0;
          const income =
            typeof item?.total_price === 'number'
              ? item.total_price
              : typeof item?.sub_total === 'number'
              ? item.sub_total
              : 0;
          usageMap.set(productId, (usageMap.get(productId) ?? 0) + qty);
          incomeMap.set(productId, (incomeMap.get(productId) ?? 0) + income);
        }
      }

      const serviceIds = Array.from(usageMap.keys());
      if (serviceIds.length === 0) {
        setServiceUsage([]);
      } else {
        const productResponse = await productService.searchProducts(
          0,
          Math.max(200, serviceIds.length),
          undefined,
          { store_id: storeId, ids: serviceIds }
        );
        const productList: any[] = productResponse?.data || [];
        const productMap = new Map<string, any>(productList.map((p) => [p.id, p]));

        const usage: ServiceUsageStat[] = serviceIds
          .map((id) => {
            const p = productMap.get(id);
            return {
              productId: id,
              productName: p?.name ?? id,
              productThumbnailUrl: p?.thumbnail_url,
              totalQuantity: usageMap.get(id) ?? 0,
              totalIncome: incomeMap.get(id) ?? 0,
            };
          })
          .sort((a, b) => b.totalIncome - a.totalIncome);

        setServiceUsage(usage);
      }
    } catch (e: any) {
      setReportOrders([]);
      compatAlert('Lỗi', e.message || 'Không thể tải thống kê đơn hàng');
    } finally {
      setOrdersLoading(false);
    }
  }, [storeId, fromDate, toDate]);

  useEffect(() => {
    if (!storeId) {
      setStoreName('');
      return;
    }
    storeService
      .getStoreProfile(storeId)
      .then((res) => setStoreName(res?.data?.name ?? ''))
      .catch(() => setStoreName(''));
  }, [storeId]);

  useEffect(() => {
    if (tab === 'inventory') {
      fetchInventoryStats();
    }
  }, [fromDate, toDate, tab]);

  useEffect(() => {
    if (tab === 'orders') {
      fetchOrderStats();
    }
  }, [tab, fromDate, toDate]);

  const totalStock = totalImport - totalExport;

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
    return amount.toString();
  };

  const isLoading = tab === 'inventory' ? invLoading : ordersLoading;

  if (Platform.OS === 'web') {
    return (
      <ReportWebLayout
        tab={tab}
        setTab={setTab}
        fromDate={fromDate}
        toDate={toDate}
        setFromDate={setFromDate}
        setToDate={setToDate}
        isSameDay={isSameDay(fromDate, toDate)}
        invLoading={invLoading}
        ordersLoading={ordersLoading}
        productStats={productStats}
        dailyInvStats={dailyInvStats}
        expandedDays={expandedDays}
        setExpandedDays={setExpandedDays}
        totalImport={totalImport}
        totalExport={totalExport}
        totalImportValue={totalImportValue}
        totalExportValue={totalExportValue}
        totalInventoryValue={totalInventoryValue}
        totalOrders={totalOrders}
        totalRevenue={totalRevenue}
        newOrdersCount={newOrdersCount}
        processingOrdersCount={processingOrdersCount}
        completedOrdersCount={completedOrdersCount}
        serviceUsage={serviceUsage}
        reportOrders={reportOrders}
        storeName={storeName}
      />
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1e40af', '#1e40af']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Báo cáo</Text>
          {isLoading && <ActivityIndicator size="small" color="#fff" />}
        </View>

        <View style={styles.dateRow}>
          <TouchableOpacity
            style={styles.datePill}
            onPress={() => setPickerMode('from')}
            activeOpacity={0.75}
          >
            <FontAwesome5 name="calendar" size={11} color="rgba(255,255,255,0.8)" />
            <Text style={styles.datePillText}>{formatDate(fromDate)}</Text>
          </TouchableOpacity>
          <Text style={styles.dateSep}>–</Text>
          <TouchableOpacity
            style={styles.datePill}
            onPress={() => setPickerMode('to')}
            activeOpacity={0.75}
          >
            <FontAwesome5 name="calendar" size={11} color="rgba(255,255,255,0.8)" />
            <Text style={styles.datePillText}>{formatDate(toDate)}</Text>
          </TouchableOpacity>
        </View>

        {pickerMode !== null && (
          <DateTimePicker
            value={pickerMode === 'from' ? fromDate : toDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {tab === 'inventory' ? (
          <View style={{ gap: 10 }}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Nhập</Text>
                <Text style={styles.summaryValue}>{invLoading ? '–' : totalImport}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Xuất</Text>
                <Text style={styles.summaryValue}>{invLoading ? '–' : totalExport}</Text>
              </View>
            </View>

            <View style={styles.valueRow}>
              <View style={styles.valueItem}>
                <Text style={styles.valueLabel}>Giá trị nhập</Text>
                <Text style={styles.valueText}>
                  {invLoading ? '–' : `${formatCurrency(totalImportValue)}₫`}
                </Text>
              </View>
              <View style={styles.valueDivider} />
              <View style={styles.valueItem}>
                <Text style={styles.valueLabel}>Doanh thu xuất</Text>
                <Text style={styles.valueText}>
                  {invLoading ? '–' : `${formatCurrency(totalExportValue)}₫`}
                </Text>
              </View>
              <View style={styles.valueDivider} />
              <View style={styles.valueItem}>
                <Text style={styles.valueLabel}>Giá trị tồn</Text>
                <Text style={styles.valueText}>
                  {invLoading ? '–' : `${formatCurrency(totalInventoryValue)}₫`}
                </Text>
              </View>
            </View>
            {/* <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tồn kho</Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: '#86efac' },
                ]}
              >
                {invLoading ? '–' : totalStock}
              </Text>
            </View> */}
          </View>
        ) : (
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tổng đơn</Text>
              <Text style={styles.summaryValue}>{ordersLoading ? '–' : totalOrders}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Doanh thu</Text>
              <Text style={styles.summaryValue}>
                {ordersLoading ? '–' : formatCurrency(totalRevenue)}
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'inventory' && styles.tabItemActive]}
          onPress={() => setTab('inventory')}
          activeOpacity={0.75}
        >
          <Text style={[styles.tabText, tab === 'inventory' && styles.tabTextActive]}>
            Kho hàng
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'orders' && styles.tabItemActive]}
          onPress={() => setTab('orders')}
          activeOpacity={0.75}
        >
          <Text style={[styles.tabText, tab === 'orders' && styles.tabTextActive]}>
            Đơn hàng
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'inventory' ? (
          invLoading ? (
            <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 48 }} />
          ) : !isSameDay(fromDate, toDate) ? (
            dailyInvStats.length === 0 ? (
              <View style={styles.empty}>
                <FontAwesome5 name="box-open" size={36} color="#D1D5DB" />
                <Text style={styles.emptyText}>Không có dữ liệu trong kỳ này</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {dailyInvStats.map((dayStat) => {
                  const expanded = !!expandedDays[dayStat.dateKey];
                  return (
                    <View key={dayStat.dateKey} style={styles.tableCard}>
                      <TouchableOpacity
                        style={styles.dayHeader}
                        activeOpacity={0.75}
                        onPress={() =>
                          setExpandedDays((prev) => ({
                            ...prev,
                            [dayStat.dateKey]: !prev[dayStat.dateKey],
                          }))
                        }
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dayTitle}>{dayStat.label}</Text>
                          <View style={styles.dayTotalsRow}>
                            <Text style={[styles.dayPill, { color: '#16a34a' }]}>
                              Nhập: {dayStat.importQty}
                            </Text>
                            <Text style={[styles.dayPill, { color: '#dc2626' }]}>
                              Xuất: {dayStat.exportQty}
                            </Text>
                          </View>
                        </View>
                        <FontAwesome5
                          name={expanded ? 'chevron-up' : 'chevron-down'}
                          size={14}
                          color="#6B7280"
                        />
                      </TouchableOpacity>

                      {expanded && (
                        <View>
                          <View style={styles.tableHeader}>
                            <Text style={[styles.cell, styles.cellProduct, styles.headerCell]}>
                              Sản phẩm
                            </Text>
                            <Text style={[styles.cell, styles.cellNum, styles.headerCell, { color: '#16a34a' }]}>
                              Nhập
                            </Text>
                            <Text style={[styles.cell, styles.cellNum, styles.headerCell, { color: '#dc2626' }]}>
                              Xuất
                            </Text>
                            <Text style={[styles.cell, styles.cellNum, styles.headerCell, { color: '#2563EB' }]}>
                              Tổng
                            </Text>
                          </View>

                          {dayStat.products.length === 0 ? (
                            <View style={{ padding: 16 }}>
                              <Text style={{ color: '#9CA3AF' }}>Không có dữ liệu</Text>
                            </View>
                          ) : (
                            dayStat.products.map((p, index) => (
                              <View
                                key={p.productId}
                                style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
                              >
                                <View style={styles.productCell}>
                                  {p.productThumbnailUrl ? (
                                    <Image source={{ uri: p.productThumbnailUrl }} style={styles.productThumb} />
                                  ) : (
                                    <View style={styles.productThumbPlaceholder} />
                                  )}
                                  <Text style={[styles.cell, styles.productName]} numberOfLines={2}>
                                    {p.productName}
                                  </Text>
                                </View>
                                <View style={styles.cellStack}>
                                  <Text style={[styles.cell, styles.cellNum, { color: '#16a34a' }]}>
                                    {p.importQty}
                                  </Text>
                                  <Text style={styles.cellSubValue}>
                                    {formatCurrency(p.importQty * p.price)}₫
                                  </Text>
                                </View>
                                <View style={styles.cellStack}>
                                  <Text style={[styles.cell, styles.cellNum, { color: '#dc2626' }]}>
                                    {p.exportQty}
                                  </Text>
                                  <Text style={styles.cellSubValue}>
                                    {formatCurrency(p.exportQty * p.price)}₫
                                  </Text>
                                </View>
                                <View style={styles.cellStack}>
                                  <Text style={[styles.cell, styles.cellNum, { color: '#2563EB' }]}>
                                    {p.totalQty}
                                  </Text>
                                  <Text style={styles.cellSubValue}>
                                    {formatCurrency(p.totalQty * p.price)}₫
                                  </Text>
                                </View>
                              </View>
                            ))
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}

                <View style={styles.tableCard}>
                  <View style={styles.totalRow}>
                    <Text style={[styles.cell, styles.cellProduct, styles.totalCell]}>
                      Tổng cộng
                    </Text>
                    <Text style={[styles.cell, styles.cellNum, styles.totalCell, { color: '#16a34a' }]}>
                      {totalImport}
                    </Text>
                    <Text style={[styles.cell, styles.cellNum, styles.totalCell, { color: '#dc2626' }]}>
                      {totalExport}
                    </Text>
                    <Text style={[styles.cell, styles.cellNum, styles.totalCell, { color: '#2563EB' }]}>
                      {totalImport + totalExport}
                    </Text>
                  </View>
                </View>
              </View>
            )
          ) : productStats.length === 0 ? (
            <View style={styles.empty}>
              <FontAwesome5 name="box-open" size={36} color="#D1D5DB" />
              <Text style={styles.emptyText}>Không có dữ liệu trong kỳ này</Text>
            </View>
          ) : (
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cell, styles.cellProduct, styles.headerCell]}>
                  Sản phẩm
                </Text>
                <Text style={[styles.cell, styles.cellNum, styles.headerCell, { color: '#16a34a' }]}>
                  Nhập
                </Text>
                <Text style={[styles.cell, styles.cellNum, styles.headerCell, { color: '#dc2626' }]}>
                  Xuất
                </Text>
                <Text style={[styles.cell, styles.cellNum, styles.headerCell, { color: '#2563EB' }]}>
                  Tồn
                </Text>
              </View>

              {productStats.map((stat, index) => (
                <View
                  key={stat.productId}
                  style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
                >
                  <View style={styles.productCell}>
                    {stat.productThumbnailUrl ? (
                      <Image source={{ uri: stat.productThumbnailUrl }} style={styles.productThumb} />
                    ) : (
                      <View style={styles.productThumbPlaceholder} />
                    )}
                    <Text style={[styles.cell, styles.productName]} numberOfLines={2}>
                      {stat.productName}
                    </Text>
                  </View>
                  <View style={styles.cellStack}>
                    <Text style={[styles.cell, styles.cellNum, { color: '#16a34a' }]}>
                      {stat.importQty}
                    </Text>
                    <Text style={styles.cellSubValue}>
                      {formatCurrency(stat.importQty * stat.price)}₫
                    </Text>
                  </View>
                  <View style={styles.cellStack}>
                    <Text style={[styles.cell, styles.cellNum, { color: '#dc2626' }]}>
                      {stat.exportQty}
                    </Text>
                    <Text style={styles.cellSubValue}>
                      {formatCurrency(stat.exportQty * stat.price)}₫
                    </Text>
                  </View>
                  <View style={styles.cellStack}>
                    <Text
                      style={[
                        styles.cell,
                        styles.cellNum,
                        { color: stat.stockQty >= 0 ? '#2563EB' : '#dc2626' },
                      ]}
                    >
                      {stat.stockQty}
                    </Text>
                    <Text style={styles.cellSubValue}>
                      {formatCurrency(stat.stockQty * stat.price)}₫
                    </Text>
                  </View>
                </View>
              ))}

              {/* <View style={styles.totalRow}>
                <Text style={[styles.cell, styles.cellProduct, styles.totalCell]}>
                  Tổng cộng
                </Text>
                <Text style={[styles.cell, styles.cellNum, styles.totalCell, { color: '#16a34a' }]}>
                  {totalImport}
                </Text>
                <Text style={[styles.cell, styles.cellNum, styles.totalCell, { color: '#dc2626' }]}>
                  {totalExport}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    styles.cellNum,
                    styles.totalCell,
                    { color: '#2563EB' },
                  ]}
                >
                  {totalStock}
                </Text>
              </View> */}
            </View>
          )
        ) : (
          <View style={{ gap: 12 }}>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Trạng thái đơn hàng</Text>
              {[
                { label: 'Mới nhận', value: newOrdersCount, color: '#3B82F6' },
                { label: 'Đang xử lý', value: processingOrdersCount, color: '#F59E0B' },
                { label: 'Đã hoàn thành', value: completedOrdersCount, color: '#10B981' },
              ].map(({ label, value, color }) => (
                <View key={label} style={styles.chartItem}>
                  <View style={styles.chartLabelRow}>
                    <Text style={styles.chartLabel}>{label}</Text>
                    {ordersLoading ? (
                      <ActivityIndicator size="small" color="#1F2937" />
                    ) : (
                      <Text style={styles.chartValue}>{value}</Text>
                    )}
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width:
                            totalOrders > 0 ? `${(value / totalOrders) * 100}%` : '0%',
                          backgroundColor: color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.cell, styles.cellProduct, styles.headerCell]}>
                  Dịch vụ
                </Text>
                <Text
                  style={[
                    styles.cell,
                    styles.cellNum,
                    styles.headerCell,
                    { color: '#2563EB' },
                  ]}
                >
                  Số lượng
                </Text>
                <Text
                  style={[
                    styles.cell,
                    styles.cellNum,
                    styles.headerCell,
                    { color: '#16a34a' },
                  ]}
                >
                  Thu nhập
                </Text>
              </View>

              {ordersLoading ? (
                <View style={{ paddingVertical: 24 }}>
                  <ActivityIndicator size="large" color="#2563EB" />
                </View>
              ) : serviceUsage.length === 0 ? (
                <View style={{ padding: 16 }}>
                  <Text style={{ color: '#9CA3AF' }}>Không có dịch vụ trong kỳ này</Text>
                </View>
              ) : (
                serviceUsage.map((stat, index) => (
                  <View
                    key={stat.productId}
                    style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
                  >
                    <View style={styles.productCell}>
                      {stat.productThumbnailUrl ? (
                        <Image
                          source={{ uri: stat.productThumbnailUrl }}
                          style={styles.productThumb}
                        />
                      ) : (
                        <View style={styles.productThumbPlaceholder} />
                      )}
                      <Text style={[styles.cell, styles.productName]} numberOfLines={2}>
                        {stat.productName}
                      </Text>
                    </View>
                    <Text style={[styles.cell, styles.cellNum, { color: '#2563EB' }]}>
                      {stat.totalQuantity}
                    </Text>
                    <Text style={[styles.cell, styles.cellNum, { color: '#16a34a' }]}>
                      {formatCurrency(stat.totalIncome)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  datePillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  dateSep: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
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
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  valueItem: {
    flex: 1,
    alignItems: 'center',
  },
  valueDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  valueLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  valueText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  summaryLabel: {
    color: '#BFDBFE',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#1F2937',
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 64,
    gap: 12,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  dayTotalsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  dayPill: {
    fontSize: 12,
    fontWeight: '800',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  totalRow: {
    flexDirection: 'row',
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderTopWidth: 2,
    borderTopColor: '#DBEAFE',
    alignItems: 'center',
  },
  cell: {
    fontSize: 13,
    color: '#374151',
  },
  cellProduct: {
    flex: 2,
    fontWeight: '500',
    paddingRight: 4,
  },
  productCell: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 4,
  },
  productThumb: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  productThumbPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  productName: {
    flex: 1,
    fontWeight: '600',
    color: '#111827',
  },
  cellNum: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '700',
  },
  cellStack: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  cellSubValue: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  headerCell: {
    fontWeight: '800',
    fontSize: 12,
    color: '#374151',
  },
  totalCell: {
    fontWeight: '800',
    fontSize: 13,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  chartItem: {
    marginBottom: 12,
  },
  chartLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chartLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  chartValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
