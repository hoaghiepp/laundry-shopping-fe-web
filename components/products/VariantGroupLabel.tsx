import React from "react";
import { StyleProp, Text, TextStyle } from "react-native";

/** Shown on product detail, inventory, cart, and order lines. */
export function VariantGroupLabel({
  value,
  style,
}: {
  value?: string | null;
  style?: StyleProp<TextStyle>;
}) {
  const title = value?.trim();
  if (!title) return null;
  return (
    <Text style={style} numberOfLines={1}>
      Nhóm: {title}
    </Text>
  );
}
