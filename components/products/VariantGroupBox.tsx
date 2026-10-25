import { ProductType } from "@/constants/enum";
import { ProductItem } from "@/models/model";
import { formatCurrencyVND } from "@/utils/format";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface VariantGroupBoxProps {
  title: string;
  products: ProductItem[];
  onSelect: (product: ProductItem) => void;
  /** Home horizontal row uses a fixed card. Grids and lists stretch. */
  layout?: "card" | "full";
  optionTrailing?: (product: ProductItem) => React.ReactNode;
}

function isGoodsOutOfStock(product: ProductItem): boolean {
  return product.type === ProductType.GOODS && Number(product.stock_quantity) <= 0;
}

export const VariantGroupBox: React.FC<VariantGroupBoxProps> = ({
  title,
  products,
  onSelect,
  layout = "full",
  optionTrailing,
}) => {
  return (
    <View style={[styles.box, layout === "card" ? styles.boxCard : styles.boxFull]}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {products.map((product) => {
        const disabled = isGoodsOutOfStock(product);
        const rowStyle = [styles.option, disabled && styles.optionDisabled];
        const body = (
          <>
            {product.thumbnail_url ? (
              <Image source={{ uri: product.thumbnail_url }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={styles.thumb} />
            )}
            <View style={styles.optionInfo}>
              <Text style={styles.name} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.price}>{formatCurrencyVND(product.price)}</Text>
              {product.type === ProductType.GOODS ? (
                <Text style={styles.stock}>
                  {disabled ? "Hết hàng" : `Số lượng: ${product.stock_quantity ?? 0}`}
                </Text>
              ) : null}
            </View>
            {optionTrailing ? optionTrailing(product) : null}
          </>
        );
        if (optionTrailing) {
          return (
            <View key={product.id} style={rowStyle}>
              {body}
            </View>
          );
        }
        return (
          <TouchableOpacity
            key={product.id}
            style={rowStyle}
            onPress={() => {
              if (!disabled) onSelect(product);
            }}
            activeOpacity={0.75}
            disabled={disabled}
          >
            {body}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    gap: 8,
  },
  boxCard: {
    width: 220,
  },
  boxFull: {
    width: "100%",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  optionDisabled: {
    opacity: 0.45,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  optionInfo: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  price: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  stock: {
    marginTop: 2,
    fontSize: 11,
    color: "#6B7280",
  },
});
