import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface Address {
  id: string;
  type: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
}

interface AddressListScreenProps {
  onBack: () => void;
  onAddNew: () => void;
  onSelectAddress: (address: Address) => void;
  onSetDefault: (id: string) => void;
}

export const AddressListScreen: React.FC<AddressListScreenProps> = ({
  onBack,
  onAddNew,
  onSelectAddress,
  onSetDefault,
}) => {
  const [selectedId, setSelectedId] = useState('1');

  const addresses: Address[] = [
    {
      id: '1',
      type: 'Nhà riêng',
      name: 'Nguyễn Văn A',
      phone: '0912345678',
      address: 'Tòa R2, Royal City, 72 Nguyễn Trãi, Thượng Đình, Thanh Xuân, Hà Nội',
      isDefault: true,
    },
    {
      id: '2',
      type: 'Cơ quan',
      name: 'Nguyễn Văn A',
      phone: '0912345678',
      address: 'Tòa nhà Keangnam, Phạm Hùng, Mễ Trì, Nam Từ Liêm, Hà Nội',
      isDefault: false,
    },
  ];

  const handleSelect = (address: Address) => {
    setSelectedId(address.id);
    setTimeout(() => {
      onSelectAddress(address);
    }, 300);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <FontAwesome5 name="arrow-left" size={16} color="#4B5563" />
          </TouchableOpacity>
          <Text style={styles.title}>Chọn địa chỉ</Text>
        </View>
        <TouchableOpacity onPress={onAddNew} activeOpacity={0.7}>
          <Text style={styles.addButton}>Thêm mới</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {addresses.map((address) => (
          <TouchableOpacity
            key={address.id}
            style={[
              styles.addressCard,
              selectedId === address.id && styles.addressCardSelected,
            ]}
            onPress={() => handleSelect(address)}
            activeOpacity={0.7}
          >
            {selectedId === address.id && (
              <View style={styles.checkIcon}>
                <FontAwesome5 name="check-circle" size={18} color="#2563EB" />
              </View>
            )}
            <View style={styles.addressHeader}>
              <View style={styles.badges}>
                <View style={[styles.typeBadge, address.type === 'Nhà riêng' ? styles.typeBadgeHome : styles.typeBadgeOffice]}>
                  <Text style={[styles.typeBadgeText, address.type === 'Nhà riêng' ? styles.typeBadgeTextHome : styles.typeBadgeTextOffice]}>
                    {address.type}
                  </Text>
                </View>
                {address.isDefault && (
                  <Text style={styles.defaultLabel}>
                    <FontAwesome5 name="star" size={8} color="#F59E0B" /> Mặc định
                  </Text>
                )}
              </View>
            </View>
            <Text style={styles.addressName}>
              {address.name} - {address.phone}
            </Text>
            <Text style={styles.addressDetail}>{address.address}</Text>
            <View style={styles.addressFooter}>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onSetDefault(address.id);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.defaultButton}>
                  {address.isDefault ? 'Đặt làm mặc định' : 'Đặt làm mặc định'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
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
  addButton: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  addressCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  checkIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  addressHeader: {
    marginBottom: 4,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeHome: {
    backgroundColor: '#BFDBFE',
  },
  typeBadgeOffice: {
    backgroundColor: '#FED7AA',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  typeBadgeTextHome: {
    color: '#1E40AF',
  },
  typeBadgeTextOffice: {
    color: '#C2410C',
  },
  defaultLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  addressName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  addressDetail: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  addressFooter: {
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
    marginTop: 8,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  defaultButton: {
    fontSize: 10,
    fontWeight: '500',
    color: '#2563EB',
  },
});

