import { ProductItem } from "@/models/model";
import { formatCurrencyVND } from "@/utils/format";
import { FontAwesome5 } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    BackHandler,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ProductDetailScreenProps {
  product: ProductItem | null;
  loading?: boolean;
  onBack: () => void;
  onAddToCart: (quantity: number) => void;
  onRegisterPackage: (packageId: string) => void;
}

export const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  product,
  loading = false,
  onBack,
  onAddToCart,
  onRegisterPackage,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showPackageConfirmDialog, setShowPackageConfirmDialog] = useState(false);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onBack();
        return true; // Prevent default behavior (exit app)
      }
    );

    return () => backHandler.remove();
  }, [onBack]);

  if (loading || !product) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết sản phẩm</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </View>
    );
  }

  // Combine thumbnail and gallery images
  const allImages = [
    product.thumbnail_url,
    ...(product.gallery_urls || []),
  ].filter(Boolean);

  const handleAddToCart = () => {
    onAddToCart(quantity);
  };

  const handleRegisterPackage = () => {
    if (product.type === "PACKAGE") {
      setShowPackageConfirmDialog(true);
    } else {
      onRegisterPackage(product.id);
    }
  };

  const handleConfirmPackageRegistration = () => {
    setShowPackageConfirmDialog(false);
    onRegisterPackage(product.id);
  };

  const getTypeLabel = (type: string) => {
    return type === "SERVICE" ? "Dịch vụ" : "Hàng hóa";
  };

  const getTypeColor = (type: string) => {
    return type === "SERVICE" ? "#2563EB" : "#059669";
  };

  const getStatusLabel = (status: string) => {
    return status === "ACTIVE" ? "Đang bán" : "Ngừng bán";
  };

  const getStatusColor = (status: string) => {
    return status === "ACTIVE" ? "#059669" : "#6B7280";
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="arrow-left" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết sản phẩm</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Image */}
        <View style={styles.imageSection}>
          <View style={styles.mainImageContainer}>
            {allImages.length > 0 && allImages[selectedImageIndex] ? (
              <Image
                source={{ uri: allImages[selectedImageIndex] }}
                style={styles.mainImage}
                contentFit="contain"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <FontAwesome5 name="image" size={48} color="#D1D5DB" />
              </View>
            )}
          </View>

          {/* Image Gallery Thumbnails */}
          {allImages.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbnailScroll}
              contentContainerStyle={styles.thumbnailScrollContent}
            >
              {allImages.map((imageUrl, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.thumbnail,
                    selectedImageIndex === index && styles.thumbnailActive,
                  ]}
                  onPress={() => setSelectedImageIndex(index)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.thumbnailImage}
                    contentFit="cover"
                  />
                  {selectedImageIndex === index && (
                    <View style={styles.thumbnailOverlay} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          {/* Title & Type */}
          <View style={styles.titleRow}>
            <Text style={styles.productName}>{product.name}</Text>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: `${getTypeColor(product.type)}15` },
              ]}
            >
              <Text
                style={[styles.typeBadgeText, { color: getTypeColor(product.type) }]}
              >
                {getTypeLabel(product.type)}
              </Text>
            </View>
          </View>

          {/* SKU & Status */}
          <View style={styles.metaRow}>
            {product.sku && (
              <View style={styles.metaItem}>
                <FontAwesome5 name="barcode" size={12} color="#6B7280" />
                <Text style={styles.metaText}>SKU: {product.sku}</Text>
              </View>
            )}
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    product.status === "ACTIVE" ? "#ECFDF5" : "#F3F4F6",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(product.status) },
                ]}
              >
                {getStatusLabel(product.status)}
              </Text>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceSection}>
            <Text style={styles.price}>{formatCurrencyVND(product.price)}</Text>
            {product.unit && (
              <Text style={styles.unit}>/ {product.unit}</Text>
            )}
          </View>

          {/* Stock Info */}
          {product.type === "GOODS" && (
            <View style={styles.stockSection}>
              <View style={styles.stockRow}>
                <FontAwesome5 name="box" size={14} color="#6B7280" />
                <Text style={styles.stockLabel}>Tồn kho:</Text>
                <Text style={styles.stockValue}>
                  {product.stock_quantity || 0} {product.unit || "cái"}
                </Text>
              </View>
              {product.reserved_quantity && product.reserved_quantity > 0 && (
                <View style={styles.stockRow}>
                  <FontAwesome5 name="lock" size={14} color="#6B7280" />
                  <Text style={styles.stockLabel}>Đã đặt trước:</Text>
                  <Text style={styles.stockValue}>
                    {product.reserved_quantity} {product.unit || "cái"}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Description */}
          {product.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Mô tả sản phẩm</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          )}

          {/* Additional Info */}
          {/* <View style={styles.additionalInfo}>
            <Text style={styles.sectionTitle}>Thông tin chi tiết</Text>
            
            {product.created_date && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ngày tạo:</Text>
                <Text style={styles.infoValue}>
                  {new Date(product.created_date).toLocaleDateString("vi-VN")}
                </Text>
              </View>
            )}
            
            {product.last_modified_date && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cập nhật:</Text>
                <Text style={styles.infoValue}>
                  {new Date(product.last_modified_date).toLocaleDateString("vi-VN")}
                </Text>
              </View>
            )}

            {product.last_modified_by && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Người cập nhật:</Text>
                <Text style={styles.infoValue}>{product.last_modified_by}</Text>
              </View>
            )}
          </View> */}
        </View>
      </ScrollView>

      {/* Footer - Add to Cart or Register */}
      <View style={styles.footer}>
        {product.type !== "PACKAGE" && (
          <View style={styles.quantityControl}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="minus" size={12} color="#4B5563" />
            </TouchableOpacity>
            <Text style={styles.quantity}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => setQuantity(quantity + 1)}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="plus" size={12} color="#2563EB" />
            </TouchableOpacity>
          </View>
        )}
        <TouchableOpacity
          style={[
            styles.addButton,
            product.type === "PACKAGE" && styles.registerButton
          ]}
          onPress={product.type === "PACKAGE" ? handleRegisterPackage : handleAddToCart}
          activeOpacity={0.8}
        >
          {product.type === "PACKAGE" ? (
            <>
              <FontAwesome5 name="check-circle" size={16} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Đăng kí</Text>
            </>
          ) : (
            <>
              <FontAwesome5 name="shopping-cart" size={16} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Thêm vào giỏ</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Package Registration Confirm Dialog */}
      <Modal
        visible={showPackageConfirmDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPackageConfirmDialog(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowPackageConfirmDialog(false)}>
          <View style={styles.dialogOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.packageDialog}>
                <View style={styles.dialogHeader}>
                  <View style={styles.dialogIconContainer}>
                    <FontAwesome5 name="check-circle" size={24} color="#059669" />
                  </View>
                  <Text style={styles.dialogTitle}>Xác nhận đăng ký gói dịch vụ</Text>
                </View>

                <View style={styles.packageInfoContainer}>
                  <Text style={styles.packageName}>{product.name}</Text>
                  
                  {product.description && (
                    <View style={styles.descriptionContainer}>
                      <Text style={styles.descriptionLabel}>Mô tả:</Text>
                      <Text style={styles.dialogDescriptionText}>{product.description}</Text>
                    </View>
                  )}

                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Giá:</Text>
                    <Text style={styles.priceValue}>{formatCurrencyVND(product.price || 0)}</Text>
                  </View>
                </View>

                <View style={styles.dialogActions}>
                  <TouchableOpacity
                    style={styles.dialogCancelButton}
                    onPress={() => setShowPackageConfirmDialog(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dialogCancelButtonText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dialogConfirmButton}
                    onPress={handleConfirmPackageRegistration}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dialogConfirmButtonText}>Xác nhận</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerPlaceholder: {
    width: 36,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  imageSection: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 16,
  },
  mainImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailScroll: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  thumbnailScrollContent: {
    gap: 8,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
    position: "relative",
  },
  thumbnailActive: {
    borderColor: "#2563EB",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(37, 99, 235, 0.1)",
  },
  infoSection: {
    backgroundColor: "#FFFFFF",
    marginTop: 8,
    padding: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  productName: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginRight: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  priceSection: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2563EB",
  },
  unit: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
  },
  stockSection: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stockLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  stockValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  descriptionSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 22,
  },
  additionalInfo: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  footer: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 16,
  },
  quantityButton: {
    width: 28,
    height: 28,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quantity: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    minWidth: 24,
    textAlign: "center",
  },
  addButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#BFDBFE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButton: {
    backgroundColor: "#059669",
    shadowColor: "#6EE7B7",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  packageDialog: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dialogHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  dialogIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
  },
  packageInfoContainer: {
    marginBottom: 24,
  },
  packageName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
    textAlign: "center",
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  dialogDescriptionText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#059669",
  },
  dialogActions: {
    flexDirection: "row",
    gap: 12,
  },
  dialogCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dialogCancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  dialogConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#059669",
  },
  dialogConfirmButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
