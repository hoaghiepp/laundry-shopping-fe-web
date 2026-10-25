export interface ProductItem {
  id: string;
  store_id: string;
  name: string;
  sku: string;
  stock_quantity: number;
  reserved_quantity: number;
  description: string;
  thumbnail_url: string;
  gallery_urls: string[];
  type: string;
  status: string;
  unit: string;
  price: number;
  priority: number;
  deleted: boolean;
  /** Same non-empty value within a store renders as one catalog box. Null means standalone. */
  variant_group?: string | null;
}


