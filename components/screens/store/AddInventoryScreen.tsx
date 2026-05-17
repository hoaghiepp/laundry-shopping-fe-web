import { AddInventoryEmbeddedPanel } from "@/components/screens/store/AddInventoryEmbeddedPanel";
import { BulkProductsForm } from "@/components/screens/store/components/BulkProductsForm";
import { ProductType } from "@/constants/enum";
import { STORE_WEB_NAV_HEIGHT } from "@/constants/storeWebLayout";
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
  Platform,
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
  /** Side panel under store header + web nav (store-home). */
  embedded?: boolean;
}

type FormSnapshot = {
  type: ProductType;
  name: string;
  sku: string;
  price: string;
  stockQuantity: string;
  unit: string;
  description: string;
  selectedServiceId: string;
  existingThumbnailUrl: string;
  existingGalleryUrls: string[];
  selectedCategoryIds: string[];
};

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function snapshotFromProduct(product: ProductItem): FormSnapshot {
  return {
    type: product.type as ProductType,
    name: product.name || "",
    sku: product.sku || "",
    price: product.price?.toString() || "",
    stockQuantity: product.stock_quantity?.toString() || "",
    unit: product.unit || "",
    description: product.description || "",
    selectedServiceId: "",
    existingThumbnailUrl: product.thumbnail_url || "",
    existingGalleryUrls: [...(product.gallery_urls || [])],
    selectedCategoryIds: [],
  };
}

function snapshotFromPackage(pkg: PackageItem): FormSnapshot {
  return {
    type: ProductType.ASSET,
    name: pkg.name || "",
    sku: "",
    price: pkg.price?.toString() || "",
    stockQuantity: pkg.quantity?.toString() || "",
    unit: pkg.unit || "",
    description: pkg.description || "",
    selectedServiceId: pkg.service_product_id || "",
    existingThumbnailUrl: pkg.thumbnail_url || "",
    existingGalleryUrls: [...(pkg.gallery_urls || [])],
    selectedCategoryIds: [],
  };
}

export const AddInventoryScreen: React.FC<AddInventoryScreenProps> = ({
  onBack,
  onSave,
  onDelete,
  categories,
  storeId,
  productItem,
  packageItem,
  embedded = false,
}) => {
  const isEditMode = !!(productItem || packageItem);
  const sectionStyle = embedded ? styles.sectionEmbedded : styles.section;
  const sectionTitleStyle = embedded ? styles.sectionTitleEmbedded : styles.sectionTitle;
  const inputStyle = embedded ? [styles.input, styles.inputEmbedded] : styles.input;
  const labelStyle = embedded ? [styles.label, styles.labelEmbedded] : styles.label;
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

  const showSaveButton =
    !(!isEditMode && type === ProductType.GOODS && addMode === "bulk");

  const initialFormSnapshot = useMemo((): FormSnapshot | null => {
    if (productItem) return snapshotFromProduct(productItem);
    if (packageItem) return snapshotFromPackage(packageItem);
    return null;
  }, [productItem, packageItem]);

  const isDirty = useMemo(() => {
    if (!showSaveButton) return false;

    if (!isEditMode) {
      return !!(
        name.trim() ||
        sku.trim() ||
        price.trim() ||
        stockQuantity.trim() ||
        unit.trim() ||
        description.trim() ||
        selectedServiceId ||
        thumbnailImage ||
        galleryImages.length > 0
      );
    }

    if (!initialFormSnapshot) return false;
    const initial = initialFormSnapshot;

    if (type !== initial.type) return true;
    if (name.trim() !== initial.name) return true;
    if (sku.trim() !== initial.sku) return true;
    if (price.trim() !== initial.price) return true;
    if (stockQuantity.trim() !== initial.stockQuantity) return true;
    if (unit.trim() !== initial.unit) return true;
    if (description.trim() !== initial.description) return true;
    if (selectedServiceId !== initial.selectedServiceId) return true;
    if (thumbnailImage) return true;
    if (galleryImages.length > 0) return true;
    if (existingThumbnailUrl !== initial.existingThumbnailUrl) return true;
    if (!arraysEqual(existingGalleryUrls, initial.existingGalleryUrls)) return true;
    if (!arraysEqual(selectedCategoryIds, initial.selectedCategoryIds)) return true;

    return false;
  }, [
    showSaveButton,
    isEditMode,
    initialFormSnapshot,
    type,
    name,
    sku,
    price,
    stockQuantity,
    unit,
    description,
    selectedServiceId,
    thumbnailImage,
    galleryImages.length,
    existingThumbnailUrl,
    existingGalleryUrls,
    selectedCategoryIds,
  ]);

  const canSave = isDirty;

  const useEmbeddedCompact =
    embedded && showSaveButton && !(!isEditMode && type === ProductType.GOODS && addMode === "bulk");

  return (
    <View style={[styles.container, embedded && styles.containerEmbedded]}>
      <View style={[styles.header, embedded && styles.headerEmbedded]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={[styles.backButton, embedded && styles.backButtonEmbedded]}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="arrow-left" size={16} color="#6B7280" />
          </TouchableOpacity>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.headerTitle, embedded && styles.headerTitleEmbedded]} numberOfLines={1}>
              {isEditMode ? "Chỉnh sửa tiện ích" : "Thêm tiện ích"}
            </Text>
            {embedded && !useEmbeddedCompact && (
              <Text style={styles.headerSubtitle} numberOfLines={2}>
                {isDirty
                  ? "Có thay đổi chưa lưu — nhấn Lưu để cập nhật"
                  : "Chỉnh sửa thông tin, sau đó lưu"}
              </Text>
            )}
            {useEmbeddedCompact && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {isDirty ? "Có thay đổi chưa lưu" : "Chỉnh sửa và lưu"}
              </Text>
            )}
          </View>
        </View>
        {showSaveButton && !embedded && (
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={canSave ? 0.7 : 1}
            disabled={!canSave}
            style={[styles.saveButtonWrap, !canSave && styles.saveButtonWrapDisabled]}
          >
            <Text style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}>Lưu</Text>
          </TouchableOpacity>
        )}
      </View>

      {useEmbeddedCompact ? (
        <AddInventoryEmbeddedPanel
          isEditMode={isEditMode}
          productItem={productItem}
          packageItem={packageItem}
          type={type}
          setType={setType}
          productTypes={productTypes}
          name={name}
          setName={setName}
          stockQuantity={stockQuantity}
          setStockQuantity={setStockQuantity}
          sku={sku}
          setSku={setSku}
          priceDisplay={priceDisplay}
          handlePriceChange={handlePriceChange}
          unit={unit}
          setUnit={setUnit}
          description={description}
          setDescription={setDescription}
          thumbnailImage={thumbnailImage}
          existingThumbnailUrl={existingThumbnailUrl}
          setThumbnailImage={setThumbnailImage}
          setExistingThumbnailUrl={setExistingThumbnailUrl}
          pickThumbnail={pickThumbnail}
          galleryImages={galleryImages}
          existingGalleryUrls={existingGalleryUrls}
          removeGalleryImage={removeGalleryImage}
          setExistingGalleryUrls={setExistingGalleryUrls}
          pickGalleryImages={pickGalleryImages}
          isActive={isActive}
          setIsActive={setIsActive}
          showListingToggle={!!(isEditMode && onDelete)}
          onToggleListing={isEditMode && onDelete ? handleToggleListingActive : undefined}
          serviceSearch={serviceSearch}
          setServiceSearch={setServiceSearch}
          filteredServices={filteredServices}
          selectedServiceId={selectedServiceId}
          setSelectedServiceId={setSelectedServiceId}
          loadingServices={loadingServices}
        />
      ) : (
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          embedded && styles.scrollContentEmbedded,
          embedded && showSaveButton && styles.scrollContentWithFooter,
        ]}
        showsVerticalScrollIndicator={embedded}
      >
        <View style={embedded ? styles.webPanelBody : undefined}>
        {!isEditMode && (
          <View style={sectionStyle}>
            <Text style={sectionTitleStyle}>Chế độ thêm</Text>
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
          <View style={sectionStyle}>
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
              <View style={sectionStyle}>
                <Text style={sectionTitleStyle}>
                  Loại tiện ích <Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.typeGrid, embedded && styles.typeGridEmbedded]}>
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
                        embedded && styles.typeOptionEmbedded,
                        type === item.value && styles.typeOptionActive,
                        embedded && type === item.value && styles.typeOptionEmbeddedActive,
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
                          embedded && styles.typeLabelEmbedded,
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
            <View style={sectionStyle}>
              <Text style={sectionTitleStyle}>Thông tin cơ bản</Text>

              <View style={[styles.inputRow, embedded && styles.inputRowEmbedded]}>
                <View style={[styles.inputGroup, styles.flex2]}>
                  <Text style={labelStyle}>
                    Tên {productTypes.find((t) => t.value === type)?.label}{" "}
                    <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={inputStyle}
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
                  <Text style={labelStyle}>
                    Số lượng <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="VD: 100"
                    value={stockQuantity}
                    onChangeText={setStockQuantity}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={[styles.inputRow, embedded && styles.inputRowEmbedded]}>
                {type !== ProductType.ASSET && (
                  <View style={[styles.inputGroup, styles.flex1]}>
                    <Text style={labelStyle}>
                      Mã SKU <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={inputStyle}
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
                  <Text style={labelStyle}>
                    Giá (VNĐ) <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="VD: 50.000"
                    value={priceDisplay}
                    onChangeText={handlePriceChange}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={[styles.inputRow, embedded && styles.inputRowEmbedded]}>
                <View style={[styles.inputGroup, styles.flex1]}>
                  <Text style={labelStyle}>Đơn vị</Text>
                  <TextInput
                    style={inputStyle}
                    placeholder="VD: cái, kg, lít..."
                    value={unit}
                    onChangeText={setUnit}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={labelStyle}>Mô tả</Text>
                <TextInput
                  style={[styles.input, embedded && styles.inputEmbedded, styles.textArea]}
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
              <View style={sectionStyle}>
                <Text style={sectionTitleStyle}>
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
            <View style={sectionStyle}>
              <Text style={sectionTitleStyle}>Ảnh đại diện</Text>

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
            <View style={sectionStyle}>
              <Text style={sectionTitleStyle}>Thư viện ảnh</Text>

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
            <View style={sectionStyle}>
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
            <View style={[styles.infoBox, embedded && styles.infoBoxEmbedded]}>
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
              <View style={[styles.listingActionSection, embedded && styles.listingActionSectionEmbedded]}>
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
        </View>
      </ScrollView>
      )}

      {embedded && showSaveButton && (
        <View style={styles.embeddedFooter}>
          <TouchableOpacity
            style={[styles.embeddedSaveBtn, !canSave && styles.embeddedSaveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={canSave ? 0.88 : 1}
          >
            <FontAwesome5 name="check" size={15} color="#FFFFFF" />
            <Text style={styles.embeddedSaveBtnText}>
              {isEditMode ? "Lưu thay đổi" : "Lưu"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  containerEmbedded: {
    backgroundColor: "#F3F4F6",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 40,
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
  headerEmbedded: {
    paddingTop: STORE_WEB_NAV_HEIGHT + 6,
    paddingBottom: 8,
    paddingHorizontal: 12,
    flexShrink: 0,
    zIndex: 20,
    backgroundColor: "#FFFFFF",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
    marginTop: 2,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonEmbedded: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  headerTitleEmbedded: {
    fontSize: 15,
    flexShrink: 1,
  },
  saveButtonWrap: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    marginLeft: 8,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2563EB",
  },
  saveButtonWrapDisabled: {
    backgroundColor: "#F3F4F6",
    opacity: 0.85,
  },
  saveButtonDisabled: {
    color: "#9CA3AF",
  },
  embeddedFooter: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    ...Platform.select({
      web: {
        boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  embeddedSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
  },
  embeddedSaveBtnDisabled: {
    backgroundColor: "#93C5FD",
    opacity: 0.65,
  },
  embeddedSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  scrollContentEmbedded: {
    paddingBottom: 20,
  },
  scrollContentWithFooter: {
    paddingBottom: 88,
  },
  webPanelBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 12,
    maxWidth: "100%",
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
  sectionEmbedded: {
    backgroundColor: "#FFFFFF",
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...Platform.select({
      web: {
        boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionTitleEmbedded: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
  inputEmbedded: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 11,
    fontSize: 14,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      } as object,
      default: {},
    }),
  },
  labelEmbedded: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 6,
  },
  inputRowEmbedded: {
    flexDirection: "column",
    gap: 0,
  },
  typeGrid: {
    flexDirection: "row",
    gap: 6,
  },
  typeGridEmbedded: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  typeOptionEmbedded: {
    flex: 0,
    flexGrow: 1,
    flexBasis: "30%",
    aspectRatio: undefined,
    minHeight: 44,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  typeOptionEmbeddedActive: {
    backgroundColor: "#EFF6FF",
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
  typeLabelEmbedded: {
    fontSize: 11,
    marginTop: 4,
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
  infoBoxEmbedded: {
    margin: 0,
    marginBottom: 0,
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
  listingActionSectionEmbedded: {
    paddingHorizontal: 0,
    paddingBottom: 8,
    marginTop: 0,
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
