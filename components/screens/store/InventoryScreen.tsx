import { ImportStockScreen } from '@/components/screens/store/ImportStockScreen';
import { EmptyState, PackageCard, ProductCard } from '@/components/store/inventory';
import { ProductType } from '@/constants/enum';
import {
    storeMainContentMarginBottom,
    storeMainContentPaddingTop,
} from '@/constants/storeWebLayout';
import { compatAlert } from '@/lib/compatAlert';
import { ProductItem } from '@/models/model';
import { packageService } from '@/services/api/packageProductService';
import { productService } from '@/services/api/productService';
import { FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface InventoryScreenProps {
  onAddItem?: () => void;
  onImportStock?: () => void;
  onEditProduct?: (product: ProductItem) => void;
  onEditPackage?: (pkg: PackageItem) => void;
  storeId?: string;
}

interface PackageItem {
  id: string;
  store_id: string;
  name: string;
  quantity: number;
  description: string;
  thumbnail_url: string;
  gallery_urls: string[];
  unit: string;
  price: number;
  priority: number;
  status?: string;
  service_product_id?: string;
}

function isInactiveListingStatus(status?: string): boolean {
  return String(status ?? '').toUpperCase() === 'INACTIVE';
}

function matchesListingTab(
  status: string | undefined,
  tab: 'active' | 'inactive'
): boolean {
  const inactive = isInactiveListingStatus(status);
  return tab === 'inactive' ? inactive : !inactive;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({ 
  onAddItem, 
  onImportStock,
  onEditProduct,
  onEditPackage,
  storeId 
}) => {
  const [inventoryTab, setInventoryTab] = useState<'product' | 'service' | 'package'>('product');
  const [listingTab, setListingTab] = useState<'active' | 'inactive'>('active');
  const [inventoryItems, setInventoryItems] = useState<ProductItem[]>([]);
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [menuOpen, setMenuOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const normalizedQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.searchProducts(0, 100, undefined, {
        "store_id": storeId,
      });

      const products : ProductItem[] = response?.data || [];

      setInventoryItems(products);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      compatAlert('Lỗi', error?.message || 'Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await packageService.searchPackages(
        {
          store_id: storeId,
          deleted: false,
        },
        { page: 0, size: 100 }
      );

      const packages: PackageItem[] = response?.data || [];
      setPackageItems(packages);
    } catch (error: any) {
      console.error('Error fetching packages:', error);
      // Don't show alert for packages, just log error
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchPackages();
  }, [storeId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
    fetchPackages();
  };
  
  // Separate products by type and active / inactive listing tab
  const goodsItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      if (item.type !== ProductType.GOODS) return false;
      if (!matchesListingTab(item.status, listingTab)) return false;
      if (!normalizedQuery) return true;
      return item.name?.toLowerCase().includes(normalizedQuery);
    });
  }, [inventoryItems, listingTab, normalizedQuery]);

  const serviceItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      if (item.type !== ProductType.SERVICE) return false;
      if (!matchesListingTab(item.status, listingTab)) return false;
      if (!normalizedQuery) return true;
      return item.name?.toLowerCase().includes(normalizedQuery);
    });
  }, [inventoryItems, listingTab, normalizedQuery]);

  const filteredPackages = useMemo(() => {
    return packageItems.filter((pkg) => {
      if (!matchesListingTab(pkg.status, listingTab)) return false;
      if (!normalizedQuery) return true;
      return pkg.name?.toLowerCase().includes(normalizedQuery);
    });
  }, [packageItems, listingTab, normalizedQuery]);

  const selectedItemsCount =
    inventoryTab === 'product'
      ? goodsItems.length
      : inventoryTab === 'service'
      ? serviceItems.length
      : filteredPackages.length;

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(selectedItemsCount / pageSize));
  }, [selectedItemsCount, pageSize]);

  useEffect(() => {
    setPageIndex(0);
  }, [inventoryTab, listingTab, normalizedQuery, pageSize]);

  const currentPageIndex = Math.min(pageIndex, totalPages - 1);
  const start = currentPageIndex * pageSize;
  const end = start + pageSize;

  const pagedGoodsItems = goodsItems.slice(start, end);
  const pagedServiceItems = serviceItems.slice(start, end);
  const pagedPackages = filteredPackages.slice(start, end);

  const handleAddStock = (itemName: string) => {
    compatAlert('Nhập kho', `Nhập thêm ${itemName}`);
  };

  if (importOpen) {
    return (
      <ImportStockScreen
        storeId={storeId}
        products={inventoryItems}
        onBack={() => setImportOpen(false)}
        onImported={fetchProducts}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, inventoryTab === 'product' && styles.tabActive]}
          onPress={() => setInventoryTab('product')}
          activeOpacity={0.75}
        >
          <Text
            style={[styles.tabText, inventoryTab === 'product' && styles.tabTextActive]}
          >
            Sản phẩm
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, inventoryTab === 'service' && styles.tabActive]}
          onPress={() => setInventoryTab('service')}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.tabText,
              inventoryTab === 'service' && styles.tabTextActive,
            ]}
          >
            Dịch vụ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, inventoryTab === 'package' && styles.tabActive]}
          onPress={() => setInventoryTab('package')}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.tabText,
              inventoryTab === 'package' && styles.tabTextActive,
            ]}
          >
            Gói
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listingTabRow}>
        <TouchableOpacity
          style={[
            styles.listingChip,
            listingTab === 'active' && styles.listingChipActive,
          ]}
          onPress={() => setListingTab('active')}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.listingChipText,
              listingTab === 'active' && styles.listingChipTextActive,
            ]}
          >
            Đang hoạt động
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.listingChip,
            listingTab === 'inactive' && styles.listingChipActive,
          ]}
          onPress={() => setListingTab('inactive')}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.listingChipText,
              listingTab === 'inactive' && styles.listingChipTextActive,
            ]}
          >
            Ngưng hoạt động
          </Text>
        </TouchableOpacity>
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
        />
        {!!searchQuery.trim() && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="times-circle" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.paginationRow}>
        <TouchableOpacity
          style={[styles.pageArrow, currentPageIndex === 0 && styles.pageArrowDisabled]}
          onPress={() => setPageIndex((p) => Math.max(0, p - 1))}
          disabled={currentPageIndex === 0}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="chevron-left" size={14} color={currentPageIndex === 0 ? '#9CA3AF' : '#111827'} />
        </TouchableOpacity>

        <Text style={styles.pageText}>
          Trang {currentPageIndex + 1}/{totalPages}
        </Text>

        <TouchableOpacity
          style={[styles.pageArrow, currentPageIndex >= totalPages - 1 && styles.pageArrowDisabled]}
          onPress={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
          disabled={currentPageIndex >= totalPages - 1}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="chevron-right" size={14} color={currentPageIndex >= totalPages - 1 ? '#9CA3AF' : '#111827'} />
        </TouchableOpacity>

        <View style={styles.pageSizeRow}>
          <Text style={styles.pageSizeLabel}>Hiển thị:</Text>
          {[10, 20, 50].map((size) => {
            const active = pageSize === size;
            return (
              <TouchableOpacity
                key={String(size)}
                style={[styles.pageSizeChip, active && styles.pageSizeChipActive]}
                onPress={() => setPageSize(size)}
                activeOpacity={0.75}
              >
                <Text style={[styles.pageSizeChipText, active && styles.pageSizeChipTextActive]}>
                  {size}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView 
        style={styles.itemsList} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
      >
        <View style={styles.itemsContent}>
          {selectedItemsCount === 0 ? (
            <EmptyState loading={loading} listingTab={listingTab} />
          ) : inventoryTab === 'product' ? (
            <>
              {pagedGoodsItems.map((item) => (
                <ProductCard
                  key={`product-${item.id}`}
                  product={item}
                  onPress={() => onEditProduct?.(item)}
                  onAddStock={handleAddStock}
                />
              ))}
            </>
          ) : inventoryTab === 'service' ? (
            <>
              {pagedServiceItems.map((item) => (
                <ProductCard
                  key={`product-${item.id}`}
                  product={item}
                  onPress={() => onEditProduct?.(item)}
                  onAddStock={handleAddStock}
                />
              ))}
            </>
          ) : (
            <>
              {pagedPackages.map((pkg) => (
                <PackageCard
                  key={`package-${pkg.id}`}
                  packageItem={pkg}
                  onPress={() => onEditPackage?.(pkg)}
                  onAddStock={handleAddStock}
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* Menu FAB */}
      {menuOpen && (
        <View style={styles.fabMenu}>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setMenuOpen(false);
              if (onImportStock) onImportStock();
              setImportOpen(true);
            }}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="warehouse" size={16} color="#111827" />
            <Text style={styles.fabMenuItemText}>Nhập hàng</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setMenuOpen(false);
              onAddItem?.();
            }}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="plus" size={16} color="#111827" />
            <Text style={styles.fabMenuItemText}>Tạo tiện ích</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setMenuOpen((v) => !v)}
        activeOpacity={0.85}
      >
        <FontAwesome5 name={menuOpen ? 'times' : 'bars'} size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: storeMainContentPaddingTop(),
    marginBottom: storeMainContentMarginBottom(),
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 6,
    padding: 2,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
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
  },
  listingTabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  listingChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  listingChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  listingChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  listingChipTextActive: {
    color: '#FFFFFF',
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
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 10,
  },
  pageArrow: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageArrowDisabled: {
    backgroundColor: '#F3F4F6',
  },
  pageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  pageSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 6,
  },
  pageSizeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  pageSizeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pageSizeChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  pageSizeChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },
  pageSizeChipTextActive: {
    color: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilter: {
    backgroundColor: '#1F2937',
    borderColor: '#1F2937',
  },
  filterText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  itemsList: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for bottom nav + FAB
  },
  itemsContent: {
    padding: 16,
    gap: 12,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 90,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    gap: 8,
  },
  fabMenu: {
    position: 'absolute',
    right: 16,
    bottom: 90 + 62,
    gap: 10,
  },
  fabMenuItem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  fabMenuItemText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },
});







