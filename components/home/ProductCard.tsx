import { ProductItem } from "@/models/model";
import { formatCurrencyVND } from "@/utils/format";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ProductCardProps {
  product: ProductItem;
  onPress: (id: string) => void;
  onAddToCart: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
}) => {

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(product.id)}
      activeOpacity={0.95}
    >
      <View>
        <Image
          source={{ uri: product.thumbnail_url }}
          style={styles.imageContainer}
          contentFit="contain"
        />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {product.name}
      </Text>
      {product.type === "GOODS" && (
        <Text style={styles.stock} numberOfLines={1}>
          Sô lượng: {product.stock_quantity ?? 0}
        </Text>
      )}
      <View style={styles.footer}>
        <Text style={styles.price}>{formatCurrencyVND(product.price)}</Text>
        {product.type !== "PACKAGE" && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => onAddToCart(product.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 140,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: "#DC2626",
    fontSize: 10,
    fontWeight: "600",
  },
  imageContainer: {
    height: 96,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  stock: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  addButton: {
    width: 24,
    height: 24,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
