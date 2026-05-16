import { ProductGridCard } from '@/components/products/ProductGridCard';
import { ProductSearchBar } from '@/components/products/ProductSearchBar';
import { ProductStatus, ProductType } from '@/constants/enum';
import { ProductItem } from '@/models/model';
import { productService } from '@/services/api';
import { packageService } from '@/services/api/packageProductService';
import { storeService } from '@/services/api/storeService';
import { FontAwesome5 } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type TabType = 'goods' | 'services' | 'packages';

interface AllServicesScreenProps {
  onBack: () => void;
  onProductPress: (product: ProductItem) => void;
  onAddToCart: (product: ProductItem) => void;
  initialTab?: TabType;
}

interface GroupedProducts {
  [storeId: string]: {
    storeName: string;
    products: ProductItem[];
  };
}

export const AllServicesScreen: React.FC<AllServicesScreenProps> = ({ 
  onBack, 
  onProductPress,
  onAddToCart,
  initialTab = 'goods'
}) => {
  const PAGE_SIZE = 24;
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [goods, setGoods] = useState<ProductItem[]>([]);
  const [services, setServices] = useState<ProductItem[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [groupedGoods, setGroupedGoods] = useState<GroupedProducts>({});
  const [groupedServices, setGroupedServices] = useState<GroupedProducts>({});
  const [groupedPackages, setGroupedPackages] = useState<GroupedProducts>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storeNames, setStoreNames] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const goodsPageRef = useRef(0);
  const [goodsHasMore, setGoodsHasMore] = useState(true);
  const [goodsLoadingMore, setGoodsLoadingMore] = useState(false);

  const servicesPageRef = useRef(0);
  const [servicesHasMore, setServicesHasMore] = useState(true);
  const [servicesLoadingMore, setServicesLoadingMore] = useState(false);

  // Remove accents/diacritics from Vietnamese text
  const removeAccents = (str: string): string => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  // Search filter function (case-insensitive and accent-insensitive)
  const matchesSearch = (text: string, query: string): boolean => {
    if (!query.trim()) return true;
    const normalizedText = removeAccents(text.toLowerCase());
    const normalizedQuery = removeAccents(query.toLowerCase());
    return normalizedText.includes(normalizedQuery);
  };

  const fetchStoreName = useCallback(async (storeId: string): Promise<string> => {
    if (storeNames[storeId]) {
      return storeNames[storeId];
    }
    try {
      const response = await storeService.getStoreProfile(storeId);
      const name = response?.data?.name || storeId;
      setStoreNames(prev => ({ ...prev, [storeId]: name }));
      return name;
    } catch (error) {
      console.error(`Failed to fetch store name for ${storeId}:`, error);
      return storeId;
    }
  }, [storeNames]);

  const groupByStore = useCallback(async (items: ProductItem[]): Promise<GroupedProducts> => {
    const grouped: GroupedProducts = {};
    
    for (const item of items) {
      const storeId = item.store_id || 'unknown';
      if (!grouped[storeId]) {
        const storeName = await fetchStoreName(storeId);
        grouped[storeId] = {
          storeName,
          products: []
        };
      }
      grouped[storeId].products.push(item);
    }
    
    return grouped;
  }, [fetchStoreName]);

  const appendToGrouped = useCallback(
    async (
      items: ProductItem[],
      prevGrouped: GroupedProducts,
      setGrouped: React.Dispatch<React.SetStateAction<GroupedProducts>>
    ) => {
      if (items.length === 0) return;

      // Build updates incrementally to avoid re-grouping everything
      const updates: GroupedProducts = { ...prevGrouped };
      for (const item of items) {
        const storeId = item.store_id || 'unknown';
        if (!updates[storeId]) {
          const storeName = await fetchStoreName(storeId);
          updates[storeId] = { storeName, products: [] };
        }
        updates[storeId] = {
          ...updates[storeId],
          products: [...updates[storeId].products, item],
        };
      }
      setGrouped(updates);
    },
    [fetchStoreName]
  );

  const fetchGoods = useCallback(async (opts?: { reset?: boolean }) => {
    try {
      const reset = !!opts?.reset;
      const page = reset ? 0 : goodsPageRef.current;
      const response = await productService.searchProducts(page, PAGE_SIZE, undefined, {
        type: ProductType.GOODS,
        status: ProductStatus.ACTIVE,
      });
      const raw = response?.data || [];

      setGoodsHasMore(raw.length >= PAGE_SIZE);
      goodsPageRef.current = page + 1;

      if (reset) {
        setGoods(raw);
        const grouped = await groupByStore(raw);
        setGroupedGoods(grouped);
      } else {
        setGoods((prev) => {
          const seen = new Set(prev.map((p: ProductItem) => p.id));
          const next = raw.filter((p: any) => !seen.has(p.id));
          return [...prev, ...next];
        });
        setGroupedGoods((prevGrouped) => {
          // async merge below will update state again
          void appendToGrouped(raw, prevGrouped, setGroupedGoods);
          return prevGrouped;
        });
      }
    } catch (error) {
      console.error('Failed to fetch goods:', error);
    }
  }, [PAGE_SIZE, appendToGrouped, groupByStore]);

  const fetchServices = useCallback(async (opts?: { reset?: boolean }) => {
    try {
      const reset = !!opts?.reset;
      const page = reset ? 0 : servicesPageRef.current;
      const response = await productService.searchProducts(page, PAGE_SIZE, undefined, {
        type: ProductType.SERVICE,
        status: ProductStatus.ACTIVE,
      });
      const raw = response?.data || [];
      setServicesHasMore(raw.length >= PAGE_SIZE);
      servicesPageRef.current = page + 1;

      if (reset) {
        setServices(response?.data || []);
        const grouped = await groupByStore(response?.data || []);
        setGroupedServices(grouped);
      } else {
        setServices((prev) => {
          const seen = new Set(prev.map((p: ProductItem) => p.id));
          const next = response?.data?.filter((p: any) => !seen.has(p.id));
          return [...prev, ...next];
        });
        setGroupedServices((prevGrouped) => {
          void appendToGrouped(raw, prevGrouped, setGroupedServices);
          return prevGrouped;
        });
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  }, [PAGE_SIZE, appendToGrouped, groupByStore]);

  const fetchPackages = useCallback(async () => {
    try {
      const response = await packageService.searchPackages({}, { page: 0, size: 100 });
      const packageData = response?.data || [];
      setPackages(packageData);
      
      // Convert packages to ProductItem format for grouping
      const packageProducts: ProductItem[] = packageData.map((pkg: any) => ({
        id: pkg.id,
        store_id: pkg.store_id || '',
        name: pkg.name,
        sku: pkg.sku || '',
        stock_quantity: pkg.quantity || 0,
        reserved_quantity: 0,
        description: pkg.description || '',
        thumbnail_url: pkg.thumbnail_url || '',
        gallery_urls: pkg.gallery_urls || [],
        type: 'PACKAGE',
        status: pkg.status || 'ACTIVE',
        unit: pkg.unit || '',
        price: pkg.price || 0,
        priority: pkg.priority || 0,
        deleted: false,
      }));
      
      const grouped = await groupByStore(packageProducts);
      setGroupedPackages(grouped);
    } catch (error) {
      console.error('Failed to fetch packages:', error);
    }
  }, [groupByStore]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    goodsPageRef.current = 0;
    setGoodsHasMore(true);
    servicesPageRef.current = 0;
    setServicesHasMore(true);
    await Promise.all([
      fetchGoods({ reset: true }),
      fetchServices({ reset: true }),
      fetchPackages(),
    ]);
    setLoading(false);
  }, [fetchGoods, fetchServices, fetchPackages]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Update active tab when initialTab prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAll().finally(() => setRefreshing(false));
  }, [fetchAll]);

  const renderProductsByStore = (grouped: GroupedProducts) => {
    return Object.entries(grouped).map(([storeId, { storeName, products }]) => {
      // Filter products by search query
      const filteredProducts = products.filter((product) =>
        matchesSearch(product.name, searchQuery) ||
        matchesSearch(product.sku || '', searchQuery) ||
        matchesSearch(product.description || '', searchQuery)
      );

      if (filteredProducts.length === 0) {
        return null;
      }

      return (
        <View key={storeId} style={styles.storeGroup}>
          <Text style={styles.storeName}>{storeName}</Text>
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => (
              <ProductGridCard
                key={product.id}
                product={product}
                onPress={(id) => onProductPress(product)}
                onAddToCart={(id) => onAddToCart(product)}
              />
            ))}
          </View>
        </View>
      );
    }).filter(Boolean);
  };

  const groupedToListData = (grouped: GroupedProducts) => {
    return Object.entries(grouped)
      .map(([storeId, { storeName, products }]) => {
        const filteredProducts = products.filter((product) =>
          matchesSearch(product.name, searchQuery) ||
          matchesSearch(product.sku || '', searchQuery) ||
          matchesSearch(product.description || '', searchQuery)
        );

        if (filteredProducts.length === 0) return null;
        return { storeId, storeName, products: filteredProducts };
      })
      .filter(Boolean) as Array<{ storeId: string; storeName: string; products: ProductItem[] }>;
  };

  const loadMore = useCallback(async () => {
    if (refreshing || loading) return;

    if (activeTab === 'goods') {
      if (!goodsHasMore || goodsLoadingMore) return;
      setGoodsLoadingMore(true);
      await fetchGoods({ reset: false });
      setGoodsLoadingMore(false);
      return;
    }

    if (activeTab === 'services') {
      if (!servicesHasMore || servicesLoadingMore) return;
      setServicesLoadingMore(true);
      await fetchServices({ reset: false });
      setServicesLoadingMore(false);
    }
  }, [
    activeTab,
    fetchGoods,
    fetchServices,
    goodsHasMore,
    goodsLoadingMore,
    loading,
    refreshing,
    servicesHasMore,
    servicesLoadingMore,
  ]);

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      );
    }

    let grouped: GroupedProducts = {};
    let isEmpty = false;
    let listData: Array<{ storeId: string; storeName: string; products: ProductItem[] }> = [];

    switch (activeTab) {
      case 'goods':
        grouped = groupedGoods;
        isEmpty = goods.length === 0;
        listData = groupedToListData(groupedGoods);
        break;
      case 'services':
        grouped = groupedServices;
        isEmpty = services.length === 0;
        listData = groupedToListData(groupedServices);
        break;
      case 'packages':
        grouped = groupedPackages;
        isEmpty = packages.length === 0;
        listData = groupedToListData(groupedPackages);
        break;
    }

    if (isEmpty) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không có sản phẩm nào</Text>
        </View>
      );
    }

    return (
      <FlatList
        style={styles.content}
        contentContainerStyle={styles.listContent}
        data={listData}
        keyExtractor={(item) => item.storeId}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
        renderItem={({ item }) => (
          <View style={styles.storeGroup}>
            <Text style={styles.storeName}>{item.storeName}</Text>
            <View style={styles.productsGrid}>
              {item.products.map((product) => (
                <ProductGridCard
                  key={product.id}
                  product={product}
                  onPress={() => onProductPress(product)}
                  onAddToCart={() => onAddToCart(product)}
                />
              ))}
            </View>
          </View>
        )}
        onEndReachedThreshold={0.6}
        onEndReached={loadMore}
        ListFooterComponent={() => {
          const show =
            (activeTab === 'goods' && goodsLoadingMore) ||
            (activeTab === 'services' && servicesLoadingMore);
          if (!show) return null;
          return (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color="#2563EB" />
            </View>
          );
        }}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <FontAwesome5 name="arrow-left" size={16} color="#4B5563" />
        </TouchableOpacity>
        <Text style={styles.title}>Tất cả sản phẩm</Text>
      </View>

      <View style={styles.searchContainer}>
        <ProductSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder="Tìm kiếm sản phẩm..."
        />
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'goods' && styles.activeTab]}
          onPress={() => setActiveTab('goods')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'goods' && styles.activeTabText]}>
            Hàng hóa
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'services' && styles.activeTab]}
          onPress={() => setActiveTab('services')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'services' && styles.activeTabText]}>
            Dịch vụ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'packages' && styles.activeTab]}
          onPress={() => setActiveTab('packages')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'packages' && styles.activeTabText]}>
            Gói dịch vụ
          </Text>
        </TouchableOpacity>
      </View>

      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#2563EB',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  storeGroup: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
