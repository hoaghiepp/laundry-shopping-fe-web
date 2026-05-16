import { IncidentType, SecureStoreKeys } from "@/constants/enum";
import { factoryService } from "@/services/api/factoryService";
import { uploadService } from "@/services/api/uploadService";
import { FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "@/lib/secureStorage";
import React, { useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export interface IncidentReport {
  description: string;
  images: ImagePicker.ImagePickerAsset[];
  image_urls: string[];
}

interface IncidentReportSectionProps {
  orderId: string;
  orderCode: string;
  customerId?: string;
  trackingId?: string;
  incidentType?: IncidentType;
  onReportSubmit?: (report: IncidentReport) => void;
}

export const IncidentReportSection: React.FC<IncidentReportSectionProps> = ({
  orderId,
  orderCode,
  customerId,
  trackingId,
  incidentType: defaultIncidentType,
  onReportSubmit,
}) => {
  const [showReportForm, setShowReportForm] = useState(false);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [selectedType, setSelectedType] = useState<IncidentType>(
    defaultIncidentType || IncidentType.TEAR
  );

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    return {
      camera: cameraPermission.granted,
      media: mediaPermission.granted,
    };
  };

  const handleImageSelect = async (source: "camera" | "gallery") => {
    const permissions = await requestPermissions();

    if (source === "camera" && !permissions.camera) {
      Alert.alert(
        "Cần quyền truy cập",
        "Cần quyền truy cập camera để chụp ảnh"
      );
      return;
    }

    if (source === "gallery" && !permissions.media) {
      Alert.alert(
        "Cần quyền truy cập",
        "Cần quyền truy cập thư viện ảnh để chọn ảnh"
      );
      return;
    }

    try {
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              quality: 0.8,
            });

      if (!result.canceled && result.assets[0]) {
        setImages((prev) => [...prev, result.assets[0]]);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh. Vui lòng thử lại.");
    }
  };

  const showImagePicker = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Hủy", "Chụp ảnh", "Chọn từ thư viện"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleImageSelect("camera");
          } else if (buttonIndex === 2) {
            handleImageSelect("gallery");
          }
        }
      );
    } else {
      Alert.alert("Chọn ảnh", "Bạn muốn chụp ảnh hay chọn từ thư viện?", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Chụp ảnh",
          onPress: () => handleImageSelect("camera"),
        },
        {
          text: "Chọn từ thư viện",
          onPress: () => handleImageSelect("gallery"),
        },
      ]);
    }
  };

  const removeImage = (index: number) => {
    Alert.alert("Xác nhận xóa", "Bạn có chắc muốn xóa ảnh này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => {
          setImages((prev) => prev.filter((_, i) => i !== index));
        },
      },
    ]);
  };

  const handleReportSubmit = async () => {
    // Validation
    if (!description.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng mô tả chi tiết sự cố");
      return;
    }

    if (images.length === 0) {
      Alert.alert("Thiếu hình ảnh", "Vui lòng thêm ít nhất 1 ảnh minh chứng", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Tiếp tục",
          onPress: () => submitReport(),
        },
      ]);
      return;
    }

    submitReport();
  };

  const submitReport = async () => {
    try {
      setSubmitting(true);
      setUploadProgress("Đang chuẩn bị...");

      // Validate required fields
      if (!customerId) {
        throw new Error("Thiếu thông tin khách hàng");
      }
      
      if (!trackingId) {
        throw new Error("Thiếu mã theo dõi (tracking ID)");
      }

      // Get authentication token
      const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
      if (!token) {
        throw new Error("Không tìm thấy token đăng nhập");
      }

      // Upload all images and collect URLs
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        setUploadProgress(`Đang tải ảnh ${i + 1}/${images.length}...`);
        
        try {
          const uploadResult = await uploadService.staffUpload({
            uri: image.uri,
            name: `incident_${trackingId}_${Date.now()}_${i}.jpg`,
          });
          
          // Extract URL from upload response
          // Adjust based on actual API response structure
          const imageUrl = uploadResult?.data?.url || uploadResult?.url;
          console.log("Image URL:", imageUrl);
          if (imageUrl) {
            imageUrls.push(imageUrl);
          } else {
            console.warn("No URL in upload response:", uploadResult);
          }
        } catch (uploadError) {
          console.error(`Error uploading image ${i + 1}:`, uploadError);
          throw new Error(`Không thể tải ảnh ${i + 1}`);
        }
      }

      if (imageUrls.length === 0 && images.length > 0) {
        throw new Error("Không thể tải ảnh lên. Vui lòng thử lại.");
      }

      setUploadProgress("Đang gửi báo cáo...");

      // Submit incident report to API
      const incidentData = {
        customer_id: customerId,
        tracking_id: trackingId,
        type: selectedType,
        image_urls: imageUrls,
        description: description.trim(),
      };

      console.log("Submitting incident report:", incidentData);
      
      const response = await factoryService.reportIncident(incidentData);
      
      console.log("Incident report submitted successfully:", response);

      // Create report object for callback
      const report: IncidentReport = {
        description: description.trim(),
        images,
        image_urls: imageUrls,
      };

      if (onReportSubmit) {
        onReportSubmit(report);
      }

      // Small delay to ensure UI updates
      setTimeout(() => {
        Alert.alert("Thành công", "Đã gửi báo cáo sự cố", [
          {
            text: "OK",
            onPress: () => {
              // Reset form
              setDescription("");
              setImages([]);
              setShowReportForm(false);
              setUploadProgress("");
            },
          },
        ]);
      }, 100);
    } catch (error: any) {
      console.error("Error submitting report:", error);
      Alert.alert(
        "Lỗi",
        error.message || "Không thể gửi báo cáo. Vui lòng thử lại."
      );
    } finally {
      setSubmitting(false);
      setUploadProgress("");
    }
  };

  return (
    <View style={styles.reportSection}>
      <Pressable
        style={styles.reportSectionHeader}
        onPress={() => setShowReportForm(!showReportForm)}
      >
        <View style={styles.reportSectionHeaderLeft}>
          <FontAwesome5
            name="exclamation-triangle"
            size={18}
            color="#ef4444"
          />
          <Text style={styles.reportSectionTitle}>Báo cáo sự cố</Text>
        </View>
        <FontAwesome5
          name={showReportForm ? "chevron-up" : "chevron-down"}
          size={16}
          color="#6B7280"
        />
      </Pressable>

      {showReportForm && (
        <View style={styles.reportFormContainer}>
          {/* Warning Banner */}
          <View style={styles.warningBanner}>
            <FontAwesome5 name="exclamation-circle" size={18} color="#DC2626" />
            <Text style={styles.warningText}>
              Vui lòng báo cáo chính xác và cung cấp hình ảnh minh chứng rõ ràng
            </Text>
          </View>

          {/* Incident Type Selector */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>
              Loại sự cố <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.typeSelector}>
              <Pressable
                style={[
                  styles.typeOption,
                  selectedType === IncidentType.TEAR &&
                    styles.typeOptionSelected,
                ]}
                onPress={() => setSelectedType(IncidentType.TEAR)}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    selectedType === IncidentType.TEAR &&
                      styles.typeOptionTextSelected,
                  ]}
                >
                  Rách/Hỏng
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.typeOption,
                  selectedType === IncidentType.COLOR_FADE &&
                    styles.typeOptionSelected,
                ]}
                onPress={() => setSelectedType(IncidentType.COLOR_FADE)}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    selectedType === IncidentType.COLOR_FADE &&
                      styles.typeOptionTextSelected,
                  ]}
                >
                  Phai màu
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.typeOption,
                  selectedType === IncidentType.LOST &&
                    styles.typeOptionSelected,
                ]}
                onPress={() => setSelectedType(IncidentType.LOST)}
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    selectedType === IncidentType.LOST &&
                      styles.typeOptionTextSelected,
                  ]}
                >
                  Mất hàng
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Description Input */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>
              Mô tả sự cố <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Mô tả chi tiết sự cố: vị trí, mức độ, nguyên nhân..."
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.charCount}>{description.length}/1000 ký tự</Text>
          </View>

          {/* Images Section */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>
              Hình ảnh minh chứng <Text style={styles.required}>*</Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imagesScrollContent}
              style={styles.imageZone}
            >
              {/* Existing Images */}
              {images.map((image, index) => (
                <View key={index} style={styles.imageItemWrapper}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.imagePreview}
                  />
                  <Pressable
                    style={styles.imageRemoveButton}
                    onPress={() => removeImage(index)}
                  >
                    <FontAwesome5 name="times" size={10} color="#fff" />
                  </Pressable>
                  <View style={styles.imageNumber}>
                    <Text style={styles.imageNumberText}>{index + 1}</Text>
                  </View>
                </View>
              ))}

              {/* Add Image Button */}
              <View style={styles.addImageItemWrapper}>
                <Pressable
                  style={({ pressed }) => [
                    styles.addImageItem,
                    pressed && styles.addImageItemPressed,
                  ]}
                  onPress={showImagePicker}
                >
                  <View style={styles.addImageItemContent}>
                    <FontAwesome5 name="plus" size={22} color="#9CA3AF" />
                    <Text style={styles.addImageItemText}>Thêm ảnh</Text>
                  </View>
                </Pressable>
              </View>
            </ScrollView>
          </View>

          {/* Guidelines */}
          <View style={styles.guidelinesCard}>
            <View style={styles.guidelinesHeader}>
              <FontAwesome5 name="info-circle" size={14} color="#2563EB" />
              <Text style={styles.guidelinesTitle}>Hướng dẫn:</Text>
            </View>
            <View style={styles.guidelinesList}>
              <View style={styles.guidelineItem}>
                <Text style={styles.guidelineBullet}>•</Text>
                <Text style={styles.guidelineText}>
                  Chụp ảnh rõ nét, đủ ánh sáng
                </Text>
              </View>
              <View style={styles.guidelineItem}>
                <Text style={styles.guidelineBullet}>•</Text>
                <Text style={styles.guidelineText}>
                  Chụp cận cảnh vị trí hư hỏng
                </Text>
              </View>
              <View style={styles.guidelineItem}>
                <Text style={styles.guidelineBullet}>•</Text>
                <Text style={styles.guidelineText}>
                  Mô tả chi tiết và cụ thể
                </Text>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.submitButtonContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed && styles.submitButtonPressed,
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleReportSubmit}
              disabled={submitting}
            >
              <View style={styles.submitButtonContent}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <FontAwesome5 name="paper-plane" size={16} color="#fff" />
                )}
                <Text style={styles.submitButtonText}>
                  {submitting
                    ? uploadProgress || "Đang gửi báo cáo..."
                    : "Gửi báo cáo"}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  reportSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  reportSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FEF2F2",
    borderBottomWidth: 1,
    borderBottomColor: "#FEE2E2",
  },
  reportSectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reportSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#DC2626",
  },
  reportFormContainer: {
    padding: 16,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: "#991B1B",
    fontWeight: "600",
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  required: {
    color: "#DC2626",
  },
  descriptionInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    fontSize: 14,
    color: "#1F2937",
    minHeight: 120,
  },
  charCount: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 4,
  },
  imageZone: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#BFDBFE",
    backgroundColor: "#F8FAFF",
    paddingVertical: 12,
    flexGrow: 0,
  },
  imagesScrollContent: {
    gap: 12,
    paddingHorizontal: 12,
  },
  imageItemWrapper: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  imageRemoveButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  imageNumber: {
    position: "absolute",
    bottom: 4,
    left: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageNumberText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  addImageItemWrapper: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  addImageItem: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#9CA3AF",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  addImageItemPressed: {
    backgroundColor: "#F9FAFB",
    borderColor: "#9CA3AF",
  },
  addImageItemContent: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  addImageItemText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "bold",
  },
  guidelinesCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  guidelinesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  guidelinesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E40AF",
  },
  guidelinesList: {
    gap: 4,
  },
  guidelineItem: {
    flexDirection: "row",
    gap: 8,
  },
  guidelineBullet: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "700",
  },
  guidelineText: {
    flex: 1,
    fontSize: 12,
    color: "#1E40AF",
  },
  submitButtonContainer: {
    backgroundColor: "#2563eb",
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "column",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  submitButtonPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
    backgroundColor: "#B91C1C",
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
    shadowOpacity: 0.2,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  typeSelector: {
    flexDirection: "row",
    gap: 8,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
  },
  typeOptionSelected: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  typeOptionTextSelected: {
    color: "#DC2626",
    fontWeight: "700",
  },
});


