import { Product } from '@/components/shop/ProductCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

// Mock product data - in real app, fetch from API based on productId
const getProductById = (id: string): Product | null => {
  const allProducts: Product[] = [
    {
      id: '1',
      name: 'Premium Laundry Detergent',
      price: 12.99,
      imageUrl: 'https://picsum.photos/400/400?random=1',
      thumbnailUrl: 'https://picsum.photos/400/400?random=1',
      stock: 45,
      description:
        'Our premium laundry detergent is specially formulated to remove tough stains while keeping your clothes soft and fresh. Made with natural ingredients and safe for all fabric types. Perfect for everyday use and gentle on sensitive skin.',
    },
    {
      id: '2',
      name: 'Fabric Softener Sheets',
      price: 8.99,
      imageUrl: 'https://picsum.photos/400/400?random=2',
      thumbnailUrl: 'https://picsum.photos/400/400?random=2',
      stock: 32,
      description:
        'Keep your clothes soft and static-free with our fabric softener sheets. These convenient sheets reduce wrinkles, eliminate static cling, and leave your laundry with a fresh, clean scent that lasts all day.',
    },
    {
      id: '3',
      name: 'Stain Remover Spray',
      price: 6.99,
      imageUrl: 'https://picsum.photos/400/400?random=3',
      thumbnailUrl: 'https://picsum.photos/400/400?random=3',
      stock: 0,
      description:
        'Powerful stain remover that tackles even the toughest stains. Works on grease, oil, food, and beverage stains. Safe for use on most fabrics and colors. Simply spray, wait, and wash for best results.',
    },
    {
      id: '4',
      name: 'Bleach Alternative',
      price: 9.99,
      imageUrl: 'https://picsum.photos/400/400?random=4',
      thumbnailUrl: 'https://picsum.photos/400/400?random=4',
      stock: 18,
      description:
        'A safe and effective alternative to traditional bleach. Whitens and brightens your whites without the harsh chemicals. Color-safe formula that works on all washable fabrics.',
    },
    {
      id: '5',
      name: 'Dryer Sheets',
      price: 7.99,
      imageUrl: 'https://picsum.photos/400/400?random=5',
      thumbnailUrl: 'https://picsum.photos/400/400?random=5',
      stock: 67,
      description:
        'Premium dryer sheets that reduce static, soften fabrics, and add a long-lasting fresh scent. One sheet per load is all you need for soft, static-free laundry.',
    },
    {
      id: '6',
      name: 'Wool Wash',
      price: 14.99,
      imageUrl: 'https://picsum.photos/400/400?random=6',
      thumbnailUrl: 'https://picsum.photos/400/400?random=6',
      stock: 12,
      description:
        'Specialty detergent designed specifically for wool and delicate fabrics. Gentle formula preserves the natural softness and shape of your wool garments. Hand wash or machine wash on delicate cycle.',
    },
    {
      id: '7',
      name: 'Color Safe Bleach',
      price: 10.99,
      imageUrl: 'https://picsum.photos/400/400?random=7',
      thumbnailUrl: 'https://picsum.photos/400/400?random=7',
      stock: 28,
      description:
        'Brighten and whiten your colored clothes safely. This color-safe bleach alternative removes stains and odors while protecting the vibrancy of your colored fabrics.',
    },
    {
      id: '8',
      name: 'Delicate Fabric Wash',
      price: 11.99,
      imageUrl: 'https://picsum.photos/400/400?random=8',
      thumbnailUrl: 'https://picsum.photos/400/400?random=8',
      stock: 5,
      description:
        'Ultra-gentle formula perfect for silk, lace, and other delicate fabrics. pH-balanced to protect fabric fibers and maintain color. Ideal for hand washing or delicate machine cycles.',
    },
    {
      id: '9',
      name: 'Odor Eliminator',
      price: 13.99,
      imageUrl: 'https://picsum.photos/400/400?random=9',
      thumbnailUrl: 'https://picsum.photos/400/400?random=9',
      stock: 54,
      description:
        'Powerful odor-fighting formula that eliminates even the toughest smells from your laundry. Works on smoke, sweat, pet odors, and more. Leaves clothes fresh and odor-free.',
    },
    {
      id: '10',
      name: 'Eco-Friendly Detergent',
      price: 15.99,
      imageUrl: 'https://picsum.photos/400/400?random=10',
      thumbnailUrl: 'https://picsum.photos/400/400?random=10',
      stock: 23,
      description:
        'Environmentally friendly laundry detergent made with plant-based ingredients. Biodegradable formula that cleans effectively while being gentle on the planet. Safe for septic systems.',
    },
    {
      id: '11',
      name: 'Lint Roller Refills',
      price: 5.99,
      imageUrl: 'https://picsum.photos/400/400?random=11',
      thumbnailUrl: 'https://picsum.photos/400/400?random=11',
      stock: 89,
      description:
        'High-quality adhesive sheets that effectively remove lint, pet hair, and debris from clothing and upholstery. Easy to use and disposable. Compatible with most standard lint rollers.',
    },
    {
      id: '12',
      name: 'Ironing Spray',
      price: 8.49,
      imageUrl: 'https://picsum.photos/400/400?random=12',
      thumbnailUrl: 'https://picsum.photos/400/400?random=12',
      stock: 41,
      description:
        'Makes ironing easier and faster. This spray helps remove wrinkles quickly while adding a fresh scent. Works on all fabric types and helps prevent fabric shine. Simply spray and iron.',
    },
  ];

  return allProducts.find((p) => p.id === id) || null;
};

export default function ProductDetailScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const router = useRouter();
  const product = productId ? getProductById(productId) : null;

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({ light: '#0a7ea4', dark: '#fff' }, 'tint');
  const borderColor = useThemeColor({ light: '#E5E5E5', dark: '#3A3A3A' }, 'icon');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ThemedView style={styles.errorContainer}>
          <ThemedText type="title">Product not found</ThemedText>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ThemedText>Go Back</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        {/* Product Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.imageUrl || product.thumbnailUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        {/* Product Info */}
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.productName}>
            {product.name}
          </ThemedText>

          <View style={styles.priceStockContainer}>
            <ThemedText style={[styles.price, { color: tintColor }]}>
              {formatPrice(product.price)}
            </ThemedText>
            <View style={styles.stockContainer}>
              <Ionicons name="cube-outline" size={16} color={textColor} style={styles.stockIcon} />
              <ThemedText style={[styles.stockText, { color: textColor }]}>
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </ThemedText>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <ThemedText type="subtitle" style={styles.descriptionTitle}>
              Description
            </ThemedText>
            <ThemedText style={[styles.description, { color: textColor }]}>
              {product.description || 'No description available.'}
            </ThemedText>
          </View>
        </ThemedView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  imageContainer: {
    width: '100%',
    height: 400,
    backgroundColor: '#F5F5F5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 20,
  },
  productName: {
    marginBottom: 16,
  },
  priceStockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockIcon: {
    marginRight: 6,
  },
  stockText: {
    fontSize: 14,
    opacity: 0.7,
  },
  descriptionContainer: {
    marginTop: 8,
  },
  descriptionTitle: {
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
});

