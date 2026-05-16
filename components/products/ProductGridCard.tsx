import { ProductItem } from "@/models/model";
import { formatCurrencyVND } from "@/utils/format";
import { FontAwesome5 } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ProductGridCardProps {
  product: ProductItem;
  onPress: (id: string) => void;
  onAddToCart: (id: string) => void;
}

export const ProductGridCard: React.FC<ProductGridCardProps> = ({
  product,
  onPress,
  onAddToCart,
}) => {
  const isOutOfStock = product.stock_quantity === 0;
  const isLowStock =
    product.stock_quantity > 0 && product.stock_quantity < 10;

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => onPress(product.id)}
      activeOpacity={0.9}
    >
      <View style={styles.imageWrapper}>
        <Image
          source={{ uri: product.thumbnail_url || "" }}
          style={styles.productImage}
          contentFit="contain"
          transition={200}
        />
        {isOutOfStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Hết hàng</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        {product.sku && (
          <Text style={styles.productSku}>SKU: {product.sku}</Text>
        )}
        {typeof product.stock_quantity === "number" && (
          <Text style={styles.stockText}>
            Số lượng: {product.stock_quantity} {product.unit || ""}
          </Text>
        )}
        <View style={styles.productFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {formatCurrencyVND(product.price)}
            </Text>
            {product.unit && (
              <Text style={styles.unit}>/{product.unit}</Text>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.addButton,
              isOutOfStock && styles.addButtonDisabled,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              if (!isOutOfStock) {
                onAddToCart(product.id);
              }
            }}
            disabled={isOutOfStock}
            activeOpacity={0.7}
          >
            <FontAwesome5
              name="plus"
              size={14}
              color={isOutOfStock ? "#9CA3AF" : "#FFFFFF"}
            />
          </TouchableOpacity>
        </View>
        {isLowStock && (
          <View style={styles.lowStockBadge}>
            <FontAwesome5 name="exclamation-triangle" size={8} color="#F59E0B" />
            <Text style={styles.lowStockText}>
              Còn {product.stock_quantity} {product.unit || "sản phẩm"}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  productCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    height: 160,
    backgroundColor: "#F3F4F6",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  outOfStockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  outOfStockText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
    minHeight: 40,
  },
  productSku: {
    fontSize: 10,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  stockText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    flex: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB",
  },
  unit: {
    fontSize: 10,
    color: "#6B7280",
    marginLeft: 2,
  },
  addButton: {
    width: 32,
    height: 32,
    backgroundColor: "#2563EB",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonDisabled: {
    backgroundColor: "#E5E7EB",
    shadowOpacity: 0,
    elevation: 0,
  },
  lowStockBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    gap: 4,
    alignSelf: "flex-start",
  },
  lowStockText: {
    fontSize: 9,
    color: "#D97706",
    fontWeight: "600",
  },
});

