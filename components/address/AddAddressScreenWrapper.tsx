import { AddressType } from '@/constants/enum';
import { CreateCustomerAddressRequest, customerAddressService, customerService } from '@/services/api/customerService';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { AddAddressScreen, AddressFormData } from './AddAddressScreen';

interface AddAddressScreenWrapperProps {
  onBack: () => void;
  onSuccess?: () => void;
  editingAddressId?: string | null;
  existingAddressesCount?: number;
}

interface CustomerProfile {
  full_name?: string;
  phone_number?: string;
  email?: string;
  avatar_url?: string;
  wallet_balance?: number;
}

export const AddAddressScreenWrapper: React.FC<AddAddressScreenWrapperProps> = ({
  onBack,
  onSuccess,
  editingAddressId,
  existingAddressesCount = 0,
}) => {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [existingAddress, setExistingAddress] = useState<any>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await customerService.getCustomerProfile();
      setProfile(response?.data as CustomerProfile || null);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, []);

  const fetchExistingAddress = useCallback(async () => {
    if (!editingAddressId) {
      setLoading(false);
      return;
    }

    try {
      const response = await customerAddressService.getCustomerAddresses();
      const addresses = (response?.data || response || []) as any[];
      const address = addresses.find((addr) => addr.id === editingAddressId);
      setExistingAddress(address);
    } catch (error) {
      console.error('Error fetching address:', error);
    } finally {
      setLoading(false);
    }
  }, [editingAddressId]);

  useEffect(() => {
    fetchProfile();
    fetchExistingAddress();
  }, [fetchProfile, fetchExistingAddress]);

  const handleSave = async (data: AddressFormData) => {
    try {
      const addressData: CreateCustomerAddressRequest = {
        full_name: data.fullName?.trim() || profile?.full_name || '',
        phone_number: data.phoneNumber?.trim() || profile?.phone_number || '',
        address_detail: data.address.trim(),
        ward: data.wardName,
        district: data.districtName,
        province: data.cityName,
        type: (data.type as AddressType) || AddressType.HOUSE,
        is_default: data.isDefault !== undefined ? data.isDefault : (existingAddressesCount === 0),
        province_id: data.cityId as number,
        district_id: data.districtId as number,
        ward_id: data.wardId as number,
      };

      if (editingAddressId) {
        // Update existing address
        await customerAddressService.updateCustomerAddress(editingAddressId, addressData);
        Alert.alert('Thành công', 'Đã cập nhật địa chỉ');
      } else {
        // Create new address
        await customerAddressService.createCustomerAddress(addressData);
        Alert.alert('Thành công', 'Đã thêm địa chỉ mới');
      }

      if (onSuccess) {
        onSuccess();
      }
      onBack();
    } catch (error: any) {
      console.error('Error saving address:', error);
      Alert.alert('Lỗi', error?.message || 'Không thể lưu địa chỉ');
    }
  };

  const getInitialData = (): Partial<AddressFormData> | undefined => {
    if (loading) return undefined;

    if (editingAddressId && existingAddress) {
      const addressData = existingAddress.address || existingAddress;
      return {
        cityId: null,
        cityName: addressData.province || '',
        districtId: null,
        districtName: addressData.district || '',
        wardId: null,
        wardName: addressData.ward || '',
        address: addressData.address_detail || '',
        type: existingAddress.type || AddressType.HOUSE,
        fullName: existingAddress.full_name || profile?.full_name || '',
        phoneNumber: existingAddress.phone_number || profile?.phone_number || '',
        isDefault: existingAddress.is_default || false,
      };
    }

    // New address - pre-fill with profile data
    return {
      fullName: profile?.full_name || '',
      phoneNumber: profile?.phone_number || '',
      type: AddressType.HOUSE,
      isDefault: existingAddressesCount === 0,
    };
  };

  return (
    <AddAddressScreen
      onBack={onBack}
      onSave={handleSave}
      initialData={getInitialData()}
    />
  );
};

