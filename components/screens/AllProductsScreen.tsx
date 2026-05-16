import {
  ProductEmptyState,
  ProductGridCard,
  ProductSearchBar,
  ProductSortBar,
  ProductsHeader,
  SortOption,
} from "@/components/products";
import { ProductStatus } from "@/constants/enum";
import { ProductItem } from "@/models/model";
import { productService } from "@/services/api";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

interface AllProductsScreenProps {
  products?: ProductItem[];
  onBack: () => void;
  onProductPress: (id: string) => void;
  onAddToCart: (id: string) => void;
}

export const AllProductsScreen: React.FC<AllProductsScreenProps> = ({
  products: initialProducts,
  onBack,
  onProductPress,
  onAddToCart,
}) => {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts || []);
  const [filteredProducts, setFilteredProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(!initialProducts);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("default");

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productService.searchProducts(0, 100, undefined, {
        status: ProductStatus.ACTIVE,
      });
      const fetchedProducts: ProductItem[] = response?.data || [];
      setProducts(fetchedProducts);
      setFilteredProducts(fetchedProducts);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      Alert.alert("Lỗi", error?.message || "Không thể tải danh sách sản phẩm");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!initialProducts || initialProducts.length === 0) {
      fetchProducts();
    } else {
      setFilteredProducts(initialProducts);
    }
  }, [initialProducts, fetchProducts]);

  // Search and filter logic
  useEffect(() => {
    let filtered = [...products];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query)
      );
    }

    // Apply sort
    switch (sortOption) {
      case "price-asc":
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "price-desc":
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case "name-asc":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // Keep original order
        break;
    }

    setFilteredProducts(filtered);
  }, [searchQuery, sortOption, products]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <View style={styles.container}>
      <ProductsHeader
        title="Cửa hàng Tiện ích"
        onBack={onBack}
        resultsCount={filteredProducts.length}
        searchQuery={searchQuery}
        loading={loading}
      />

      <View style={styles.headerContent}>
        <View style={styles.searchContainer}>
          <ProductSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={clearSearch}
          />
        </View>

        <ProductSortBar
          selectedOption={sortOption}
          onOptionSelect={setSortOption}
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2563EB"]}
            tintColor="#2563EB"
          />
        }
      >
        {filteredProducts.length === 0 ? (
          <ProductEmptyState
            loading={loading}
            hasSearchQuery={!!searchQuery.trim()}
            onClearSearch={clearSearch}
          />
        ) : (
          <View style={styles.grid}>
            {filteredProducts.map((product) => (
              <ProductGridCard
                key={product.id}
                product={product}
                onPress={onProductPress}
                onAddToCart={onAddToCart}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerContent: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchContainer: {
    marginBottom: 12,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
});
