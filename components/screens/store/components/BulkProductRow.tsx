import { ProductStatus, ProductType } from "@/constants/enum";
import { formatCurrencyVND } from "@/utils/format";
import { FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface BulkProductRowValue {
  name: string;
  sku: string;
  price: string; // digits only
  stock_quantity: string; // digits only
  unit: string;
  description: string;
  category_ids: string[];
  thumbnailImage: ImagePicker.ImagePickerAsset | null;
  galleryImages: ImagePicker.ImagePickerAsset[];
  type: ProductType;
  status: ProductStatus;
}

interface BulkProductRowProps {
  index: number;
  categories: any[];
  value: BulkProductRowValue;
  onChange: (next: BulkProductRowValue) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export const BulkProductRow: React.FC<BulkProductRowProps> = ({
  index,
  categories,
  value,
  onChange,
  onRemove,
  canRemove,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [categorySearch, setCategorySearch] = useState("");

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories || [];
    const q = categorySearch.trim().toLowerCase();
    return (categories || []).filter((cat: any) => {
      const name = (cat?.name || cat?.title || "").toLowerCase();
      return name.includes(q);
    });
  }, [categories, categorySearch]);

  const toggleCategory = (id: string) => {
    onChange({
      ...value,
      category_ids: value.category_ids.includes(id)
        ? value.category_ids.filter((x) => x !== id)
        : [...value.category_ids, id],
    });
  };

  const pickThumbnail = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onChange({ ...value, thumbnailImage: result.assets[0] });
    }
  };

  const pickGalleryImages = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      onChange({ ...value, galleryImages: [...value.galleryImages, ...result.assets] });
    }
  };

  const removeGalleryImage = (idx: number) => {
    onChange({
      ...value,
      galleryImages: value.galleryImages.filter((_, i) => i !== idx),
    });
  };

  const headerSubtitle = value.name?.trim()
    ? value.name.trim()
    : value.sku?.trim()
      ? value.sku.trim()
      : "Chưa nhập thông tin";

  return (
    <View style={styles.card}>
      <View style={styles.rowHeader}>
        <TouchableOpacity
          style={styles.rowHeaderLeft}
          onPress={() => setExpanded((v) => !v)}
          activeOpacity={0.75}
        >
          <FontAwesome5
            name={expanded ? "chevron-down" : "chevron-right"}
            size={14}
            color="#6B7280"
          />
          <View style={styles.rowHeaderText}>
            <Text style={styles.rowTitle}>Sản phẩm {index + 1}</Text>
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {headerSubtitle}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.rowHeaderActions}>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{value.type}</Text>
            </View>
            <View
              style={[
                styles.badge,
                value.status === ProductStatus.ACTIVE
                  ? styles.badgeActive
                  : styles.badgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  value.status === ProductStatus.ACTIVE
                    ? styles.badgeTextActive
                    : styles.badgeTextInactive,
                ]}
              >
                {value.status}
              </Text>
            </View>
          </View>
          {canRemove && (
            <TouchableOpacity
              onPress={onRemove}
              activeOpacity={0.7}
              style={styles.removeBtn}
            >
              <FontAwesome5 name="trash" size={14} color="#DC2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!expanded ? null : (
        <>
          <View style={styles.toggleRow}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.toggleChips}>
              {[ProductType.GOODS, ProductType.SERVICE].map((t) => {
                const active = value.type === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.toggleChip, active && styles.toggleChipActive]}
                    onPress={() => onChange({ ...value, type: t })}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.toggleChipText,
                        active && styles.toggleChipTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.toggleChips}>
              {[ProductStatus.ACTIVE, ProductStatus.INACTIVE].map((s) => {
                const active = value.status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.toggleChip, active && styles.toggleChipActive]}
                    onPress={() => onChange({ ...value, status: s })}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.toggleChipText,
                        active && styles.toggleChipTextActive,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.col}>
              <Text style={styles.label}>Tên *</Text>
              <TextInput
                value={value.name}
                onChangeText={(t) => onChange({ ...value, name: t })}
                style={styles.input}
                placeholder="VD: Nước giặt"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>SKU *</Text>
              <TextInput
                value={value.sku}
                onChangeText={(t) => onChange({ ...value, sku: t })}
                style={styles.input}
                placeholder="VD: SKU001"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.col}>
              <Text style={styles.label}>Giá *</Text>
              <TextInput
                value={formatCurrencyVND(value.price)}
                onChangeText={(t) =>
                  onChange({ ...value, price: t.replace(/\D/g, "") })
                }
                style={styles.input}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Số lượng *</Text>
              <TextInput
                value={value.stock_quantity}
                onChangeText={(t) =>
                  onChange({ ...value, stock_quantity: t.replace(/\D/g, "") })
                }
                style={styles.input}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Đơn vị</Text>
              <TextInput
                value={value.unit}
                onChangeText={(t) => onChange({ ...value, unit: t })}
                style={styles.input}
                placeholder="cái"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.col}>
              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                value={value.description}
                onChangeText={(t) => onChange({ ...value, description: t })}
                style={[styles.input, styles.textArea]}
                placeholder="Nhập mô tả..."
                placeholderTextColor="#9CA3AF"
                multiline
              />
            </View>
          </View>

          <View style={styles.imagesRow}>
            <View style={styles.imageBlock}>
              <Text style={styles.label}>Ảnh đại diện *</Text>
              {value.thumbnailImage ? (
                <View style={styles.thumbWrap}>
                  <Image source={{ uri: value.thumbnailImage.uri }} style={styles.thumb} />
                  <TouchableOpacity
                    style={styles.thumbRemove}
                    onPress={() => onChange({ ...value, thumbnailImage: null })}
                    activeOpacity={0.7}
                  >
                    <FontAwesome5 name="times" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.imagePickBtn} onPress={pickThumbnail} activeOpacity={0.75}>
                  <FontAwesome5 name="camera" size={16} color="#6B7280" />
                  <Text style={styles.imagePickText}>Chọn ảnh</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.imageBlock}>
              <Text style={styles.label}>Thư viện ảnh</Text>
              <TouchableOpacity
                style={styles.imagePickBtn}
                onPress={pickGalleryImages}
                activeOpacity={0.75}
              >
                <FontAwesome5 name="images" size={16} color="#6B7280" />
                <Text style={styles.imagePickText}>Thêm ảnh</Text>
              </TouchableOpacity>
              {value.galleryImages.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
                  {value.galleryImages.map((asset, idx) => (
                    <View key={`${asset.uri}-${idx}`} style={styles.galleryItem}>
                      <Image source={{ uri: asset.uri }} style={styles.galleryImg} />
                      <TouchableOpacity
                        style={styles.galleryRemove}
                        onPress={() => removeGalleryImage(idx)}
                        activeOpacity={0.7}
                      >
                        <FontAwesome5 name="times" size={10} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

          <View style={styles.categoriesBlock}>
            <Text style={styles.label}>Danh mục</Text>
            <TextInput
              value={categorySearch}
              onChangeText={setCategorySearch}
              style={styles.input}
              placeholder="Tìm danh mục..."
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.categoryChips}>
              {filteredCategories.map((cat: any) => {
                const id = String(cat?.id ?? "");
                if (!id) return null;
                const active = value.category_ids.includes(id);
                const label = cat?.name || cat?.title || "Category";
                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.categoryChip, active && styles.categoryChipActive]}
                    onPress={() => toggleCategory(id)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rowHeaderText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },
  rowHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  badgeInactive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#374151",
  },
  badgeTextActive: {
    color: "#047857",
  },
  badgeTextInactive: {
    color: "#B91C1C",
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  gridRow: {
    flexDirection: "row",
    gap: 10,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  toggleChips: {
    flexDirection: "row",
    gap: 8,
  },
  toggleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  toggleChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  toggleChipText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#6B7280",
  },
  toggleChipTextActive: {
    color: "#FFFFFF",
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  imagesRow: {
    flexDirection: "row",
    gap: 10,
  },
  imageBlock: {
    flex: 1,
    gap: 8,
  },
  imagePickBtn: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  imagePickText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#374151",
  },
  thumbWrap: {
    position: "relative",
    width: "100%",
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F3F4F6",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(17, 24, 39, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  gallery: {
    marginTop: 6,
  },
  galleryItem: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
    position: "relative",
  },
  galleryImg: {
    width: "100%",
    height: "100%",
  },
  galleryRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(17, 24, 39, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  categoriesBlock: {
    gap: 10,
  },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
});

