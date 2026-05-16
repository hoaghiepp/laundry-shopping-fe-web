import { BulkProductsForm } from "@/components/screens/store/components/BulkProductsForm";
import { ProductType } from "@/constants/enum";
import { compatAlert } from "@/lib/compatAlert";
import { ProductItem } from "@/models/model";
import { CreatePackageRequest, packageService, UpdatePackageRequest } from "@/services/api/packageProductService";
import { productService, UpdateProductRequest } from "@/services/api/productService";
import { uploadService } from "@/services/api/uploadService";
import { FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface PackageItem {
  id: string;
  store_id: string;
  name: string;
  quantity: number;
  description: string;
  thumbnail_url: string;
  gallery_urls: string[];
  unit: string;
  price: number;
  priority: number;
  status?: string;
  service_product_id?: string;
}

interface AddInventoryScreenProps {
  onBack: () => void;
  onSave?: (item: any) => void;
  /** Edit mode: after confirm, toggle listing active/inactive (parent calls API). */
  onDelete?: (nextActive: boolean) => void | Promise<void>;
  categories: any[];
  storeId?: string;
  productItem?: ProductItem | null;
  packageItem?: PackageItem | null;
}

export const AddInventoryScreen: React.FC<AddInventoryScreenProps> = ({
  onBack,
  onSave,
  onDelete,
  categories,
  storeId,
  productItem,
  packageItem,
}) => {
  const isEditMode = !!(productItem || packageItem);
  const editItem = productItem || packageItem;
  const editItemId = editItem?.id;

  const [type, setType] = useState<ProductType>(
    productItem ? (productItem.type as ProductType) : packageItem ? ProductType.ASSET : ProductType.GOODS
  );
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [thumbnailImage, setThumbnailImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string>("");

  const [galleryImages, setGalleryImages] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const [existingGalleryUrls, setExistingGalleryUrls] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [addMode, setAddMode] = useState<"single" | "bulk">("bulk");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [services, setServices] = useState<any[]>([]);
  const [serviceSearch, setServiceSearch] = useState("");
  const [loadingServices, setLoadingServices] = useState(false);

  const productTypes = [
    {
      value: ProductType.SERVICE,
      label: "Dịch vụ",
      icon: "concierge-bell",
      color: "#3B82F6",
    },
    {
      value: ProductType.GOODS,
      label: "Hàng hóa",
      icon: "box",
      color: "#10B981",
    },
    {
      value: ProductType.ASSET,
      label: "Gói/Tài sản",
      icon: "gift",
      color: "#F59E0B",
    },
  ] as const;

  // Format number with thousand separators
  const formatNumberWithSeparators = (value: string): string => {
    // Remove all non-digit characters
    const numericValue = value.replace(/\D/g, "");
    if (!numericValue) return "";

    // Add thousand separators (Vietnamese format uses dots)
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  useEffect(() => {
    console.log(selectedCategoryIds);
  }, [selectedCategoryIds]);

  // Populate form fields when in edit mode
  useEffect(() => {
    if (isEditMode && editItem) {
      setAddMode("single");
      if (productItem) {
        // Populate product fields
        setName(productItem.name || "");
        setSku(productItem.sku || "");
        setPrice(productItem.price?.toString() || "");
        setPriceDisplay(productItem.price ? formatNumberWithSeparators(productItem.price.toString()) : "");
        setStockQuantity(productItem.stock_quantity?.toString() || "");
        setUnit(productItem.unit || "");
        setDescription(productItem.description || "");
        setExistingThumbnailUrl(productItem.thumbnail_url || "");
        setExistingGalleryUrls(productItem.gallery_urls || []);
        setIsActive(
          productItem.status == null ||
          String(productItem.status).toUpperCase() === "ACTIVE"
        );
        // Note: category_ids might need to be fetched from product details
      } else if (packageItem) {
        // Populate package fields
        setName(packageItem.name || "");
        setPrice(packageItem.price?.toString() || "");
        setPriceDisplay(packageItem.price ? formatNumberWithSeparators(packageItem.price.toString()) : "");
        setStockQuantity(packageItem.quantity?.toString() || "");
        setUnit(packageItem.unit || "");
        setDescription(packageItem.description || "");
        setSelectedServiceId(packageItem.service_product_id || "");
        setExistingThumbnailUrl(packageItem.thumbnail_url || "");
        setExistingGalleryUrls(packageItem.gallery_urls || []);
        setIsActive(
          packageItem.status == null ||
          String(packageItem.status).toUpperCase() === "ACTIVE"
        );
      }
    }
  }, [productItem, packageItem, isEditMode]);

  useEffect(() => {
    if (isEditMode) return;
    if (addMode === "single") {
      setType(ProductType.ASSET);
    }
    if (addMode === "bulk") {
      // Bulk form handles type per-row; keep screen type stable (GOODS) to avoid package-only UI.
      setType(ProductType.GOODS);
    }
  }, [addMode, isEditMode]);

  // Fetch services when type is ASSET
  useEffect(() => {
    if (type === ProductType.ASSET) {
      fetchServices();
    } else {
      if (!isEditMode) {
        setSelectedServiceId("");
      }
      setServices([]);
    }
  }, [type]);

  const fetchServices = async () => {
    if (!storeId) {
      compatAlert("Lỗi", "Vui lòng chọn cửa hàng");
      return;
    }
    try {
      setLoadingServices(true);
      const response = await productService.searchProducts(0, 100, undefined, {
        store_id: storeId,
      });
      const allProducts = response?.data || [];
      // Filter products with type SERVICE
      const serviceProducts = allProducts.filter(
        (product: any) => product.type === ProductType.SERVICE
      );
      setServices(serviceProducts);
    } catch (error: any) {
      console.error("Error fetching services:", error);
      compatAlert("Lỗi", error?.message || "Không thể tải danh sách dịch vụ");
    } finally {
      setLoadingServices(false);
    }
  };

  const filteredServices = useMemo(() => {
    if (!serviceSearch?.trim()) return services || [];
    const keyword = serviceSearch.trim().toLowerCase();
    return (services || []).filter((service: any) => {
      const name = (service?.name || "").toLowerCase();
      return name.includes(keyword);
    });
  }, [services, serviceSearch]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch?.trim()) return categories || [];
    const keyword = categorySearch.trim().toLowerCase();
    return (categories || []).filter((cat: any) => {
      const name = (cat?.name || cat?.title || "").toLowerCase();
      return name.includes(keyword);
    });
  }, [categories, categorySearch]);

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handle price input change
  const handlePriceChange = (text: string) => {
    // Remove all non-digit characters
    const numericValue = text.replace(/\D/g, "");
    setPrice(numericValue);
    setPriceDisplay(formatNumberWithSeparators(numericValue));
  };


  const pickThumbnail = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      compatAlert("Quyền truy cập", "Cần quyền truy cập thư viện ảnh");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setThumbnailImage(result.assets[0]);
    }
  };

  const pickGalleryImages = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      compatAlert("Quyền truy cập", "Cần quyền truy cập thư viện ảnh");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setGalleryImages((prev) => [...prev, ...result.assets]);
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  const handleToggleListingActive = () => {
    if (!onDelete) return;
    const nextActive = !isActive;
    compatAlert(
      nextActive ? "Kích hoạt lại" : "Ngưng hoạt động",
      nextActive
        ? "Bạn có chắc muốn kích hoạt lại mặt hàng này?"
        : "Bạn có chắc muốn ngưng hoạt động? Mặt hàng sẽ ẩn khỏi danh sách hiển thị.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          style: nextActive ? "default" : "destructive",
          onPress: () => {
            void (async () => {
              try {
                await Promise.resolve(onDelete(nextActive));
                setIsActive(nextActive);
              } catch (e: any) {
                compatAlert(
                  "Lỗi",
                  e?.message || "Không thể cập nhật trạng thái mặt hàng"
                );
              }
            })();
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    // keep your existing validation + save logic
    if (!storeId) {
      compatAlert("Lỗi", "Vui lòng chọn cửa hàng");
      return;
    }

    if (!name || !price || !stockQuantity) {
      compatAlert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    if (type !== ProductType.ASSET && !sku) {
      compatAlert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    if (type === ProductType.ASSET && !selectedServiceId) {
      compatAlert("Lỗi", "Vui lòng chọn dịch vụ");
      return;
    }

    // Validation for images - only required in add mode
    if (!isEditMode) {
      if (!thumbnailImage) {
        compatAlert("Lỗi", "Vui lòng chọn ảnh đại diện hoặc thư viện ảnh");
        return;
      }

      if (galleryImages.length === 0) {
        compatAlert("Lỗi", "Vui lòng chọn ít nhất 1 ảnh cho thư viện ảnh");
        return;
      }
    }

    let galleryUrls: string[] = existingGalleryUrls.length > 0 ? [...existingGalleryUrls] : [];
    let thumbnailUrl: string = existingThumbnailUrl || "";

    try {
      // Use staffUpload in edit mode, customerUpload in add mode
      // const uploadMethod = isEditMode ? uploadService.staffUpload : uploadService.customerUpload;
      const uploadMethod = uploadService.staffUpload;
      // Upload new gallery images
      for (const asset of galleryImages) {
        const uploadRes = await uploadMethod({
          uri: asset.uri,
          name:
            asset.fileName || asset.fileName?.split("/").pop() || "gallery.jpg",
          mimeType: asset.mimeType || "image/jpeg",
        });

        console.log("Upload response:", uploadRes);
        const url = uploadRes.data.url;
        galleryUrls.push(url);
      }

      // Upload new thumbnail if selected
      if (thumbnailImage) {
        const uploadRes = await uploadMethod({
          uri: thumbnailImage.uri,
          name:
            thumbnailImage.fileName ||
            thumbnailImage.fileName?.split("/").pop() ||
            "thumbnail.jpg",
          mimeType: thumbnailImage.mimeType || "image/jpeg",
        });
        thumbnailUrl = uploadRes.data.url;
      }
    } catch (e: any) {
      console.log("Error:", e);
      compatAlert("Lỗi", e?.message || "Upload thất bại");
      return;
    }

    try {
      if (type === ProductType.ASSET) {
        if (isEditMode && editItemId) {
          // Update package product
          const updateData: UpdatePackageRequest = {
            name: name,
            price: Number(price),
            quantity: Number(stockQuantity),
            service_product_id: selectedServiceId,
            unit: unit,
            description: description,
            thumbnail_url: thumbnailUrl,
            gallery_urls: galleryUrls,
            priority: 1,
          };
          const res = await packageService.updatePackage(editItemId, updateData);
          console.log("Update package response:", res);
          compatAlert("Thành công", "Cập nhật gói/tài sản thành công");
        } else {
          // Create package product
          const data: CreatePackageRequest = {
            name: name,
            price: Number(price),
            quantity: Number(stockQuantity),
            service_product_id: selectedServiceId,
            store_id: storeId,
            unit: unit,
            description: description,
            thumbnail_url: thumbnailUrl,
            gallery_urls: galleryUrls,
            priority: 1,
          };
          const res = await packageService.createPackage(data);
          console.log("Create package response:", res);
          compatAlert("Thành công", "Thêm gói/tài sản thành công");
        }
      } else {
        if (isEditMode && editItemId) {
          // Update regular product
          const updateData: UpdateProductRequest = {
            name,
            price: Number(price),
            sku: sku.toUpperCase(),
            stock_quantity: Number(stockQuantity),
            type: type.toString(),
            unit: unit,
            category_ids: selectedCategoryIds,
            description: description,
            thumbnail_url: thumbnailUrl,
            gallery_urls: galleryUrls,
            priority: 1,
          };
          const res = await productService.updateProduct(editItemId, updateData);
          console.log("Update product response:", res);
          compatAlert("Thành công", "Cập nhật tiện ích thành công");
        } else {
          // Create regular product
          const res = await productService.addProduct({
            name,
            price: Number(price),
            reserved_quantity: 0,
            sku: sku.toUpperCase(),
            stock_quantity: Number(stockQuantity),
            store_id: storeId,
            type: type.toString(),
            unit: unit,
            category_ids: selectedCategoryIds,
            description: description,
            thumbnail_url: thumbnailUrl,
            gallery_urls: galleryUrls,
            priority: 1,
          });
          console.log("Add product response:", res);
          compatAlert("Thành công", "Thêm tiện ích thành công");
        }
      }
      onBack(); // Navigate back after save
    } catch (e: any) {
      console.log("Error:", e.data?.status_code);
      compatAlert("Lỗi", e?.message || (isEditMode ? "Cập nhật tiện ích thất bại" : "Thêm tiện ích thất bại"));
      return;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="arrow-left" size={16} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? "Chỉnh sửa tiện ích" : "Thêm tiện ích"}
          </Text>
        </View>
        {!(!isEditMode && type === ProductType.GOODS && addMode === "bulk") && (
          <TouchableOpacity onPress={handleSave} activeOpacity={0.7}>
            <Text style={styles.saveButton}>Lưu</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!isEditMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chế độ thêm</Text>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeChip, addMode === "bulk" && styles.modeChipActive]}
                onPress={() => setAddMode("bulk")}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    addMode === "bulk" && styles.modeChipTextActive,
                  ]}
                >
                  Tiện ích
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeChip, addMode === "single" && styles.modeChipActive]}
                onPress={() => setAddMode("single")}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    addMode === "single" && styles.modeChipTextActive,
                  ]}
                >
                  Gói giặt
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!isEditMode && addMode === "bulk" ? (
          <View style={styles.section}>
            <BulkProductsForm
              storeId={storeId}
              categories={categories}
              onDone={onBack}
            />
          </View>
        ) : (
          <>
            {(!isEditMode && addMode === "single") ? null : (
              /* Type Selection (edit mode only, or legacy single product edit) */
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Loại tiện ích <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.typeGrid}>
                  {productTypes
                    .filter((item) => {
                      if (isEditMode && packageItem) return item.value === ProductType.ASSET;
                      if (isEditMode && productItem) return item.value !== ProductType.ASSET;
                      return true;
                    })
                    .map((item) => (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.typeOption,
                        type === item.value && styles.typeOptionActive,
                        isEditMode && packageItem && styles.typeOptionDisabled,
                        { borderColor: type === item.value ? item.color : "#E5E7EB" },
                      ]}
                      onPress={() => {
                        if (isEditMode && packageItem) return;
                        setType(item.value);
                      }}
                      activeOpacity={isEditMode && !!packageItem ? 1 : 0.7}
                      disabled={isEditMode && !!packageItem}
                    >
                      <FontAwesome5
                        name={item.icon}
                        size={24}
                        color={type === item.value ? item.color : "#6B7280"}
                      />
                      <Text
                        style={[
                          styles.typeLabel,
                          type === item.value && { color: item.color },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, styles.flex2]}>
                  <Text style={styles.label}>
                    Tên {productTypes.find((t) => t.value === type)?.label}{" "}
                    <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={
                      type === ProductType.SERVICE
                        ? "VD: Giặt hấp vest"
                        : type === ProductType.ASSET
                          ? "VD: Gói Giặt Tháng"
                          : "VD: Nước giặt Omo 3.6kg"
                    }
                    value={name}
                    onChangeText={setName}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>
                    Số lượng <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: 100"
                    value={stockQuantity}
                    onChangeText={setStockQuantity}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                {type !== ProductType.ASSET && (
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={styles.label}>
                      Mã SKU <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="VD: SVC-001"
                      value={sku}
                      onChangeText={setSku}
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                      editable={!isEditMode}
                    />
                  </View>
                )}

                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>
                    Giá (VNĐ) <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: 50.000"
                    value={priceDisplay}
                    onChangeText={handlePriceChange}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={styles.label}>Đơn vị</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: cái, kg, lít..."
                    value={unit}
                    onChangeText={setUnit}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mô tả</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="VD: Giặt hấp vest"
                  value={description}
                  onChangeText={setDescription}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* {type !== ProductType.ASSET && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Danh mục</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Tìm kiếm danh mục..."
                    value={categorySearch}
                    onChangeText={setCategorySearch}
                    placeholderTextColor="#9CA3AF"
                  />
                  <View style={styles.chipContainer}>
                    {filteredCategories.map((cat: any) => {
                      const id = cat?.id || cat?.uuid || cat?.value;
                      const label = cat?.name || cat?.title || "Danh mục";
                      if (!id) return null;
                      const selected = selectedCategoryIds.includes(id);

                      return (
                        <TouchableOpacity
                          key={id}
                          style={[
                            styles.categoryChip,
                            selected && styles.categoryChipSelected,
                          ]}
                          onPress={() => toggleCategory(id)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              selected && styles.categoryChipTextSelected,
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )} */}
            </View>

            {/* Service Selection - Only for ASSET type */}
            {type === ProductType.ASSET && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Chọn dịch vụ <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tìm kiếm dịch vụ..."
                  value={serviceSearch}
                  onChangeText={setServiceSearch}
                  placeholderTextColor="#9CA3AF"
                />
                {loadingServices ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Đang tải danh sách dịch vụ...</Text>
                  </View>
                ) : (
                  <View style={styles.serviceList}>
                    {filteredServices.map((service: any) => {
                      const id = service?.id || service?.uuid;
                      const serviceName = service?.name || "Dịch vụ";
                      const servicePrice = service?.price || 0;
                      if (!id) return null;
                      const selected = selectedServiceId === id;

                      return (
                        <TouchableOpacity
                          key={id}
                          style={[
                            styles.serviceCard,
                            selected && styles.serviceCardSelected,
                          ]}
                          onPress={() => setSelectedServiceId(id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.serviceCardContent}>
                            <View style={styles.serviceInfo}>
                              <Text
                                style={[
                                  styles.serviceName,
                                  selected && styles.serviceNameSelected,
                                ]}
                              >
                                {serviceName}
                              </Text>
                              {servicePrice > 0 && (
                                <Text style={styles.servicePrice}>
                                  {servicePrice.toLocaleString("vi-VN")} VNĐ
                                </Text>
                              )}
                            </View>
                            {selected && (
                              <FontAwesome5
                                name="check-circle"
                                size={20}
                                color="#2563EB"
                              />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {filteredServices.length === 0 && (
                      <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>
                          Không tìm thấy dịch vụ nào
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Thumbnail Image */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ảnh đại diện</Text>

              {thumbnailImage ? (
                <View style={styles.thumbnailContainer}>
                  <Image
                    source={{ uri: thumbnailImage.uri }}
                    style={styles.thumbnailPreview}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setThumbnailImage(null)}
                    activeOpacity={0.7}
                  >
                    <FontAwesome5 name="times" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : existingThumbnailUrl ? (
                <View style={styles.thumbnailContainer}>
                  <Image
                    source={{ uri: existingThumbnailUrl }}
                    style={styles.thumbnailPreview}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setExistingThumbnailUrl("")}
                    activeOpacity={0.7}
                  >
                    <FontAwesome5 name="times" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={pickThumbnail}
                  activeOpacity={0.7}
                >
                  <FontAwesome5 name="camera" size={24} color="#6B7280" />
                  <Text style={styles.uploadButtonText}>Chọn ảnh đại diện</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Gallery Images */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thư viện ảnh</Text>

              <View style={styles.galleryGrid}>
                {existingGalleryUrls.map((url, index) => (
                  <View key={`existing-${index}`} style={styles.galleryItemContainer}>
                    <Image
                      source={{ uri: url }}
                      style={styles.galleryImage}
                    />
                    <TouchableOpacity
                      style={styles.removeGalleryButton}
                      onPress={() => {
                        setExistingGalleryUrls(existingGalleryUrls.filter((_, i) => i !== index));
                      }}
                      activeOpacity={0.7}
                    >
                      <FontAwesome5 name="times" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {galleryImages.map((asset, index) => (
                  <View key={`new-${index}`} style={styles.galleryItemContainer}>
                    <Image
                      source={{ uri: asset.uri }}
                      style={styles.galleryImage}
                    />
                    <TouchableOpacity
                      style={styles.removeGalleryButton}
                      onPress={() => removeGalleryImage(index)}
                      activeOpacity={0.7}
                    >
                      <FontAwesome5 name="times" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.addGalleryButton}
                  onPress={pickGalleryImages}
                  activeOpacity={0.7}
                >
                  <FontAwesome5 name="plus" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Status */}
            <View style={styles.section}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Trạng thái hoạt động</Text>
                  <Text style={styles.switchHint}>
                    {isActive ? "Hiển thị trong danh sách" : "Ẩn khỏi danh sách"}
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                  thumbColor={isActive ? "#2563EB" : "#F3F4F6"}
                />
              </View>
            </View>

            {/* Info Note */}
            <View style={styles.infoBox}>
              <FontAwesome5
                name="info-circle"
                size={14}
                color="#3B82F6"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.infoText}>
                {type === ProductType.SERVICE &&
                  'Dịch vụ sẽ hiển thị trong mục "Dịch vụ Giặt là"'}
                {type === ProductType.GOODS &&
                  'Hàng hóa sẽ hiển thị trong mục "Mua sắm tiện ích"'}
                {type === ProductType.ASSET &&
                  'Gói/Tài sản sẽ hiển thị trong mục "Tài sản của tôi"'}
              </Text>
            </View>

            {isEditMode && onDelete ? (
              <View style={styles.listingActionSection}>
                <TouchableOpacity
                  style={[
                    styles.listingActionButton,
                    isActive
                      ? styles.listingActionButtonDeactivate
                      : styles.listingActionButtonActivate,
                  ]}
                  onPress={handleToggleListingActive}
                  activeOpacity={0.75}
                >
                  <FontAwesome5
                    name={isActive ? "ban" : "check-circle"}
                    size={16}
                    color={isActive ? "#B91C1C" : "#047857"}
                    style={styles.listingActionIcon}
                  />
                  <Text
                    style={[
                      styles.listingActionButtonText,
                      isActive
                        ? styles.listingActionButtonTextDeactivate
                        : styles.listingActionButtonTextActivate,
                    ]}
                  >
                    {isActive ? "Ngưng hoạt động" : "Kích hoạt lại"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
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
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2563EB",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
  },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modeChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
  },
  modeChipTextActive: {
    color: "#FFFFFF",
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginTop: 16,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  flex2: {
    flex: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 8,
  },
  required: {
    color: "#EF4444",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
  },
  typeGrid: {
    flexDirection: "row",
    gap: 6,
  },
  typeOption: {
    flex: 1,
    aspectRatio: 3,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  typeOptionActive: {
    backgroundColor: "#FFFFFF",
  },
  typeOptionDisabled: {
    opacity: 0.6,
  },
  typeLabel: {
    fontSize: 8,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "600",
    textAlign: "center",
  },
  textArea: {
    height: 80,
    paddingTop: 10,
  },
  hint: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
    fontStyle: "italic",
  },
  uploadButton: {
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButtonText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    fontWeight: "500",
  },
  thumbnailContainer: {
    position: "relative",
    alignSelf: "center",
  },
  thumbnailPreview: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#EF4444",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  galleryItemContainer: {
    position: "relative",
  },
  galleryImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  removeGalleryButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#EF4444",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  addGalleryButton: {
    width: 100,
    height: 100,
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  switchHint: {
    fontSize: 12,
    color: "#6B7280",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  categoryChipSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  categoryChipText: {
    fontSize: 12,
    color: "#4B5563",
    fontWeight: "500",
  },
  categoryChipTextSelected: {
    color: "#FFFFFF",
  },
  infoBox: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    margin: 16,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#1E40AF",
    lineHeight: 18,
  },
  listingActionSection: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    marginTop: 8,
  },
  listingActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  listingActionButtonDeactivate: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  listingActionButtonActivate: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  listingActionIcon: {
    marginRight: 10,
  },
  listingActionButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  listingActionButtonTextDeactivate: {
    color: "#B91C1C",
  },
  listingActionButtonTextActivate: {
    color: "#047857",
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  serviceList: {
    marginTop: 12,
    gap: 8,
  },
  serviceCard: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
  },
  serviceCardSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
    borderWidth: 2,
  },
  serviceCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  serviceNameSelected: {
    color: "#2563EB",
  },
  servicePrice: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
