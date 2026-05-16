import { CitySelector } from "@/components/address/CitySelector";
import { DistrictSelector } from "@/components/address/DistrictSelector";
import { WardSelector } from "@/components/address/WardSelector";
import { SecureStoreKeys } from "@/constants/enum";
import {
  storeMainContentMarginBottom,
  storeMainContentPaddingTop,
} from "@/constants/storeWebLayout";
import { compatAlert } from "@/lib/compatAlert";
import { staffService } from "@/services/api";
import { CreateAddressRequest, StoreAddress, StoreInfo, storeService, UpdateStoreRequest } from "@/services/api/storeService";
import { formatDateTimeVN } from "@/utils/format";
import { clearCustomerOrderTokens } from "@/lib/tokenStore";
import { clearGlobalUserRole, isAdmin } from "@/utils/globalState";
import { resetOrientationToPortrait } from "@/utils/orientation";
import { FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import * as SecureStore from "@/lib/secureStorage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface StoreProfileScreenProps {
  storeId?: string;
  onBack?: () => void;
  onCustomerList?: () => void;
  onChangePassword?: () => void;
}

export const StoreProfileScreen: React.FC<StoreProfileScreenProps> = ({
  storeId,
  onBack,
  onCustomerList,
  onChangePassword,
}) => {
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [userInfoExpanded, setUserInfoExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedStoreName, setEditedStoreName] = useState("");
  const [editedPhoneNumber, setEditedPhoneNumber] = useState("");
  const [editedAddressDetail, setEditedAddressDetail] = useState("");
  const [editedWard, setEditedWard] = useState("");
  const [editedDistrict, setEditedDistrict] = useState("");
  const [editedProvince, setEditedProvince] = useState("");
  const [editedWardId, setEditedWardId] = useState<string | number | null>(null);
  const [editedDistrictId, setEditedDistrictId] = useState<string | number | null>(null);
  const [editedProvinceId, setEditedProvinceId] = useState<string | number | null>(null);

  useEffect(() => {
    fetchUserProfile();

    if (!storeId) {
      setStoreInfo(null);
      setIsEditing(false);
      setLoading(false);
      return;
    }

    fetchStoreProfile(storeId);
  }, [storeId]);

  const fetchUserProfile = async () => {
    try {
      const response = isAdmin()
        ? await staffService.getAdminProfile()
        : await staffService.getStaffProfile();
      console.log("User profile response:", response);
      setUserInfo(response.data);
    } catch (error: any) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  const fetchStoreProfile = async (id: string) => {
    try {
      setLoading(true);
      const response = await storeService.getStoreProfile(id);
      if (response?.data) {
        setStoreInfo(response.data);
        // Initialize edit fields
        setEditedStoreName(response.data.name || "");
        setEditedPhoneNumber(response.data.phone_number || "");
        if (typeof response.data.address !== 'string' && response.data.address) {
          const addr = response.data.address as StoreAddress;
          setEditedAddressDetail(addr.address_detail || "");
          setEditedWard(addr.ward || "");
          setEditedDistrict(addr.district || "");
          setEditedProvince(addr.province || "");
          setEditedProvinceId(addr.province_id ?? null);
          setEditedDistrictId(addr.district_id ?? null);
          setEditedWardId(addr.ward_id ?? null);
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch store profile:", error);
      // Set mock data if API fails
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original values
    if (storeInfo) {
      setEditedStoreName(storeInfo.name || "");
      setEditedPhoneNumber(storeInfo.phone_number || "");
      if (typeof storeInfo.address !== 'string' && storeInfo.address) {
        const addr = storeInfo.address as StoreAddress;
        setEditedAddressDetail(addr.address_detail || "");
        setEditedWard(addr.ward || "");
        setEditedDistrict(addr.district || "");
        setEditedProvince(addr.province || "");
        setEditedProvinceId(addr.province_id ?? null);
        setEditedDistrictId(addr.district_id ?? null);
        setEditedWardId(addr.ward_id ?? null);
      }
    }
  };

  const handleSave = async () => {
    if (!storeId || !storeInfo) return;

    try {
      setSaving(true);
      const updateData: UpdateStoreRequest = {
        name: editedStoreName.trim(),
        phone_number: editedPhoneNumber.trim(),
      };

      // Handle address if it's an object
      if (typeof storeInfo.address !== 'string' && storeInfo.address) {
        const addr = storeInfo.address as StoreAddress;
        const addressData: CreateAddressRequest = {
          address_detail: editedAddressDetail.trim(),
          ward: editedWard.trim(),
          ward_id: Number(editedWardId ?? addr.ward_id),
          district: editedDistrict.trim(),
          district_id: Number(editedDistrictId ?? addr.district_id),
          province: editedProvince.trim(),
          province_id: Number(editedProvinceId ?? addr.province_id),
        };
        await storeService.updateAddress(storeId, addr.id, addressData);
      }

      console.log('updateData', updateData);
      await storeService.updateStore(storeId, updateData);

      // Refresh store profile
      await fetchStoreProfile(storeId);

      setIsEditing(false);
      compatAlert("Thành công", "Đã cập nhật thông tin cửa hàng");
    } catch (error: any) {
      console.error("Failed to save store profile:", error);
      compatAlert("Lỗi", error?.message || "Không thể cập nhật thông tin cửa hàng");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    compatAlert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        onPress: async () => {
          try {
            // Clear tokens
            await SecureStore.deleteItemAsync(SecureStoreKeys.LOGIN_TOKEN);
            await SecureStore.deleteItemAsync(SecureStoreKeys.REFRESH_TOKEN);

            // Clear "Remember Me" settings
            await SecureStore.deleteItemAsync(
              SecureStoreKeys.REMEMBER_ME_ENABLED
            );
            await SecureStore.deleteItemAsync(
              SecureStoreKeys.REMEMBER_ME_EMAIL
            );
            await SecureStore.deleteItemAsync(
              SecureStoreKeys.REMEMBER_ME_PASSWORD
            );
            await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_ROLE);

            // Clear global user role and customer order tokens
            clearGlobalUserRole();
            await clearCustomerOrderTokens();

            // Reset orientation to portrait on logout
            await resetOrientationToPortrait();

            router.replace("/login");
          } catch (error) {
            console.error("Error during logout:", error);
            // Still navigate to login even if clearing fails
            router.replace("/login");
          }
        },
        style: "destructive",
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Store Information Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Thông tin cửa hàng</Text>
            {isAdmin() && !isEditing && (
              <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
                <FontAwesome5 name="edit" size={14} color="#2563EB" />
                <Text style={styles.editButtonText}>Chỉnh sửa</Text>
              </TouchableOpacity>
            )}
            {isAdmin() && isEditing && (
              <View style={styles.editActions}>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={[styles.actionButton, styles.cancelButton]}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  style={[styles.actionButton, styles.saveButton]}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <FontAwesome5 name="check" size={12} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>Lưu</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <FontAwesome5 name="store" size={16} color="#2563EB" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tên cửa hàng</Text>
              {isEditing && isAdmin() ? (
                <TextInput
                  style={styles.input}
                  value={editedStoreName}
                  onChangeText={setEditedStoreName}
                  placeholder="Nhập tên cửa hàng"
                  placeholderTextColor="#9CA3AF"
                />
              ) : (
                <Text style={styles.infoValue}>{storeInfo?.name || "N/A"}</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <FontAwesome5 name="map-marker-alt" size={16} color="#2563EB" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Địa chỉ</Text>
              {isEditing && isAdmin() && typeof storeInfo?.address !== 'string' && storeInfo?.address ? (
                <View style={styles.addressInputs}>
                  <TextInput
                    style={styles.input}
                    value={editedAddressDetail}
                    onChangeText={setEditedAddressDetail}
                    placeholder="Số nhà, đường"
                    placeholderTextColor="#9CA3AF"
                  />
                  <CitySelector
                    value={editedProvinceId}
                    cityName={editedProvince}
                    onSelect={(id, name) => {
                      setEditedProvinceId(id);
                      setEditedProvince(name);
                      setEditedDistrictId(null);
                      setEditedDistrict("");
                      setEditedWardId(null);
                      setEditedWard("");
                    }}
                  />
                  <DistrictSelector
                    cityId={editedProvinceId}
                    value={editedDistrictId}
                    districtName={editedDistrict}
                    onSelect={(id, name) => {
                      setEditedDistrictId(id);
                      setEditedDistrict(name);
                      setEditedWardId(null);
                      setEditedWard("");
                    }}
                  />
                  <WardSelector
                    districtId={editedDistrictId}
                    value={editedWardId}
                    wardName={editedWard}
                    onSelect={(id, name) => {
                      setEditedWardId(id);
                      setEditedWard(name);
                    }}
                  />
                </View>
              ) : (
                <Text style={styles.infoValue}>
                  {typeof storeInfo?.address === 'string'
                    ? storeInfo.address
                    : storeInfo?.address
                      ? [
                        (storeInfo.address as StoreAddress).address_detail,
                        (storeInfo.address as StoreAddress).ward,
                        (storeInfo.address as StoreAddress).district,
                        (storeInfo.address as StoreAddress).province,
                      ].filter(Boolean).join(', ')
                      : "N/A"}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <FontAwesome5 name="phone-alt" size={16} color="#2563EB" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Số điện thoại</Text>
              {isEditing && isAdmin() ? (
                <TextInput
                  style={styles.input}
                  value={editedPhoneNumber}
                  onChangeText={setEditedPhoneNumber}
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoValue}>
                  {storeInfo?.phone_number || "N/A"}
                </Text>
              )}
            </View>
          </View>

          {/* <View style={styles.divider} /> */}

          {/* <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <FontAwesome5 name="check-circle" size={16} color="#2563EB" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Trạng thái</Text>
              <Text style={styles.infoValue}>
                {storeInfo?.is_active ? "Đang hoạt động" : "Tạm ngưng"}
              </Text>
            </View>
          </View> */}
        </View>

        <View style={styles.infoCard}>
          <Pressable
            style={[styles.cardHeader, !userInfoExpanded && { marginBottom: 0 }]}
            onPress={() => setUserInfoExpanded((prev) => !prev)}
          >
            <Text style={styles.cardTitle}>Thông tin người dùng</Text>
            <FontAwesome5
              name={userInfoExpanded ? "chevron-up" : "chevron-down"}
              size={12}
              color="#9CA3AF"
            />
          </Pressable>
          {userInfoExpanded && (
            <>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <FontAwesome5 name="user" solid size={16} color="#2563EB" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Tên người dùng</Text>
                  <Text style={styles.infoValue}>
                    {userInfo?.full_name || "N/A"}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <FontAwesome5 name="envelope" solid size={16} color="#2563EB" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}> Email</Text>
                  <Text style={styles.infoValue}>{userInfo?.email || "N/A"}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <FontAwesome5 name="phone-alt" size={16} color="#2563EB" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Số điện thoại</Text>
                  <Text style={styles.infoValue}>
                    {userInfo?.phone_number || "N/A"}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <FontAwesome5 name="id-badge" solid size={16} color="#2563EB" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Mã nhân viên</Text>
                  <Text style={styles.infoValue}>
                    {userInfo?.staff_code || "N/A"}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <FontAwesome5 name="user-edit" size={16} color="#2563EB" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Người tạo</Text>
                  <Text style={styles.infoValue}>
                    {userInfo?.created_by || "N/A"}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <FontAwesome5 name="calendar-alt" solid size={16} color="#2563EB" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Ngày tạo</Text>
                  <Text style={styles.infoValue}>
                    {formatDateTimeVN(userInfo?.created_date) || "N/A"}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Menu Card */}
        <View style={styles.menuCard}>
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              styles.menuItemBorder,
              pressed && styles.menuItemPressed,
            ]}
            onPress={onChangePassword}
          >
            <View style={styles.menuItemContent}>
              <View style={styles.menuIconContainer}>
                <FontAwesome5 name="lock" size={16} color="#6b7280" />
              </View>
              <Text style={styles.menuItemText}>Đổi mật khẩu</Text>
              <FontAwesome5 name="chevron-right" size={12} color="#D1D5DB" />
            </View>
          </Pressable>

          <View style={styles.divider} />

          {isAdmin() && (
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                styles.menuItemBorder,
                pressed && styles.menuItemPressed,
              ]}
              onPress={onCustomerList}
            >
              <View style={styles.menuItemContent}>
                <View style={styles.menuIconContainer}>
                  <FontAwesome5 name="users" size={16} color="#6b7280" />
                </View>
                <Text style={styles.menuItemText}>Khách hàng</Text>
                <FontAwesome5 name="chevron-right" size={12} color="#D1D5DB" />
              </View>
              <View style={styles.divider} />
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
            ]}
            onPress={handleLogout}
          >
            <View style={styles.menuItemContent}>
              <View
                style={[
                  styles.menuIconContainer,
                  styles.menuIconContainerDanger,
                ]}
              >
                <FontAwesome5 name="sign-out-alt" size={16} color="#dc2626" />
              </View>
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                Đăng xuất
              </Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.version}>Phiên bản Store OS v2.1.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: storeMainContentPaddingTop(),
    marginBottom: storeMainContentMarginBottom(),
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b7280",
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === "web" ? 32 : 120,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  saveButton: {
    backgroundColor: "#2563EB",
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1F2937",
    marginTop: 4,
  },
  addressInputs: {
    gap: 8,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 12,
  },
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    padding: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  menuItem: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 60,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  menuItemPressed: {
    backgroundColor: "#f9fafb",
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  menuIconContainerDanger: {
    backgroundColor: "#fef2f2",
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  menuItemTextDanger: {
    color: "#dc2626",
  },
  version: {
    textAlign: "center",
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 24,
  },
});
