import {
  ReportDonutChart,
  ReportGroupedBarChart,
  ReportHorizontalBarChart,
} from '@/components/screens/store/report/ReportCharts';
import { ReportExpandableChartCard } from '@/components/screens/store/report/ReportExpandableChartCard';
import { ReportHoverTooltip } from '@/components/screens/store/report/ReportHoverTooltip';
import type {
  DailyInvStat,
  ProductStat,
  ServiceUsageStat,
  TabType,
} from '@/components/screens/store/report/reportTypes';
import { storeMainContentPaddingTop } from '@/constants/storeWebLayout';
import { compatAlert } from '@/lib/compatAlert';
import { Order } from '@/services/api/orderService';
import { formatCurrencyVND } from '@/utils/format';
import {
  exportInventoryReportExcel,
  exportOrdersReportExcel,
} from '@/utils/reportExcelExport';
import { FontAwesome5 } from '@expo/vector-icons';
import React, { useCallback, useMemo } from 'react';
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

const formatDate = (date: Date) =>
  date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const toInputDate = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const fromInputDate = (value: string) => {
  const [y, m, day] = value.split('-').map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
};

interface ReportWebLayoutProps {
  tab: TabType;
  setTab: (t: TabType) => void;
  fromDate: Date;
  toDate: Date;
  setFromDate: (d: Date) => void;
  setToDate: (d: Date) => void;
  isSameDay: boolean;
  invLoading: boolean;
  ordersLoading: boolean;
  productStats: ProductStat[];
  dailyInvStats: DailyInvStat[];
  expandedDays: Record<string, boolean>;
  setExpandedDays: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  totalImport: number;
  totalExport: number;
  totalImportValue: number;
  totalExportValue: number;
  totalInventoryValue: number;
  totalOrders: number;
  totalRevenue: number;
  newOrdersCount: number;
  processingOrdersCount: number;
  completedOrdersCount: number;
  serviceUsage: ServiceUsageStat[];
  reportOrders: Order[];
  storeName?: string;
}

const StatCard: React.FC<{
  label: string;
  value: string;
  tooltip: string;
  accent?: string;
}> = ({ label, value, tooltip, accent = '#2563EB' }) => (
  <ReportHoverTooltip text={tooltip} style={styles.statCardWrap}>
    <View style={styles.statCard}>
      <View style={[styles.statAccent, { backgroundColor: accent }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  </ReportHoverTooltip>
);

const DatePickerPill: React.FC<{
  label: string;
  date: Date;
  onChange: (d: Date) => void;
  maxDate: string;
  minDate?: string;
}> = ({ label, date, onChange, maxDate, minDate }) => {
  const value = toInputDate(date);

  const applyValue = (raw: string) => {
    const next = fromInputDate(raw);
    if (next) onChange(next);
  };

  return (
    <View style={styles.datePickerGroup}>
      <Text style={styles.dateFilterLabel}>{label}</Text>
      <View style={styles.datePill}>
        <FontAwesome5 name="calendar-alt" size={12} color="#6B7280" />
        {Platform.OS === 'web' ? (
          <input
            type="date"
            value={value}
            max={maxDate}
            min={minDate}
            onChange={(e) => applyValue(e.target.value)}
            onClick={(e) => {
              const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
              try {
                el.showPicker?.();
              } catch {
                /* unsupported browser */
              }
            }}
            style={{
              flex: 1,
              minWidth: 120,
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontWeight: 600,
              color: '#111827',
              fontFamily: 'inherit',
              cursor: 'pointer',
              outline: 'none',
              padding: 0,
              margin: 0,
            }}
          />
        ) : (
          <Text style={styles.datePillText}>{formatDate(date)}</Text>
        )}
      </View>
    </View>
  );
};

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

export const ReportWebLayout: React.FC<ReportWebLayoutProps> = (props) => {
  const {
    tab,
    setTab,
    fromDate,
    toDate,
    setFromDate,
    setToDate,
    isSameDay,
    invLoading,
    ordersLoading,
    productStats,
    dailyInvStats,
    expandedDays,
    setExpandedDays,
    totalImport,
    totalExport,
    totalImportValue,
    totalExportValue,
    totalInventoryValue,
    totalOrders,
    totalRevenue,
    newOrdersCount,
    processingOrdersCount,
    completedOrdersCount,
    serviceUsage,
    reportOrders,
    storeName,
  } = props;

  const isLoading = tab === 'inventory' ? invLoading : ordersLoading;
  const maxDateStr = toInputDate(new Date());

  const handleExport = () => {
    if (isLoading) {
      compatAlert('Thông báo', 'Vui lòng đợi dữ liệu tải xong');
      return;
    }
    const ok =
      tab === 'inventory'
        ? exportInventoryReportExcel({
            fromDate,
            toDate,
            isRange: !isSameDay,
            productStats,
            dailyInvStats,
            totalImport,
            totalExport,
            totalImportValue,
            totalExportValue,
            totalInventoryValue,
            storeName,
          })
        : exportOrdersReportExcel({
            fromDate,
            toDate,
            totalOrders,
            totalRevenue,
            newOrdersCount,
            processingOrdersCount,
            completedOrdersCount,
            serviceUsage,
            orders: reportOrders,
            storeName,
          });
    if (ok) {
      compatAlert('Thành công', 'Đã tải file Excel báo cáo chi tiết');
    } else {
      compatAlert('Lỗi', 'Xuất Excel chỉ khả dụng trên trình duyệt web');
    }
  };

  const productChartRows = useMemo(() => {
    if (isSameDay) {
      return productStats.filter((p) => p.importQty > 0 || p.exportQty > 0);
    }
    const byId = new Map<string, ProductStat>();
    for (const day of dailyInvStats) {
      for (const p of day.products) {
        const existing = byId.get(p.productId);
        if (existing) {
          existing.importQty += p.importQty;
          existing.exportQty += p.exportQty;
        } else {
          byId.set(p.productId, {
            productId: p.productId,
            productName: p.productName,
            productThumbnailUrl: p.productThumbnailUrl,
            price: p.price,
            importQty: p.importQty,
            exportQty: p.exportQty,
            stockQty: 0,
          });
        }
      }
    }
    return Array.from(byId.values()).filter((p) => p.importQty > 0 || p.exportQty > 0);
  }, [isSameDay, productStats, dailyInvStats]);

  const buildInventoryChart = useCallback(
    (chartHeight: number) => {
      const products = [...productChartRows].sort(
        (a, b) => b.importQty + b.exportQty - (a.importQty + a.exportQty)
      );

      if (products.length > 0) {
        return (
          <ReportGroupedBarChart
            categories={products.map((p) => p.productName)}
            series={[
              {
                name: 'Nhập',
                color: '#16a34a',
                values: products.map((p) => p.importQty),
                tooltips: products.map(
                  (p) =>
                    `Nhập · ${p.productName}\nSố lượng: ${p.importQty.toLocaleString('vi-VN')} sp\nGiá trị: ${formatCurrencyVND(p.importQty * p.price)}`
                ),
              },
              {
                name: 'Xuất',
                color: '#dc2626',
                values: products.map((p) => p.exportQty),
                tooltips: products.map(
                  (p) =>
                    `Xuất · ${p.productName}\nSố lượng: ${p.exportQty.toLocaleString('vi-VN')} sp\nGiá trị: ${formatCurrencyVND(p.exportQty * p.price)}`
                ),
              },
            ]}
            height={chartHeight}
            horizontalScroll
          />
        );
      }

      if (!isSameDay && dailyInvStats.length > 0) {
        const slice = dailyInvStats;
        return (
          <ReportGroupedBarChart
            categories={slice.map((d) => d.label)}
            series={[
              {
                name: 'Nhập',
                color: '#16a34a',
                values: slice.map((d) => d.importQty),
                tooltips: slice.map(
                  (d) =>
                    `Nhập · ${d.label}\nSố lượng: ${d.importQty.toLocaleString('vi-VN')} sp\nTổng giao dịch: ${d.totalQty.toLocaleString('vi-VN')} sp`
                ),
              },
              {
                name: 'Xuất',
                color: '#dc2626',
                values: slice.map((d) => d.exportQty),
                tooltips: slice.map(
                  (d) =>
                    `Xuất · ${d.label}\nSố lượng: ${d.exportQty.toLocaleString('vi-VN')} sp\nTổng giao dịch: ${d.totalQty.toLocaleString('vi-VN')} sp`
                ),
              },
            ]}
            height={chartHeight}
            horizontalScroll
          />
        );
      }

      return null;
    },
    [isSameDay, dailyInvStats, productChartRows]
  );

  const inventoryChartCompact = useMemo(() => buildInventoryChart(160), [buildInventoryChart]);
  const inventoryChartExpanded = useMemo(() => buildInventoryChart(380), [buildInventoryChart]);

  const inventoryChartTitle =
    productChartRows.length > 0
      ? 'Nhập / xuất theo sản phẩm'
      : 'Nhập / xuất theo ngày';

  const orderStatusSegments = useMemo(
    () => [
      {
        label: 'Mới nhận',
        value: newOrdersCount,
        color: '#3B82F6',
        tooltip: `Đơn mới nhận\n${newOrdersCount.toLocaleString('vi-VN')} đơn`,
      },
      {
        label: 'Đang xử lý',
        value: processingOrdersCount,
        color: '#F59E0B',
        tooltip: `Đơn đang xử lý\n${processingOrdersCount.toLocaleString('vi-VN')} đơn`,
      },
      {
        label: 'Hoàn thành',
        value: completedOrdersCount,
        color: '#10B981',
        tooltip: `Đơn hoàn thành\n${completedOrdersCount.toLocaleString('vi-VN')} đơn`,
      },
    ],
    [newOrdersCount, processingOrdersCount, completedOrdersCount]
  );

  const buildServiceChartItems = useCallback(
    (limit?: number) => {
      const list = limit ? serviceUsage.slice(0, limit) : serviceUsage;
      return list.map((s) => ({
        label: s.productName.length > 24 ? `${s.productName.slice(0, 24)}…` : s.productName,
        value: s.totalIncome,
        color: '#2563EB',
        formatAsCurrency: true,
        tooltip: `${s.productName}\nSố lượng: ${s.totalQuantity.toLocaleString('vi-VN')}\nThu nhập: ${formatCurrencyVND(s.totalIncome)}`,
      }));
    },
    [serviceUsage]
  );

  const serviceChartItemsCompact = useMemo(() => buildServiceChartItems(8), [buildServiceChartItems]);
  const serviceChartItemsExpanded = useMemo(() => buildServiceChartItems(), [buildServiceChartItems]);

  const renderProductRows = (
    products: Array<{
      productId: string;
      productName: string;
      productThumbnailUrl?: string;
      price: number;
      importQty: number;
      exportQty: number;
      totalQty: number;
    }>,
    lastCol: 'total' | 'stock'
  ) => (
    <>
      <View style={styles.tableHeader}>
        <View style={styles.colProduct}>
          <Text style={[styles.cell, styles.headerCell]}>Sản phẩm</Text>
        </View>
        <View style={styles.colNum}>
          <Text style={[styles.cell, styles.headerCell, styles.headerNum, { color: '#16a34a' }]}>
            Nhập
          </Text>
        </View>
        <View style={styles.colNum}>
          <Text style={[styles.cell, styles.headerCell, styles.headerNum, { color: '#dc2626' }]}>
            Xuất
          </Text>
        </View>
        <View style={styles.colNum}>
          <Text style={[styles.cell, styles.headerCell, styles.headerNum, { color: '#2563EB' }]}>
            {lastCol === 'stock' ? 'Tồn' : 'Tổng'}
          </Text>
        </View>
      </View>
      {products.map((p, index) => (
        <View key={p.productId} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
          <View style={styles.colProduct}>
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
          </View>
          <View style={styles.colNum}>
            <ReportHoverTooltip
              text={`Nhập: ${p.importQty.toLocaleString('vi-VN')} sp\nGiá trị: ${formatCurrencyVND(p.importQty * p.price)}`}
              style={styles.colNumInner}
            >
              <View style={styles.cellStack}>
                <Text style={[styles.qtyText, { color: '#16a34a' }]}>
                  {p.importQty.toLocaleString('vi-VN')}
                </Text>
                <Text style={styles.cellSubValue}>{formatCurrencyVND(p.importQty * p.price)}</Text>
              </View>
            </ReportHoverTooltip>
          </View>
          <View style={styles.colNum}>
            <ReportHoverTooltip
              text={`Xuất: ${p.exportQty.toLocaleString('vi-VN')} sp\nGiá trị: ${formatCurrencyVND(p.exportQty * p.price)}`}
              style={styles.colNumInner}
            >
              <View style={styles.cellStack}>
                <Text style={[styles.qtyText, { color: '#dc2626' }]}>
                  {p.exportQty.toLocaleString('vi-VN')}
                </Text>
                <Text style={styles.cellSubValue}>{formatCurrencyVND(p.exportQty * p.price)}</Text>
              </View>
            </ReportHoverTooltip>
          </View>
          <View style={styles.colNum}>
            <ReportHoverTooltip
              text={`${lastCol === 'stock' ? 'Tồn' : 'Tổng'}: ${p.totalQty.toLocaleString('vi-VN')} sp\nGiá trị: ${formatCurrencyVND(p.totalQty * p.price)}`}
              style={styles.colNumInner}
            >
              <View style={styles.cellStack}>
                <Text style={[styles.qtyText, { color: '#2563EB' }]}>
                  {p.totalQty.toLocaleString('vi-VN')}
                </Text>
                <Text style={styles.cellSubValue}>{formatCurrencyVND(p.totalQty * p.price)}</Text>
              </View>
            </ReportHoverTooltip>
          </View>
        </View>
      ))}
    </>
  );

  const renderInventoryTable = () => {
    if (invLoading) {
      return <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 32 }} />;
    }
    if (!isSameDay) {
      if (dailyInvStats.length === 0) {
        return (
          <View style={styles.empty}>
            <FontAwesome5 name="box-open" size={36} color="#D1D5DB" />
            <Text style={styles.emptyText}>Không có dữ liệu trong kỳ này</Text>
          </View>
        );
      }
      return (
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
                {expanded && renderProductRows(dayStat.products, 'total')}
              </View>
            );
          })}
        </View>
      );
    }
    if (productStats.length === 0) {
      return (
        <View style={styles.empty}>
          <FontAwesome5 name="box-open" size={36} color="#D1D5DB" />
          <Text style={styles.emptyText}>Không có dữ liệu trong kỳ này</Text>
        </View>
      );
    }
    return (
      <View style={styles.tableCard}>
        {renderProductRows(
          productStats.map((p) => ({
            ...p,
            totalQty: p.stockQty,
          })),
          'stock'
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.toolbar, { paddingTop: storeMainContentPaddingTop() + 12 }]}>
        <View style={styles.toolbarTop}>
          <Text style={styles.pageTitle}>Báo cáo</Text>

          <View style={styles.dateFilters}>
            <DatePickerPill
              label="Từ ngày"
              date={fromDate}
              onChange={(d) => {
                setFromDate(d);
                if (d > toDate) setToDate(d);
              }}
              maxDate={maxDateStr}
            />
            <Text style={styles.dateSep}>–</Text>
            <DatePickerPill
              label="Đến ngày"
              date={toDate}
              onChange={setToDate}
              maxDate={maxDateStr}
              minDate={toInputDate(fromDate)}
            />
          </View>

          <View style={styles.toolbarTopSpacer} />

          <TouchableOpacity
            style={[styles.exportBtn, isLoading && styles.exportBtnDisabled]}
            onPress={handleExport}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="file-excel" size={14} color="#fff" />
            <Text style={styles.exportBtnText}>Xuất báo cáo</Text>
          </TouchableOpacity>
          {isLoading && <ActivityIndicator size="small" color="#2563EB" />}
        </View>

        <Text style={styles.pageSub}>Thống kê kho hàng và đơn hàng theo kỳ</Text>

        <View style={styles.toolbarRow}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, tab === 'inventory' && styles.tabItemActive]}
              onPress={() => setTab('inventory')}
            >
              <Text style={[styles.tabText, tab === 'inventory' && styles.tabTextActive]}>
                Kho hàng
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, tab === 'orders' && styles.tabItemActive]}
              onPress={() => setTab('orders')}
            >
              <Text style={[styles.tabText, tab === 'orders' && styles.tabTextActive]}>
                Đơn hàng
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'inventory' ? (
          <>
            <View style={styles.kpiRow}>
              <StatCard
                label="Tổng nhập"
                value={invLoading ? '–' : totalImport.toLocaleString('vi-VN')}
                tooltip={`Tổng số lượng nhập kho trong kỳ\n${totalImport.toLocaleString('vi-VN')} sản phẩm`}
                accent="#16a34a"
              />
              <StatCard
                label="Tổng xuất"
                value={invLoading ? '–' : totalExport.toLocaleString('vi-VN')}
                tooltip={`Tổng số lượng xuất kho trong kỳ\n${totalExport.toLocaleString('vi-VN')} sản phẩm`}
                accent="#dc2626"
              />
              <StatCard
                label="Giá trị nhập"
                value={invLoading ? '–' : formatCurrencyVND(totalImportValue)}
                tooltip={`Tổng giá trị hàng nhập trong kỳ\n${formatCurrencyVND(totalImportValue)}\nSố lượng nhập: ${totalImport.toLocaleString('vi-VN')} sp`}
                accent="#0ea5e9"
              />
              <StatCard
                label="Giá trị tồn"
                value={invLoading ? '–' : formatCurrencyVND(totalInventoryValue)}
                tooltip={`Giá trị tồn kho hiện tại (ước tính)\n${formatCurrencyVND(totalInventoryValue)}`}
                accent="#7c3aed"
              />
            </View>

            <View style={styles.chartGrid}>
              <ReportExpandableChartCard
                title={inventoryChartTitle}
                canExpand={!invLoading && !!inventoryChartCompact}
                expandedContent={inventoryChartExpanded ?? <Text style={styles.emptyText}>Không có dữ liệu</Text>}
              >
                {invLoading ? (
                  <ActivityIndicator color="#2563EB" />
                ) : (
                  inventoryChartCompact ?? (
                    <Text style={styles.emptyText}>Không có dữ liệu biểu đồ</Text>
                  )
                )}
              </ReportExpandableChartCard>
              <SectionCard title="Tổng quan giá trị">
                <ReportHorizontalBarChart
                  items={[
                    {
                      label: 'Giá trị nhập',
                      value: totalImportValue,
                      color: '#16a34a',
                      formatAsCurrency: true,
                      tooltip: `Giá trị nhập kho trong kỳ\n${formatCurrencyVND(totalImportValue)}`,
                    },
                    {
                      label: 'Doanh thu xuất',
                      value: totalExportValue,
                      color: '#dc2626',
                      formatAsCurrency: true,
                      tooltip: `Doanh thu từ xuất kho trong kỳ\n${formatCurrencyVND(totalExportValue)}`,
                    },
                    {
                      label: 'Giá trị tồn kho',
                      value: totalInventoryValue,
                      color: '#2563EB',
                      formatAsCurrency: true,
                      tooltip: `Giá trị tồn kho hiện tại\n${formatCurrencyVND(totalInventoryValue)}`,
                    },
                  ]}
                />
              </SectionCard>
            </View>

            <SectionCard title="Chi tiết">
              {renderInventoryTable()}
            </SectionCard>
          </>
        ) : (
          <>
            <View style={styles.kpiRow}>
              <StatCard
                label="Tổng đơn"
                value={ordersLoading ? '–' : totalOrders.toLocaleString('vi-VN')}
                tooltip={`Tổng đơn hàng trong kỳ\n${totalOrders.toLocaleString('vi-VN')} đơn`}
                accent="#2563EB"
              />
              <StatCard
                label="Doanh thu dịch vụ"
                value={ordersLoading ? '–' : formatCurrencyVND(totalRevenue)}
                tooltip={`Tổng doanh thu dịch vụ trong kỳ\n${formatCurrencyVND(totalRevenue)}`}
                accent="#16a34a"
              />
              <StatCard
                label="Mới nhận"
                value={ordersLoading ? '–' : newOrdersCount.toLocaleString('vi-VN')}
                tooltip={`Đơn mới nhận (CREATED)\n${newOrdersCount.toLocaleString('vi-VN')} đơn`}
                accent="#3B82F6"
              />
              <StatCard
                label="Đang xử lý"
                value={ordersLoading ? '–' : processingOrdersCount.toLocaleString('vi-VN')}
                tooltip={`Đơn đang xử lý\n${processingOrdersCount.toLocaleString('vi-VN')} đơn`}
                accent="#F59E0B"
              />
              <StatCard
                label="Hoàn thành"
                value={ordersLoading ? '–' : completedOrdersCount.toLocaleString('vi-VN')}
                tooltip={`Đơn đã hoàn thành (FINISHED)\n${completedOrdersCount.toLocaleString('vi-VN')} đơn`}
                accent="#10B981"
              />
            </View>

            <View style={styles.chartGrid}>
              <ReportExpandableChartCard
                title="Trạng thái đơn hàng"
                canExpand={!ordersLoading && totalOrders > 0}
                expandedContent={<ReportDonutChart segments={orderStatusSegments} size={200} />}
              >
                {ordersLoading ? (
                  <ActivityIndicator color="#2563EB" />
                ) : (
                  <ReportDonutChart segments={orderStatusSegments} size={120} />
                )}
              </ReportExpandableChartCard>
              <ReportExpandableChartCard
                title="Doanh thu theo dịch vụ"
                canExpand={!ordersLoading && serviceChartItemsExpanded.length > 0}
                expandedContent={<ReportHorizontalBarChart items={serviceChartItemsExpanded} />}
              >
                {ordersLoading ? (
                  <ActivityIndicator color="#2563EB" />
                ) : serviceChartItemsCompact.length === 0 ? (
                  <Text style={styles.emptyText}>Không có dịch vụ trong kỳ này</Text>
                ) : (
                  <ReportHorizontalBarChart items={serviceChartItemsCompact} />
                )}
              </ReportExpandableChartCard>
            </View>

            <SectionCard title="Chi tiết dịch vụ">
              <View style={styles.tableCard}>
                <View style={styles.tableHeader}>
                  <View style={styles.colProduct}>
                    <Text style={[styles.cell, styles.headerCell]}>Dịch vụ</Text>
                  </View>
                  <View style={styles.colNum}>
                    <Text
                      style={[styles.cell, styles.headerCell, styles.headerNum, { color: '#2563EB' }]}
                    >
                      Số lượng
                    </Text>
                  </View>
                  <View style={styles.colNum}>
                    <Text
                      style={[styles.cell, styles.headerCell, styles.headerNum, { color: '#16a34a' }]}
                    >
                      Thu nhập
                    </Text>
                  </View>
                </View>
                {ordersLoading ? (
                  <ActivityIndicator style={{ margin: 24 }} color="#2563EB" />
                ) : serviceUsage.length === 0 ? (
                  <Text style={[styles.emptyText, { padding: 16 }]}>Không có dịch vụ trong kỳ này</Text>
                ) : (
                  serviceUsage.map((stat, index) => (
                    <View
                      key={stat.productId}
                      style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
                    >
                      <View style={styles.colProduct}>
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
                      </View>
                      <View style={styles.colNum}>
                        <ReportHoverTooltip
                          text={`Số lượng sử dụng\n${stat.totalQuantity.toLocaleString('vi-VN')}`}
                          style={styles.colNumInner}
                        >
                          <Text style={[styles.qtyText, { color: '#2563EB' }]}>
                            {stat.totalQuantity.toLocaleString('vi-VN')}
                          </Text>
                        </ReportHoverTooltip>
                      </View>
                      <View style={styles.colNum}>
                        <ReportHoverTooltip
                          text={`Thu nhập dịch vụ\n${formatCurrencyVND(stat.totalIncome)}`}
                          style={styles.colNumInner}
                        >
                          <Text style={[styles.qtyText, { color: '#16a34a' }]}>
                            {formatCurrencyVND(stat.totalIncome)}
                          </Text>
                        </ReportHoverTooltip>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </SectionCard>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  toolbar: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  toolbarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  toolbarTopSpacer: { flex: 1, minWidth: 8 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  pageSub: { fontSize: 13, color: '#6B7280', marginTop: 8, marginBottom: 12 },
  dateFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  datePickerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateFilterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  datePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  dateSep: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  exportBtnDisabled: { opacity: 0.55 },
  exportBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    padding: 2,
  },
  tabItem: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  tabItemActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#1F2937', fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
    maxWidth: 1280,
    width: '100%',
    alignSelf: 'center',
    gap: 20,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCardWrap: {
    flex: 1,
    minWidth: 160,
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  statAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingLeft: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    paddingLeft: 8,
  },
  chartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  sectionCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'visible',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 14,
  },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  tableCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  colProduct: {
    flex: 3,
    minWidth: 0,
    paddingRight: 8,
  },
  colNum: {
    flex: 1,
    minWidth: 108,
    maxWidth: 160,
  },
  colNumInner: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dayTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  dayTotalsRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  dayPill: { fontSize: 12, fontWeight: '800' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  tableRowAlt: { backgroundColor: '#fff' },
  cell: { fontSize: 13, color: '#374151' },
  productCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productThumb: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#F3F4F6' },
  productThumbPlaceholder: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#E5E7EB' },
  productName: { flex: 1, fontWeight: '600', color: '#111827' },
  qtyText: { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  cellStack: { width: '100%', alignItems: 'flex-end', justifyContent: 'center' },
  cellSubValue: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textAlign: 'right',
    width: '100%',
  },
  headerCell: { fontWeight: '800', fontSize: 12, color: '#374151' },
  headerNum: { textAlign: 'right', width: '100%' },
});
