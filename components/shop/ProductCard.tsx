import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  thumbnailUrl?: string;
  stock: number;
  description?: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({ light: '#0a7ea4', dark: '#fff' }, 'tint');
  const borderColor = useThemeColor({ light: '#E5E5E5', dark: '#3A3A3A' }, 'icon');
  const cardBackground = useThemeColor({ light: '#FFFFFF', dark: '#1F1F1F' }, 'background');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const handleCardPress = () => {
    router.push({
      pathname: '/product-detail',
      params: { productId: product.id },
    });
  };

  return (
    <ThemedView style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
      <TouchableOpacity onPress={handleCardPress} activeOpacity={0.9}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.thumbnailUrl || product.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        <View style={styles.content}>
          <ThemedText style={[styles.productName, { color: textColor }]} numberOfLines={2}>
            {product.name}
          </ThemedText>

          <View style={styles.stockContainer}>
            <Ionicons name="cube-outline" size={14} color={textColor} style={styles.stockIcon} />
            <ThemedText style={[styles.stockText, { color: textColor }]}>
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
            </ThemedText>
          </View>

          <View style={styles.footer}>
            <ThemedText style={[styles.price, { color: tintColor }]}>
              {formatPrice(product.price)}
            </ThemedText>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.addButtonContainer}
        onPress={() => onAddToCart(product)}
        disabled={product.stock === 0}
        activeOpacity={0.8}>
        <View
          style={[
            styles.addButton,
            { backgroundColor: product.stock > 0 ? tintColor : '#CCCCCC' },
          ]}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#F5F5F5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    minHeight: 40,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockIcon: {
    marginRight: 4,
  },
  stockText: {
    fontSize: 12,
    opacity: 0.7,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

