import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Text as UIText } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { AddressType } from '@/constants/enum';
import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AddressInput } from './AddressInput';
import { CitySelector } from './CitySelector';
import { DistrictSelector } from './DistrictSelector';
import { WardSelector } from './WardSelector';

export interface AddressFormData {
  cityId: string | number | null;
  cityName: string;
  districtId: string | number | null;
  districtName: string;
  wardId: string | number | null;
  wardName: string;
  address: string;
  type?: AddressType;
  fullName?: string;
  phoneNumber?: string;
  isDefault?: boolean;
}

interface AddAddressScreenProps {
  onBack: () => void;
  onSave: (data: AddressFormData) => void;
  initialData?: Partial<AddressFormData>;
}

export const AddAddressScreen: React.FC<AddAddressScreenProps> = ({
  onBack,
  onSave,
  initialData,
}) => {
  const [cityId, setCityId] = useState<string | number | null>(initialData?.cityId || null);
  const [cityName, setCityName] = useState(initialData?.cityName || '');
  const [districtId, setDistrictId] = useState<string | number | null>(
    initialData?.districtId || null
  );
  const [districtName, setDistrictName] = useState(initialData?.districtName || '');
  const [wardId, setWardId] = useState<string | number | null>(initialData?.wardId || null);
  const [wardName, setWardName] = useState(initialData?.wardName || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [type, setType] = useState<AddressType>(initialData?.type || AddressType.HOUSE);
  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || '');
  const [isDefault, setIsDefault] = useState(initialData?.isDefault || false);

  const [errors, setErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AddressFormData, string>> = {};

    if (!cityId) {
      newErrors.cityId = 'Vui lòng chọn tỉnh/thành phố';
    }
    if (!districtId) {
      newErrors.districtId = 'Vui lòng chọn quận/huyện';
    }
    if (!wardId) {
      newErrors.wardId = 'Vui lòng chọn phường/xã';
    }
    if (!address.trim()) {
      newErrors.address = 'Vui lòng nhập địa chỉ chi tiết';
    }
    if (!fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ và tên';
    }
    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Vui lòng nhập số điện thoại';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    const formData: AddressFormData = {
      cityId,
      cityName,
      districtId,
      districtName,
      wardId,
      wardName,
      address: address.trim(),
      type: type as AddressType,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      isDefault,
    };

    onSave(formData);
  };

  const handleCitySelect = (id: string | number, name: string) => {
    setCityId(id);
    setCityName(name);
    // Reset dependent fields
    setDistrictId(null);
    setDistrictName('');
    setWardId(null);
    setWardName('');
    // Clear errors
    setErrors((prev) => ({ ...prev, cityId: undefined }));
  };

  const handleDistrictSelect = (id: string | number, name: string) => {
    setDistrictId(id);
    setDistrictName(name);
    // Reset dependent field
    setWardId(null);
    setWardName('');
    // Clear errors
    setErrors((prev) => ({ ...prev, districtId: undefined }));
  };

  const handleWardSelect = (id: string | number, name: string) => {
    setWardId(id);
    setWardName(name);
    // Clear errors
    setErrors((prev) => ({ ...prev, wardId: undefined }));
  };

  return (
    <Box style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={1}>
            <FontAwesome5 name="arrow-left" size={16} color="#4B5563" />
          </TouchableOpacity>
          <UIText style={styles.title}>Thêm địa chỉ</UIText>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <VStack style={styles.formCard}>
          <View style={styles.formField}>
            <Text style={styles.label}>Loại địa chỉ</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeOption, type === AddressType.HOUSE && styles.typeOptionActive]}
                onPress={() => {
                  setType(AddressType.HOUSE);
                  setErrors((prev) => ({ ...prev, type: undefined }));
                }}
                activeOpacity={1}
              >
                <FontAwesome5
                  name="home"
                  size={14}
                  color={type === AddressType.HOUSE ? '#FFFFFF' : '#6B7280'}
                />
                <Text style={[styles.typeOptionText, type === 'HOUSE' && styles.typeOptionTextActive]}>
                  Nhà riêng
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeOption, type === AddressType.COMPANY && styles.typeOptionActive]}
                onPress={() => {
                  setType(AddressType.COMPANY);
                  setErrors((prev) => ({ ...prev, type: undefined }));
                }}
                activeOpacity={1}
              >
                <FontAwesome5
                  name="briefcase"
                  size={14}
                  color={type === 'COMPANY' ? '#FFFFFF' : '#6B7280'}
                />
                <Text style={[styles.typeOptionText, type === 'COMPANY' && styles.typeOptionTextActive]}>
                  Cơ quan
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <AddressInput
            label="Họ và tên"
            placeholder="Nhập họ và tên người nhận"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              setErrors((prev) => ({ ...prev, fullName: undefined }));
            }}
            error={errors.fullName}
          />

          <AddressInput
            label="Số điện thoại"
            placeholder="Nhập số điện thoại"
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
              setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
            }}
            error={errors.phoneNumber}
            keyboardType="phone-pad"
          />

          <CitySelector
            value={cityId}
            cityName={initialData?.cityName}
            onSelect={handleCitySelect}
            error={errors.cityId}
          />

          <DistrictSelector
            cityId={cityId}
            value={districtId}
            districtName={initialData?.districtName}
            onSelect={handleDistrictSelect}
            error={errors.districtId}
          />

          <WardSelector
            districtId={districtId}
            value={wardId}
            wardName={initialData?.wardName}
            onSelect={handleWardSelect}
            error={errors.wardId}
          />

          <AddressInput
            label="Địa chỉ chi tiết"
            placeholder="Nhập số nhà, tên đường, tòa nhà..."
            value={address}
            onChangeText={(text) => {
              setAddress(text);
              setErrors((prev) => ({ ...prev, address: undefined }));
            }}
            error={errors.address}
            multiline={true}
          />

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setIsDefault(!isDefault)}
            activeOpacity={1}
          >
            <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
              {isDefault && <FontAwesome5 name="check" size={10} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxLabel}>Đặt làm địa chỉ mặc định</Text>
          </TouchableOpacity>
        </VStack>

        <Button style={styles.saveButton} onPress={handleSave}>
          <ButtonText style={styles.saveButtonText}>Lưu địa chỉ</ButtonText>
        </Button>
      </ScrollView>
    </Box>
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
  content: {
    flex: 1,
    padding: 20,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  formField: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  typeOptionActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
});

