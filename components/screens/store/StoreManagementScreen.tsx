import { AddressInput } from "@/components/address/AddressInput";
import { CitySelector } from "@/components/address/CitySelector";
import { DistrictSelector } from "@/components/address/DistrictSelector";
import { WardSelector } from "@/components/address/WardSelector";
import { StoreType } from "@/constants/enum";
import { compatAlert } from "@/lib/compatAlert";
import {
  CreateAddressRequest,
  StoreAddress,
  StoreListItem,
  storeService,
} from "@/services/api/storeService";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface StoreManagementScreenProps {
  title: string;
  storeType: StoreType;
  onClose: () => void;
  onStoresChanged?: () => void;
}

export const StoreManagementScreen: React.FC<StoreManagementScreenProps> = ({
  title,
  storeType,
  onClose,
  onStoresChanged,
}) => {
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [storeAddresses, setStoreAddresses] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [accountEmail, setAccountEmail] = useState("");
  const [accountFullName, setAccountFullName] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountConfirmPassword, setAccountConfirmPassword] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordMismatch =
    accountConfirmPassword.length > 0 && accountPassword !== accountConfirmPassword;
  const isCreateDisabled =
    creating ||
    !accountPassword.trim() ||
    !accountConfirmPassword.trim() ||
    accountPassword !== accountConfirmPassword;

  const [provinceId, setProvinceId] = useState<string | number | null>(null);
  const [provinceName, setProvinceName] = useState("");
  const [districtId, setDistrictId] = useState<string | number | null>(null);
  const [districtName, setDistrictName] = useState("");
  const [wardId, setWardId] = useState<string | number | null>(null);
  const [wardName, setWardName] = useState("");
  const [addressDetail, setAddressDetail] = useState("");

  const closeAddModal = () => {
    if (creating) return;
    setIsAddModalOpen(false);
  };

  const resetAddForm = () => {
    setName("");
    setPhone("");
    setAccountEmail("");
    setAccountFullName("");
    setAccountPassword("");
    setAccountConfirmPassword("");
    setAccountPhone("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setProvinceId(null);
    setProvinceName("");
    setDistrictId(null);
    setDistrictName("");
    setWardId(null);
    setWardName("");
    setAddressDetail("");
  };

  const formatStoreAddress = (address?: string | StoreAddress): string => {
    if (!address) return "";
    if (typeof address === "string") return address.trim();
    return [address.address_detail, address.ward, address.district, address.province]
      .map((x) => (x || "").trim())
      .filter(Boolean)
      .join(", ");
  };

  const loadStores = async () => {
    try {
      setLoading(true);
      const res = await storeService.searchStore(
        { deleted: false, type: storeType },
        { page: 0, size: 1000 }
      );
      setStores(res.data || []);

    } catch (error: any) {
      console.error("Failed to load stores:", error);
      compatAlert("Lỗi", error.message || "Không thể tải danh sách cửa hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, [storeType]);

  useEffect(() => {
    let cancelled = false;

    const loadAddresses = async () => {
      if (!stores.length) {
        setStoreAddresses({});
        return;
      }

      const results = await Promise.allSettled(
        stores.map(async (s) => {
          const profile = await storeService.getStoreProfile(s.id);
          return { id: s.id, addressText: formatStoreAddress(profile?.data?.address) };
        })
      );

      if (cancelled) return;

      const next: Record<string, string> = {};
      for (const r of results) {
        if (r.status !== "fulfilled") continue;
        if (r.value.addressText) next[r.value.id] = r.value.addressText;
      }
      setStoreAddresses(next);
    };

    loadAddresses();
    return () => {
      cancelled = true;
    };
  }, [stores]);

  const handleCreateStore = async () => {
    if (!name.trim()) {
      compatAlert("Lỗi", "Vui lòng nhập tên");
      return;
    }

    if (!phone.trim()) {
      compatAlert("Lỗi", "Vui lòng nhập số điện thoại");
      return;
    }

    if (!accountEmail.trim()) {
      compatAlert("Lỗi", "Vui lòng nhập email tài khoản");
      return;
    }
    if (!accountFullName.trim()) {
      compatAlert("Lỗi", "Vui lòng nhập họ và tên");
      return;
    }
    if (!accountPhone.trim()) {
      compatAlert("Lỗi", "Vui lòng nhập số điện thoại tài khoản");
      return;
    }
    if (!accountPassword.trim()) {
      compatAlert("Lỗi", "Vui lòng nhập mật khẩu");
      return;
    }
    if (accountPassword !== accountConfirmPassword) {
      compatAlert("Lỗi", "Mật khẩu xác nhận không khớp");
      return;
    }

    if (!provinceId || !provinceName) {
      compatAlert("Lỗi", "Vui lòng chọn tỉnh/thành phố");
      return;
    }
    if (!districtId || !districtName) {
      compatAlert("Lỗi", "Vui lòng chọn quận/huyện");
      return;
    }
    if (!wardId || !wardName) {
      compatAlert("Lỗi", "Vui lòng chọn phường/xã");
      return;
    }
    if (!addressDetail.trim()) {
      compatAlert("Lỗi", "Vui lòng nhập địa chỉ chi tiết");
      return;
    }

    try {
      setCreating(true);

      const req = {
        admin: {
          email: accountEmail.trim(),
          full_name: accountFullName.trim(),
          password: accountPassword,
          phone_number: accountPhone.trim(),
        },
        name: name.trim(),
        phone_number: phone.trim(),
        type: storeType,
      }
      console.log(req);
      const created = await storeService.createStore(req);

      const createdId =
        created?.data?.id ??
        created?.id ??
        created?.data?.data?.id ??
        created?.data?.store?.id;

      if (createdId) {
        const addressData: CreateAddressRequest = {
          address_detail: addressDetail.trim(),
          ward: wardName,
          ward_id: Number(wardId),
          district: districtName,
          district_id: Number(districtId),
          province: provinceName,
          province_id: Number(provinceId),
        };

        await storeService.createAddress(createdId, addressData);
      }

      closeAddModal();
      resetAddForm();
      await loadStores();
      onStoresChanged?.();
      compatAlert("Thành công", "Đã tạo cửa hàng mới");
    } catch (error: any) {
      console.error("Failed to create store:", error);
      compatAlert("Lỗi", error.message || "Không thể tạo cửa hàng");
    } finally {
      setCreating(false);
    }
  };

  const confirmDeleteStore = (id: string) => {
    compatAlert(
      "Xóa cửa hàng",
      "Bạn có chắc chắn muốn xóa cửa hàng này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => handleDeleteStore(id),
        },
      ]
    );
  };

  const handleDeleteStore = async (id: string) => {
    try {
      setDeletingId(id);
      await storeService.deleteStore(id);
      await loadStores();
      onStoresChanged?.();
      compatAlert("Thành công", "Đã xóa cửa hàng");
    } catch (error: any) {
      console.error("Failed to delete store:", error);
      compatAlert("Lỗi", error.message || "Không thể xóa cửa hàng");
    } finally {
      setDeletingId(null);
    }
  };

  const renderItem = ({ item }: { item: StoreListItem }) => (
    <View style={styles.storeItem}>
      <View style={styles.storeInfo}>
        <Text style={styles.storeName}>{item.name}</Text>
        {!!item.phone_number && (
          <Text style={styles.storePhone}>{item.phone_number}</Text>
        )}
        {!!storeAddresses[item.id] && (
          <Text style={styles.storeAddress}>{storeAddresses[item.id]}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => confirmDeleteStore(item.id)}
        disabled={deletingId === item.id}
      >
        {deletingId === item.id ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <FontAwesome5 name="trash" size={14} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={16} color="#1F2933" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E40AF" />
          </View>
        ) : (
          <FlatList
            data={stores}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={
              stores.length === 0 ? styles.emptyListContainer : undefined
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>Chưa có cửa hàng nào</Text>
            }
          />
        )}
      </View>

      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={styles.openAddButton}
          onPress={() => setIsAddModalOpen(true)}
          disabled={creating}
        >
          <FontAwesome5 name="plus" size={14} color="#FFFFFF" />
          <Text style={styles.openAddButtonText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeAddModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeAddModal}>
          <Pressable style={styles.modalCard} onPress={() => { }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm mới</Text>
              <TouchableOpacity onPress={closeAddModal} style={styles.modalCloseButton}>
                <FontAwesome5 name="times" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              // keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sectionDivider}>
                <View style={styles.sectionDividerLine} />
                <Text style={styles.sectionDividerText}>Thông tin cửa hàng</Text>
                <View style={styles.sectionDividerLine} />
              </View>

              <View style={styles.compactField}>
                <Text style={styles.compactLabel}>Tên</Text>
                <View style={styles.compactInputContainer}>
                  <TextInput
                    style={styles.compactInput}
                    placeholder="Tên cửa hàng"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>
              <View style={styles.compactField}>
                <Text style={styles.compactLabel}>Số điện thoại</Text>
                <View style={styles.compactInputContainer}>
                  <TextInput
                    style={styles.compactInput}
                    placeholder="Số điện thoại"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
              </View>
              <CitySelector
                value={provinceId}
                onSelect={(id, label) => {
                  setProvinceId(id);
                  setProvinceName(label);
                  setDistrictId(null);
                  setDistrictName("");
                  setWardId(null);
                  setWardName("");
                }}
              />
              <DistrictSelector
                cityId={provinceId}
                value={districtId}
                onSelect={(id, label) => {
                  setDistrictId(id);
                  setDistrictName(label);
                  setWardId(null);
                  setWardName("");
                }}
              />
              <WardSelector
                districtId={districtId}
                value={wardId}
                onSelect={(id, label) => {
                  setWardId(id);
                  setWardName(label);
                }}
              />
              <AddressInput
                label="Địa chỉ chi tiết"
                placeholder="Nhập số nhà, tên đường, tòa nhà..."
                value={addressDetail}
                onChangeText={setAddressDetail}
                multiline={true}
              />

              <View style={styles.sectionDivider}>
                <View style={styles.sectionDividerLine} />
                <Text style={styles.sectionDividerText}>Tài khoản quản lý</Text>
                <View style={styles.sectionDividerLine} />
              </View>

              <View style={styles.compactField}>
                <Text style={styles.compactLabel}>Email</Text>
                <View style={styles.compactInputContainer}>
                  <TextInput
                    style={styles.compactInput}
                    placeholder="example@email.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={accountEmail}
                    onChangeText={setAccountEmail}
                  />
                </View>
              </View>
              <View style={styles.compactField}>
                <Text style={styles.compactLabel}>Họ và tên</Text>
                <View style={styles.compactInputContainer}>
                  <TextInput
                    style={styles.compactInput}
                    placeholder="Họ và tên"
                    placeholderTextColor="#9CA3AF"
                    value={accountFullName}
                    onChangeText={setAccountFullName}
                  />
                </View>
              </View>
              <View style={styles.compactField}>
                <Text style={styles.compactLabel}>Số điện thoại</Text>
                <View style={styles.compactInputContainer}>
                  <TextInput
                    style={styles.compactInput}
                    placeholder="Số điện thoại"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    value={accountPhone}
                    onChangeText={setAccountPhone}
                  />
                </View>
              </View>
              <View style={styles.compactField}>
                <Text style={styles.compactLabel}>Mật khẩu</Text>
                <View style={[styles.compactInputContainer, styles.passwordInputContainer]}>
                  <TextInput
                    style={[styles.compactInput, { flex: 1 }]}
                    placeholder="Mật khẩu"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    value={accountPassword}
                    onChangeText={setAccountPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeButton}>
                    <FontAwesome5 name={showPassword ? "eye-slash" : "eye"} size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.compactField}>
                <Text style={styles.compactLabel}>Xác nhận mật khẩu</Text>
                <View style={[styles.compactInputContainer, styles.passwordInputContainer]}>
                  <TextInput
                    style={[styles.compactInput, { flex: 1 }]}
                    placeholder="Nhập lại mật khẩu"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showConfirmPassword}
                    value={accountConfirmPassword}
                    onChangeText={setAccountConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword((v) => !v)} style={styles.eyeButton}>
                    <FontAwesome5 name={showConfirmPassword ? "eye-slash" : "eye"} size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                {passwordMismatch && (
                  <Text style={styles.fieldError}>Mật khẩu xác nhận không khớp</Text>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeAddModal}
                disabled={creating}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalPrimaryButton,
                  isCreateDisabled && styles.modalPrimaryButtonDisabled,
                ]}
                onPress={handleCreateStore}
                disabled={isCreateDisabled}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalPrimaryText}>Tạo</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  content: {
    flex: 1,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  storeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  storeInfo: {
    flex: 1,
    marginRight: 12,
  },
  storeName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  storePhone: {
    fontSize: 12,
    color: "#6B7280",
  },
  storeAddress: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
  },
  footerContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  openAddButton: {
    height: 40,
    borderRadius: 8,
    backgroundColor: "#1E40AF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  openAddButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    flexGrow: 0,
  },
  modalBodyContent: {
    padding: 16,
    paddingBottom: 8,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    backgroundColor: "#F3F4F6",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  modalPrimaryButton: {
    backgroundColor: "#1E40AF",
  },
  modalPrimaryButtonDisabled: {
    opacity: 0.75,
  },
  modalPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  compactField: {
    marginBottom: 12,
  },
  compactLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 6,
  },
  compactInputContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 0,
    height: 48,
    justifyContent: "center",
  },
  compactInput: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    paddingVertical: 0,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  fieldError: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },
  eyeButton: {
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
    gap: 8,
  },
  sectionDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  sectionDividerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

