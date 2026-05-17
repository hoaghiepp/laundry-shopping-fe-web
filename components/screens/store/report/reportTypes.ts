export type TabType = 'inventory' | 'orders';

export interface ProductStat {
  productId: string;
  productName: string;
  productThumbnailUrl?: string;
  price: number;
  importQty: number;
  exportQty: number;
  stockQty: number;
}

export interface DailyInvStat {
  dateKey: string;
  label: string;
  importQty: number;
  exportQty: number;
  totalQty: number;
  products: Array<{
    productId: string;
    productName: string;
    productThumbnailUrl?: string;
    price: number;
    importQty: number;
    exportQty: number;
    totalQty: number;
  }>;
}

export interface ServiceUsageStat {
  productId: string;
  productName: string;
  productThumbnailUrl?: string;
  totalQuantity: number;
  totalIncome: number;
}
