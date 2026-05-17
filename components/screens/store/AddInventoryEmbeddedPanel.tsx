import { ProductType } from "@/constants/enum";
import { FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ProductTypeOption = {
  value: ProductType;
  label: string;
  icon: string;
  color: string;
};

export interface AddInventoryEmbeddedPanelProps {
  isEditMode: boolean;
  productItem?: { type?: string } | null;
  packageItem?: unknown | null;
  type: ProductType;
  setType: (t: ProductType) => void;
  productTypes: readonly ProductTypeOption[];
  name: string;
  setName: (v: string) => void;
  stockQuantity: string;
  setStockQuantity: (v: string) => void;
  sku: string;
  setSku: (v: string) => void;
  priceDisplay: string;
  handlePriceChange: (v: string) => void;
  unit: string;
  setUnit: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  thumbnailImage: ImagePicker.ImagePickerAsset | null;
  existingThumbnailUrl: string;
  setThumbnailImage: (v: ImagePicker.ImagePickerAsset | null) => void;
  setExistingThumbnailUrl: (v: string) => void;
  pickThumbnail: () => void;
  galleryImages: ImagePicker.ImagePickerAsset[];
  existingGalleryUrls: string[];
  removeGalleryImage: (i: number) => void;
  setExistingGalleryUrls: React.Dispatch<React.SetStateAction<string[]>>;
  pickGalleryImages: () => void;
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  onToggleListing?: () => void;
  showListingToggle: boolean;
  serviceSearch?: string;
  setServiceSearch?: (v: string) => void;
  filteredServices?: any[];
  selectedServiceId?: string;
  setSelectedServiceId?: (id: string) => void;
  loadingServices?: boolean;
}

const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {children}
  </View>
);

const Field = ({
  label,
  required,
  children,
  style,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  style?: object;
}) => (
  <View style={[styles.field, style]}>
    <Text style={styles.label}>
      {label}
      {required ? <Text style={styles.req}> *</Text> : null}
    </Text>
    {children}
  </View>
);

export const AddInventoryEmbeddedPanel: React.FC<AddInventoryEmbeddedPanelProps> = ({
  isEditMode,
  productItem,
  packageItem,
  type,
  setType,
  productTypes,
  name,
  setName,
  stockQuantity,
  setStockQuantity,
  sku,
  setSku,
  priceDisplay,
  handlePriceChange,
  unit,
  setUnit,
  description,
  setDescription,
  thumbnailImage,
  existingThumbnailUrl,
  setThumbnailImage,
  setExistingThumbnailUrl,
  pickThumbnail,
  galleryImages,
  existingGalleryUrls,
  removeGalleryImage,
  setExistingGalleryUrls,
  pickGalleryImages,
  isActive,
  setIsActive,
  onToggleListing,
  showListingToggle,
  serviceSearch = "",
  setServiceSearch,
  filteredServices = [],
  selectedServiceId = "",
  setSelectedServiceId,
  loadingServices = false,
}) => {
  const typeLabel = productTypes.find((t) => t.value === type)?.label ?? "";
  const filteredTypes = productTypes.filter((item) => {
    if (isEditMode && packageItem) return item.value === ProductType.ASSET;
    if (isEditMode && productItem) return item.value !== ProductType.ASSET;
    return true;
  });

  const thumbUri = thumbnailImage?.uri || existingThumbnailUrl || null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.rootContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <SectionCard title="Loại tiện ích">
        <View style={styles.segmented}>
          {filteredTypes.map((item) => {
            const active = type === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.segment,
                  active && { backgroundColor: "#FFFFFF", borderColor: item.color },
                  isEditMode && !!packageItem && styles.segmentDisabled,
                ]}
                onPress={() => {
                  if (isEditMode && packageItem) return;
                  setType(item.value);
                }}
                disabled={isEditMode && !!packageItem}
                activeOpacity={0.8}
              >
                <FontAwesome5
                  name={item.icon}
                  size={13}
                  color={active ? item.color : "#9CA3AF"}
                />
                <Text style={[styles.segmentText, active && { color: item.color, fontWeight: "600" }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard title="Thông tin cơ bản">
        <Field label={`Tên ${typeLabel}`} required>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Nhập tên sản phẩm"
            placeholderTextColor="#9CA3AF"
          />
        </Field>

        <View style={styles.row2}>
          <Field label="Số lượng" required style={styles.rowCell}>
            <TextInput
              style={styles.input}
              value={stockQuantity}
              onChangeText={setStockQuantity}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
          </Field>
          {type !== ProductType.ASSET && (
            <Field label="Mã SKU" required style={styles.rowCell}>
              <TextInput
                style={styles.input}
                value={sku}
                onChangeText={setSku}
                editable={!isEditMode}
                autoCapitalize="characters"
                placeholder="SKU-001"
                placeholderTextColor="#9CA3AF"
              />
            </Field>
          )}
        </View>

        <View style={styles.row2}>
          <Field label="Giá (VNĐ)" required style={styles.rowCell}>
            <TextInput
              style={styles.input}
              value={priceDisplay}
              onChangeText={handlePriceChange}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
          </Field>
          <Field label="Đơn vị" style={styles.rowCell}>
            <TextInput
              style={styles.input}
              value={unit}
              onChangeText={setUnit}
              placeholder="cái, kg..."
              placeholderTextColor="#9CA3AF"
            />
          </Field>
        </View>

        <Field label="Mô tả">
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholder="Mô tả ngắn về sản phẩm"
            placeholderTextColor="#9CA3AF"
          />
        </Field>
      </SectionCard>

      {type === ProductType.ASSET && setServiceSearch && setSelectedServiceId && (
        <SectionCard title="Dịch vụ liên kết">
          <TextInput
            style={[styles.input, styles.inputSpacing]}
            value={serviceSearch}
            onChangeText={setServiceSearch}
            placeholder="Tìm kiếm dịch vụ..."
            placeholderTextColor="#9CA3AF"
          />
          <View style={styles.serviceList}>
            {loadingServices ? (
              <Text style={styles.muted}>Đang tải danh sách dịch vụ...</Text>
            ) : filteredServices.length === 0 ? (
              <Text style={styles.muted}>Không có dịch vụ phù hợp</Text>
            ) : (
              filteredServices.slice(0, 6).map((service: any) => {
                const id = service?.id || service?.uuid;
                if (!id) return null;
                const selected = selectedServiceId === id;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.serviceRow, selected && styles.serviceRowOn]}
                    onPress={() => setSelectedServiceId(id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.serviceRowText, selected && styles.serviceRowTextOn]} numberOfLines={1}>
                      {service?.name || "Dịch vụ"}
                    </Text>
                    {selected && <FontAwesome5 name="check" size={12} color="#2563EB" />}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </SectionCard>
      )}

      <SectionCard title="Hình ảnh">
        <View style={styles.mediaBlock}>
          <View style={styles.mediaPrimary}>
            <Text style={styles.mediaLabel}>Ảnh đại diện</Text>
            {thumbUri ? (
              <View style={styles.thumbWrap}>
                <Image source={{ uri: thumbUri }} style={styles.thumb} />
                <TouchableOpacity
                  style={styles.mediaRemove}
                  onPress={() => {
                    if (thumbnailImage) setThumbnailImage(null);
                    else setExistingThumbnailUrl("");
                  }}
                >
                  <FontAwesome5 name="times" size={10} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.thumbEmpty} onPress={pickThumbnail} activeOpacity={0.85}>
                <FontAwesome5 name="image" size={18} color="#9CA3AF" />
                <Text style={styles.thumbEmptyText}>Thêm ảnh</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.mediaGallery}>
            <Text style={styles.mediaLabel}>Thư viện ảnh</Text>
            <View style={styles.galleryRow}>
              {existingGalleryUrls.map((url, index) => (
                <View key={`e-${index}`} style={styles.galleryTile}>
                  <Image source={{ uri: url }} style={styles.galleryImg} />
                  <TouchableOpacity
                    style={styles.mediaRemoveSm}
                    onPress={() =>
                      setExistingGalleryUrls((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <FontAwesome5 name="times" size={8} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {galleryImages.map((asset, index) => (
                <View key={`n-${index}`} style={styles.galleryTile}>
                  <Image source={{ uri: asset.uri }} style={styles.galleryImg} />
                  <TouchableOpacity
                    style={styles.mediaRemoveSm}
                    onPress={() => removeGalleryImage(index)}
                  >
                    <FontAwesome5 name="times" size={8} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.galleryAdd} onPress={pickGalleryImages} activeOpacity={0.85}>
                <FontAwesome5 name="plus" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="Hiển thị">
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.statusTitle}>Trạng thái hoạt động</Text>
            <Text style={styles.muted}>{isActive ? "Đang hiển thị trên cửa hàng" : "Đã ẩn khỏi danh sách"}</Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: "#E5E7EB", true: "#93C5FD" }}
            thumbColor={isActive ? "#2563EB" : "#FFFFFF"}
          />
        </View>

        {showListingToggle && onToggleListing && (
          <TouchableOpacity
            style={[styles.listingBtn, isActive ? styles.listingBtnDanger : styles.listingBtnSuccess]}
            onPress={onToggleListing}
            activeOpacity={0.85}
          >
            <FontAwesome5
              name={isActive ? "ban" : "check-circle"}
              size={14}
              color={isActive ? "#DC2626" : "#059669"}
            />
            <Text style={[styles.listingBtnText, isActive ? styles.listingDanger : styles.listingSuccess]}>
              {isActive ? "Ngưng hoạt động mặt hàng" : "Kích hoạt lại mặt hàng"}
            </Text>
          </TouchableOpacity>
        )}
      </SectionCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  rootContent: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 12,
    gap: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    gap: 12,
    ...Platform.select({
      web: {
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      },
      default: {},
    }),
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  segmentDisabled: {
    opacity: 0.5,
  },
  segmentText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  req: {
    color: "#EF4444",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    ...Platform.select({
      web: { outlineStyle: "none" } as object,
      default: {},
    }),
  },
  inputSpacing: {
    marginBottom: 4,
  },
  textArea: {
    minHeight: 72,
    paddingTop: 10,
  },
  row2: {
    flexDirection: "row",
    gap: 10,
  },
  rowCell: {
    flex: 1,
    minWidth: 0,
  },
  serviceList: {
    gap: 6,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  serviceRowOn: {
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  serviceRowText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    marginRight: 8,
  },
  serviceRowTextOn: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
  muted: {
    fontSize: 12,
    color: "#9CA3AF",
    lineHeight: 16,
  },
  mediaBlock: {
    gap: 14,
  },
  mediaPrimary: {
    gap: 8,
  },
  mediaGallery: {
    gap: 8,
  },
  mediaLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  thumbWrap: {
    position: "relative",
    alignSelf: "flex-start",
  },
  thumb: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  thumbEmpty: {
    width: 120,
    height: 120,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FAFAFA",
  },
  thumbEmptyText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  mediaRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  galleryTile: {
    position: "relative",
  },
  galleryImg: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  mediaRemoveSm: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryAdd: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  listingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
  },
  listingBtnDanger: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  listingBtnSuccess: {
    borderColor: "#A7F3D0",
    backgroundColor: "#ECFDF5",
  },
  listingBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  listingDanger: {
    color: "#DC2626",
  },
  listingSuccess: {
    color: "#059669",
  },
});
