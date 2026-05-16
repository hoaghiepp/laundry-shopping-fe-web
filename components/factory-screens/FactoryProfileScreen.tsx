import { StoreAddress, StoreInfo, storeService } from '@/services/api/storeService';
import { formatDateTimeVN } from '@/utils/format';
import { FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface FactoryProfileScreenProps {
  factoryId?: string;
  itemsProcessed?: number;
  onTimePercentage?: number;
  onLogout: () => void;
  onChangePassword: () => void;
}

export const FactoryProfileScreen: React.FC<FactoryProfileScreenProps> = ({
  factoryId,
  itemsProcessed = 0,
  onTimePercentage = 0,
  onLogout,
  onChangePassword,
}) => {
  const [factoryInfo, setFactoryInfo] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (factoryId) {
      fetchFactoryProfile();
    } else {
      setLoading(false);
    }
  }, [factoryId]);

  const fetchFactoryProfile = async () => {
    if (!factoryId) return;

    try {
      setLoading(true);
      const response = await storeService.getStoreProfile(factoryId);
      console.log('Factory profile response:', response);
      setFactoryInfo(response.data);
    } catch (error: any) {
      console.error('Failed to fetch factory profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address?: string | StoreAddress): string => {
    if (!address) return 'N/A';
    if (typeof address === 'string') return address;
    const parts = [
      address.address_detail,
      address.ward,
      address.district,
      address.province,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
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
        {/* Stats Card */}
        {/* <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Thành tích hôm nay</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <FontAwesome5 name="check-circle" size={16} color="#2563EB" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Đã xử lý</Text>
              <Text style={styles.infoValue}>
                {itemsProcessed} món
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <FontAwesome5 name="clock" size={16} color="#2563EB" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Đúng hạn</Text>
              <Text style={styles.infoValue}>
                {onTimePercentage}%
              </Text>
            </View>
          </View>
        </View> */}

        {/* Factory Information Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Thông tin xưởng</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <FontAwesome5 name="industry" solid size={16} color="#2563EB" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tên xưởng</Text>
              <Text style={styles.infoValue}>
                {factoryInfo?.name || 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <FontAwesome5 name="map-marker-alt" solid size={16} color="#2563EB" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Địa chỉ</Text>
              <Text style={styles.infoValue}>
                {formatAddress(factoryInfo?.address)}
              </Text>
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
                {factoryInfo?.phone_number || factoryInfo?.phone_contact || 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <FontAwesome5 name="tag" solid size={16} color="#2563EB" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Loại</Text>
              <Text style={styles.infoValue}>
                {factoryInfo?.type === 'FACTORY' ? 'Xưởng' : factoryInfo?.type || 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <FontAwesome5 name="check-circle" solid size={16} color="#2563EB" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Trạng thái</Text>
              <Text style={styles.infoValue}>
                {factoryInfo?.is_active ? 'Hoạt động' : 'Không hoạt động'}
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
                {factoryInfo?.created_date ? formatDateTimeVN(factoryInfo.created_date) : 'N/A'}
              </Text>
            </View>
          </View>
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

          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
            ]}
            onPress={onLogout}
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

        <Text style={styles.version}>Phiên bản Factory OS v2.1.0</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 12,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
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
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemPressed: {
    backgroundColor: '#f9fafb',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuIconContainerDanger: {
    backgroundColor: '#fef2f2',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  menuItemTextDanger: {
    color: '#dc2626',
  },
  version: {
    textAlign: 'center',
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 24,
  },
});
