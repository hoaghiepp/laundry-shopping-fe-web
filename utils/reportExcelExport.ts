import { OrderStatus, PaymentStatus, ProductType } from '@/constants/enum';
import { Order } from '@/services/api/orderService';
import { formatCurrencyVND } from '@/utils/format';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

export interface ProductStatRow {
  productId: string;
  productName: string;
  price: number;
  importQty: number;
  exportQty: number;
  stockQty: number;
}

export interface DailyInvStatRow {
  dateKey: string;
  label: string;
  importQty: number;
  exportQty: number;
  totalQty: number;
  products: Array<{
    productId: string;
    productName: string;
    price: number;
    importQty: number;
    exportQty: number;
    totalQty: number;
  }>;
}

export interface ServiceUsageRow {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalIncome: number;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  [OrderStatus.CREATED]: 'Mới nhận',
  [OrderStatus.PROCESSING]: 'Đang xử lý',
  [OrderStatus.NEED_CUSTOMER_CONFIRMATION]: 'Chờ xác nhận KH',
  [OrderStatus.FINISHED]: 'Hoàn thành',
  [OrderStatus.CANCELLED]: 'Đã hủy',
  [OrderStatus.CUSTOMER_REJECTED]: 'KH từ chối',
  [OrderStatus.CUSTOMER_INCIDENTS_REJECTED]: 'Khiếu nại bị từ chối',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  [PaymentStatus.UNPAID]: 'Chưa thanh toán',
  [PaymentStatus.PARTIAL_PAID]: 'Thanh toán một phần',
  [PaymentStatus.PAID]: 'Đã thanh toán',
  [PaymentStatus.REFUNDED]: 'Đã hoàn tiền',
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  [ProductType.SERVICE]: 'Dịch vụ',
  [ProductType.GOODS]: 'Hàng hóa',
};

const formatDateFile = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
};

const formatDateLabel = (d: Date) =>
  d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatDateTimeLabel = (iso?: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

function aggregateProductsFromDaily(dailyInvStats: DailyInvStatRow[]): ProductStatRow[] {
  const byId = new Map<string, ProductStatRow>();
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
          price: p.price,
          importQty: p.importQty,
          exportQty: p.exportQty,
          stockQty: 0,
        });
      }
    }
  }
  return Array.from(byId.values())
    .filter((p) => p.importQty > 0 || p.exportQty > 0)
    .sort((a, b) => b.importQty + b.exportQty - (a.importQty + a.exportQty));
}

function appendSheet(
  wb: XLSX.WorkBook,
  name: string,
  rows: (string | number)[][],
  colWidths?: number[]
) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  if (colWidths?.length) {
    ws['!cols'] = colWidths.map((wch) => ({ wch }));
  }
  const safeName = name.slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeName);
}

function downloadWorkbook(workbook: XLSX.WorkBook, filename: string): boolean {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return false;
  }
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}

function buildProductDetailRows(products: ProductStatRow[]): (string | number)[][] {
  return [
    [
      'Mã SP',
      'Tên sản phẩm',
      'Đơn giá (đ)',
      'Nhập (SL)',
      'Xuất (SL)',
      'Biến động ròng',
      'Tồn cuối kỳ (SL)',
      'Giá trị nhập (đ)',
      'Giá trị xuất (đ)',
    ],
    ...products.map((p) => {
      const net = p.importQty - p.exportQty;
      return [
        p.productId,
        p.productName,
        p.price,
        p.importQty,
        p.exportQty,
        net,
        p.stockQty,
        p.importQty * p.price,
        p.exportQty * p.price,
      ];
    }),
  ];
}

function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

function lineItemType(item: any): string {
  return String(item?.product_type ?? item?.type ?? ProductType.GOODS);
}

function lineItemQty(item: any): number {
  if (typeof item?.adjusted_quantity === 'number') return item.adjusted_quantity;
  if (typeof item?.quantity === 'number') return item.quantity;
  return 0;
}

function lineItemTotal(item: any): number {
  if (typeof item?.total_price === 'number') return item.total_price;
  if (typeof item?.sub_total === 'number') return item.sub_total;
  const price = typeof item?.unit_price === 'number' ? item.unit_price : 0;
  return price * lineItemQty(item);
}

function orderServiceRevenue(order: Order): number {
  return (order.order_items ?? [])
    .filter((item) => lineItemType(item) === ProductType.SERVICE)
    .reduce((sum, item) => sum + lineItemTotal(item), 0);
}

function orderGoodsRevenue(order: Order): number {
  return (order.order_items ?? [])
    .filter((item) => lineItemType(item) === ProductType.GOODS)
    .reduce((sum, item) => sum + lineItemTotal(item), 0);
}

export function exportInventoryReportExcel(params: {
  fromDate: Date;
  toDate: Date;
  isRange: boolean;
  productStats: ProductStatRow[];
  dailyInvStats: DailyInvStatRow[];
  totalImport: number;
  totalExport: number;
  totalImportValue: number;
  totalExportValue: number;
  totalInventoryValue: number;
  storeName?: string;
}): boolean {
  const {
    fromDate,
    toDate,
    isRange,
    productStats,
    dailyInvStats,
    totalImport,
    totalExport,
    totalImportValue,
    totalExportValue,
    totalInventoryValue,
    storeName,
  } = params;

  const generatedAt = formatDateTimeLabel(new Date().toISOString());
  const productSummary = isRange
    ? aggregateProductsFromDaily(dailyInvStats)
    : [...productStats].sort((a, b) => b.importQty + b.exportQty - (a.importQty + a.exportQty));

  const summarySheet: (string | number)[][] = [
    ['BÁO CÁO KHO HÀNG'],
    ...(storeName ? [['Cửa hàng', storeName]] : []),
    ['Từ ngày', formatDateLabel(fromDate)],
    ['Đến ngày', formatDateLabel(toDate)],
    ['Xuất file lúc', generatedAt],
    [],
    ['CHỈ TIÊU TỔNG HỢP', 'Giá trị'],
    ['Tổng nhập (số lượng)', totalImport],
    ['Tổng xuất (số lượng)', totalExport],
    ['Biến động ròng (SL)', totalImport - totalExport],
    ['Giá trị nhập (đ)', totalImportValue],
    ['Giá trị xuất / doanh thu (đ)', totalExportValue],
    ['Giá trị tồn kho hiện tại (đ)', totalInventoryValue],
    [],
    ['Số sản phẩm có phát sinh', productSummary.length],
    ['Số ngày có dữ liệu', isRange ? dailyInvStats.length : 1],
  ];

  const wb = XLSX.utils.book_new();
  appendSheet(wb, 'Tổng quan', summarySheet, [28, 22]);

  appendSheet(
    wb,
    'SP nhập xuất',
    buildProductDetailRows(productSummary),
    [14, 36, 14, 10, 10, 12, 14, 16, 16]
  );

  if (isRange && dailyInvStats.length > 0) {
    const dailyRows: (string | number)[][] = [
      ['Ngày', 'Nhập (SL)', 'Xuất (SL)', 'Tổng giao dịch (SL)', 'Giá trị nhập (đ)', 'Giá trị xuất (đ)'],
      ...dailyInvStats.map((d) => {
        const importVal = d.products.reduce((s, p) => s + p.importQty * p.price, 0);
        const exportVal = d.products.reduce((s, p) => s + p.exportQty * p.price, 0);
        return [d.label, d.importQty, d.exportQty, d.totalQty, importVal, exportVal];
      }),
    ];
    appendSheet(wb, 'Theo ngày', dailyRows, [14, 12, 12, 16, 18, 18]);

    const detailRows: (string | number)[][] = [
      [
        'Ngày',
        'Mã SP',
        'Tên sản phẩm',
        'Đơn giá (đ)',
        'Nhập (SL)',
        'Xuất (SL)',
        'Tổng (SL)',
        'Giá trị nhập (đ)',
        'Giá trị xuất (đ)',
      ],
    ];
    for (const day of dailyInvStats) {
      for (const p of day.products) {
        detailRows.push([
          day.label,
          p.productId,
          p.productName,
          p.price,
          p.importQty,
          p.exportQty,
          p.totalQty,
          p.importQty * p.price,
          p.exportQty * p.price,
        ]);
      }
    }
    appendSheet(wb, 'Chi tiết theo ngày', detailRows, [14, 14, 32, 12, 10, 10, 10, 16, 16]);
  }

  const filename = `bao-cao-kho_${formatDateFile(fromDate)}-${formatDateFile(toDate)}.xlsx`;
  return downloadWorkbook(wb, filename);
}

export function exportOrdersReportExcel(params: {
  fromDate: Date;
  toDate: Date;
  totalOrders: number;
  totalRevenue: number;
  newOrdersCount: number;
  processingOrdersCount: number;
  completedOrdersCount: number;
  serviceUsage: ServiceUsageRow[];
  orders: Order[];
  storeName?: string;
}): boolean {
  const {
    fromDate,
    toDate,
    totalOrders,
    totalRevenue,
    newOrdersCount,
    processingOrdersCount,
    completedOrdersCount,
    serviceUsage,
    orders,
    storeName,
  } = params;

  const generatedAt = formatDateTimeLabel(new Date().toISOString());
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const totalGoodsRevenue = orders.reduce((sum, o) => sum + orderGoodsRevenue(o), 0);
  const totalFinal = orders.reduce((sum, o) => sum + (o.final_total ?? 0), 0);

  const summarySheet: (string | number)[][] = [
    ['BÁO CÁO ĐƠN HÀNG & DỊCH VỤ'],
    ...(storeName ? [['Cửa hàng', storeName]] : []),
    ['Từ ngày', formatDateLabel(fromDate)],
    ['Đến ngày', formatDateLabel(toDate)],
    ['Xuất file lúc', generatedAt],
    [],
    ['CHỈ TIÊU', 'Giá trị'],
    ['Tổng số đơn', totalOrders],
    ['Doanh thu dịch vụ (đ)', totalRevenue],
    ['Doanh thu hàng hóa (đ)', totalGoodsRevenue],
    ['Tổng giá trị đơn (final_total)', totalFinal],
    ['Giá trị TB / đơn (dịch vụ)', avgOrderValue],
    [],
    ['PHÂN BỐ TRẠNG THÁI ĐƠN', 'Số lượng', 'Tỷ lệ (%)'],
    [
      'Mới nhận',
      newOrdersCount,
      totalOrders ? Math.round((newOrdersCount / totalOrders) * 1000) / 10 : 0,
    ],
    [
      'Đang xử lý',
      processingOrdersCount,
      totalOrders ? Math.round((processingOrdersCount / totalOrders) * 1000) / 10 : 0,
    ],
    [
      'Hoàn thành',
      completedOrdersCount,
      totalOrders ? Math.round((completedOrdersCount / totalOrders) * 1000) / 10 : 0,
    ],
    [
      'Khác',
      Math.max(0, totalOrders - newOrdersCount - processingOrdersCount - completedOrdersCount),
      totalOrders
        ? Math.round(
            ((Math.max(0, totalOrders - newOrdersCount - processingOrdersCount - completedOrdersCount) /
              totalOrders) *
              1000) /
              10
          )
        : 0,
    ],
  ];

  const serviceRows: (string | number)[][] = [
    ['Mã SP', 'Tên dịch vụ', 'Số lượng', 'Thu nhập (đ)', 'TB / đơn vị (đ)'],
    ...serviceUsage.map((s) => [
      s.productId,
      s.productName,
      s.totalQuantity,
      s.totalIncome,
      s.totalQuantity > 0 ? Math.round(s.totalIncome / s.totalQuantity) : 0,
    ]),
    [],
    ['Tổng', '', serviceUsage.reduce((s, x) => s + x.totalQuantity, 0), totalRevenue, ''],
  ];

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
  );

  const orderRows: (string | number)[][] = [
    [
      'Mã đơn',
      'Ngày tạo',
      'Khách hàng',
      'Số điện thoại',
      'Trạng thái',
      'Thanh toán',
      'Tổng đơn (đ)',
      'DT dịch vụ (đ)',
      'DT hàng hóa (đ)',
      'Số dòng hàng',
      'Ghi chú',
    ],
    ...sortedOrders.map((o) => [
      o.code,
      formatDateTimeLabel(o.created_date),
      o.shipping_full_name_snapshot ?? '',
      o.shipping_phone_number_snapshot ?? '',
      orderStatusLabel(String(o.status)),
      paymentStatusLabel(String(o.payment_status)),
      o.final_total ?? 0,
      orderServiceRevenue(o),
      orderGoodsRevenue(o),
      (o.order_items ?? []).length,
      o.note ?? '',
    ]),
  ];

  const itemRows: (string | number)[][] = [
    [
      'Mã đơn',
      'Ngày tạo',
      'Trạng thái đơn',
      'Loại',
      'Tên sản phẩm / dịch vụ',
      'Số lượng',
      'Đơn vị',
      'Đơn giá (đ)',
      'Thành tiền (đ)',
    ],
  ];

  for (const o of sortedOrders) {
    const items = o.order_items ?? [];
    for (const item of items) {
      const type = lineItemType(item);
      itemRows.push([
        o.code,
        formatDateTimeLabel(o.created_date),
        orderStatusLabel(String(o.status)),
        PRODUCT_TYPE_LABELS[type] ?? type,
        item?.product_name ?? item?.name ?? '',
        lineItemQty(item),
        item?.unit ?? '',
        item?.unit_price ?? 0,
        lineItemTotal(item),
      ]);
    }
  }

  if (itemRows.length === 1) {
    itemRows.push(['', '', '', '', 'Không có dòng hàng', '', '', '', '']);
  }

  const wb = XLSX.utils.book_new();
  appendSheet(wb, 'Tổng quan', summarySheet, [32, 18, 14]);
  appendSheet(wb, 'Thống kê dịch vụ', serviceRows, [14, 36, 12, 16, 14]);
  appendSheet(wb, 'Danh sách đơn', orderRows, [16, 18, 22, 14, 16, 16, 14, 14, 14, 10, 28]);
  appendSheet(wb, 'Chi tiết dòng hàng', itemRows, [16, 18, 16, 10, 36, 10, 8, 12, 14]);

  const filename = `bao-cao-don-hang_${formatDateFile(fromDate)}-${formatDateFile(toDate)}.xlsx`;
  return downloadWorkbook(wb, filename);
}
