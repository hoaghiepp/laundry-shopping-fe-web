import { AddAddressScreenWrapper } from '@/components/address';
import { ChangePasswordScreen } from '@/components/auth';
import { SecureStoreKeys } from '@/constants/enum';
import { customerAddressService, CustomerProfile, customerService, UpdateCustomerProfileRequest } from '@/services/api/customerService';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from "@/lib/secureStorage";
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// API Response interface
interface ApiAddressResponse {
  id: string;
  customer_id: string;
  full_name: string;
  phone_number: string;
  type: string;
  is_default: boolean;
  address: {
    id: string;
    entity_id: string;
    entity_type: string;
    address_detail: string;
    ward: string;
    district: string;
    province: string;
    deleted: boolean;
    created_by: string;
    last_modified_by: string;
    created_date: string;
    last_modified_date: string;
  };
  deleted: boolean;
  created_by: string;
  last_modified_by: string;
  created_date: string;
  last_modified_date: string;
}

interface Address {
  id: string;
  type: string;
  name: string;
  address: string;
  icon: string;
  iconColor: string;
  isDefault: boolean;
  // Extended fields for address form
  cityId?: string | number | null;
  cityName?: string;
  districtId?: string | number | null;
  districtName?: string;
  wardId?: string | number | null;
  wardName?: string;
  detailedAddress?: string;
  fullName?: string;
  phoneNumber?: string;
  addressType?: string;
}

interface ProfileScreenProps {
  onBack: () => void;
  onSave: () => void;
  onAddAddress: () => void;
  onEditAddress: (id: string) => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onBack,
  onSave,
  onAddAddress,
  onEditAddress,
  onLogout,
}) => {
  const [showAddAddressScreen, setShowAddAddressScreen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  // Map API response to Address interface
  const mapApiAddressToAddress = (apiAddress: ApiAddressResponse): Address => {
    const addressData = apiAddress.address;
    
    // Build full address string
    const fullAddress = [
      addressData.address_detail,
      addressData.ward,
      addressData.district,
      addressData.province,
    ]
      .filter(Boolean)
      .join(', ');

    // Determine icon and color based on type
    const typeMap: Record<string, { icon: string; iconColor: string; label: string }> = {
      HOUSE: { icon: 'home', iconColor: '#2563EB', label: 'Nhà riêng' },
      COMPANY: { icon: 'briefcase', iconColor: '#EA580C', label: 'Cơ quan' },
    };
    const addressType = typeMap[apiAddress.type] || typeMap.HOUSE;

    return {
      id: apiAddress.id,
      type: addressType.label,
      name: addressData.address_detail.split(',')[0] || addressData.address_detail,
      address: fullAddress,
      icon: addressType.icon,
      iconColor: addressType.iconColor,
      isDefault: apiAddress.is_default,
      cityName: addressData.province,
      districtName: addressData.district,
      wardName: addressData.ward,
      detailedAddress: addressData.address_detail,
      fullName: apiAddress.full_name,
      phoneNumber: apiAddress.phone_number,
      addressType: apiAddress.type,
    };
  };

  const fetchProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      // Try to get from SecureStore first
      const profileJson = await SecureStore.getItemAsync(SecureStoreKeys.CUSTOMER_PROFILE);
      if (profileJson) {
        const profileData: CustomerProfile = JSON.parse(profileJson);
        setProfile(profileData);
        setFullName(profileData.full_name || '');
        setPhoneNumber(profileData.phone_number || '');
        setEmail(profileData.email || '');
      } else {
        // If not in SecureStore, fetch from API
        const response = await customerService.getCustomerProfile();
        if (response?.data) {
          const profileData = response.data;
          setProfile(profileData);
          setFullName(profileData.full_name || '');
          setPhoneNumber(profileData.phone_number || '');
          setEmail(profileData.email || '');
          // Save to SecureStore
          await SecureStore.setItemAsync(
            SecureStoreKeys.CUSTOMER_PROFILE,
            JSON.stringify(profileData)
          );
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (!errorMessage.includes("Token not found")) {
        console.error('Failed to fetch profile:', error);
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Fetch profile data on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Refresh profile when screen comes into focus (e.g., after payment)
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const fetchAddresses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await customerAddressService.getCustomerAddresses();
      const apiAddresses: ApiAddressResponse[] = (response?.data || response || []) as ApiAddressResponse[];
      
      // Filter out deleted addresses and addresses with deleted nested address
      const mappedAddresses = apiAddresses
        .filter((addr) => !addr.deleted && addr.address && !addr.address.deleted)
        .map(mapApiAddressToAddress);
      
      setAddresses(mappedAddresses);
    } catch (error: any) {
      const errorMessage = error?.message || "";
      if (!errorMessage.includes("Token not found")) {
        console.error('Failed to fetch addresses:', error);
      }
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch addresses from API on mount
  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Refresh addresses when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
    }, [fetchAddresses])
  );

  const handleAddAddress = () => {
    setEditingAddressId(null);
    setShowAddAddressScreen(true);
  };

  const handleEditAddress = (id: string) => {
    setEditingAddressId(id);
    setShowAddAddressScreen(true);
  };

  const handleDeleteAddress = (id: string) => {
    const address = addresses.find((addr) => addr.id === id);
    const addressName = address?.name || address?.address || 'địa chỉ này';
    
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa ${addressName}?`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingAddressId(id);
              await customerAddressService.deleteCustomerAddress(id);
              
              // Refresh addresses from API
              const response = await customerAddressService.getCustomerAddresses();
              const apiAddresses: ApiAddressResponse[] = (response?.data || response || []) as ApiAddressResponse[];
              const mappedAddresses = apiAddresses
                .filter((addr) => !addr.deleted && addr.address && !addr.address.deleted)
                .map(mapApiAddressToAddress);
              setAddresses(mappedAddresses);
              
              Alert.alert('Thành công', 'Đã xóa địa chỉ');
            } catch (error: any) {
              console.error('Failed to delete address:', error);
              Alert.alert('Lỗi', error?.message || 'Không thể xóa địa chỉ');
            } finally {
              setDeletingAddressId(null);
            }
          },
        },
      ]
    );
  };

  const handleAddressSuccess = async () => {
    // Refresh addresses after adding/editing
    const response = await customerAddressService.getCustomerAddresses();
    const apiAddresses: ApiAddressResponse[] = (response?.data || response || []) as ApiAddressResponse[];
    const mappedAddresses = apiAddresses
      .filter((addr) => !addr.deleted && addr.address && !addr.address.deleted)
      .map(mapApiAddressToAddress);
    setAddresses(mappedAddresses);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      const updateData: UpdateCustomerProfileRequest = {
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
      };

      await customerService.updateCustomerProfile(updateData);
      
      // Refresh profile data
      const response = await customerService.getCustomerProfile();
      if (response?.data) {
        const updatedProfile = response.data;
        setProfile(updatedProfile);
        // Update SecureStore
        await SecureStore.setItemAsync(
          SecureStoreKeys.CUSTOMER_PROFILE,
          JSON.stringify(updatedProfile)
        );
      }

      Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân');
      if (onSave) {
        onSave();
      }
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      Alert.alert('Lỗi', error?.message || 'Không thể cập nhật thông tin cá nhân');
    } finally {
      setSaving(false);
    }
  };

  // Show AddAddressScreen if needed
  if (showAddAddressScreen) {
    return (
      <AddAddressScreenWrapper
        onBack={() => {
          setShowAddAddressScreen(false);
          setEditingAddressId(null);
        }}
        onSuccess={handleAddressSuccess}
        editingAddressId={editingAddressId}
        existingAddressesCount={addresses.length}
      />
    );
  }

  if (showChangePassword) {
    return (
      <ChangePasswordScreen onBack={() => setShowChangePassword(false)} />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <FontAwesome5 name="arrow-left" size={16} color="#4B5563" />
          </TouchableOpacity>
          <Text style={styles.title}>Hồ sơ cá nhân</Text>
        </View>
        <TouchableOpacity 
          onPress={handleSaveProfile} 
          activeOpacity={0.7}
          disabled={saving || profileLoading}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Text style={styles.saveButton}>Lưu</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <FontAwesome5 name="user" size={32} color="#9CA3AF" />
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.cameraButton} activeOpacity={0.7}>
            <FontAwesome5 name="camera" size={10} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          {profileLoading ? (
            <View style={styles.profileLoadingContainer}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.profileLoadingText}>Đang tải thông tin...</Text>
            </View>
          ) : (
            <>
              <View style={styles.formField}>
                <Text style={styles.label}>Họ và tên</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Nhập họ và tên"
                  editable={!saving}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.label}>Số điện thoại</Text>
                <TextInput
                  style={styles.input}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Nhập số điện thoại"
                  keyboardType="phone-pad"
                  editable={!saving}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Nhập email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={false}
                />
              </View>
            </>
          )}
        </View>

        <View style={styles.addressSection}>
          <View style={styles.addressHeader}>
            <Text style={styles.sectionTitle}>Sổ địa chỉ</Text>
            <TouchableOpacity onPress={handleAddAddress} activeOpacity={0.7}>
              <Text style={styles.addButton}>+ Thêm mới</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.addressList}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingText}>Đang tải địa chỉ...</Text>
              </View>
            ) : addresses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Chưa có địa chỉ nào</Text>
              </View>
            ) : (
              addresses.map((addr, index) => (
                <View
                  key={addr.id}
                  style={[styles.addressCard, index > 0 && styles.addressCardBorder]}
                >
                  <View style={styles.addressIcon}>
                    <FontAwesome5 name={addr.icon} size={14} color={addr.iconColor} />
                  </View>
                  <View style={styles.addressInfo}>
                    <Text style={styles.addressType}>
                      {addr.isDefault && '⭐ '}
                      {addr.isDefault ? 'Mặc định - ' : ''}{addr.type}
                    </Text>
                    <Text style={styles.addressName}>{addr.fullName}</Text>
                    <Text style={styles.addressPhone}>{addr.phoneNumber}</Text>
                    <Text style={styles.addressDetail}>{addr.address}</Text>
                  </View>
                  <View style={styles.addressActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditAddress(addr.id)}
                      activeOpacity={1}
                      disabled={deletingAddressId === addr.id}
                    >
                      <FontAwesome5 name="edit" size={14} color="#9CA3AF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteAddress(addr.id)}
                      activeOpacity={0.7}
                      disabled={deletingAddressId === addr.id}
                    >
                      {deletingAddressId === addr.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <FontAwesome5 name="trash" size={14} color="#EF4444" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, styles.changePasswordButton]}
          onPress={() => setShowChangePassword(true)}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="lock" size={14} color="#6B7280" />
          <Text style={styles.changePasswordText}>Đổi mật khẩu</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.logoutButton, styles.logoutButtonSpaced]} onPress={onLogout} activeOpacity={0.7}>
          <FontAwesome5 name="sign-out-alt" size={14} color="#EF4444" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
        <Text style={styles.version}>Phiên bản 1.0.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  saveButton: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  content: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: '#2563EB',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formField: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
  },
  input: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  addressSection: {
    marginTop: 24,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  addButton: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  addressList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  addressCardBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  addressIcon: {
    marginTop: 4,
  },
  addressInfo: {
    flex: 1,
  },
  addressType: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  addressDetail: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changePasswordButton: {
    marginTop: 24,
  },
  changePasswordText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  logoutButtonSpaced: {
    marginTop: 12,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  logoutButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  version: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileLoadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
  },
});

