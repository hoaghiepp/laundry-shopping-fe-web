import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { Product, ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  searchQuery?: string;
}

export function ProductGrid({ products, onAddToCart, searchQuery = '' }: ProductGridProps) {
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const screenWidth = Dimensions.get('window').width;
  const padding = 16;
  const gap = 16;
  const cardWidth = (screenWidth - padding * 2 - gap) / 2;

  const renderItem = ({ item }: { item: Product }) => (
    <View style={{ width: cardWidth }}>
      <ProductCard product={item} onAddToCart={onAddToCart} />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredProducts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
});

