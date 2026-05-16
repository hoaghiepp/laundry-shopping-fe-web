import { StoreType } from '@/constants/enum';
import { storeService } from '@/services/api/storeService';
import { FontAwesome5 } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Store {
  id: string;
  name: string;
  address: string;
  distance?: string;
  isOpen: boolean;
  phone_contact?: string;
  phone_number?: string;
}

interface StoreLocatorScreenProps {
  onBack: () => void;
  onCall: (id: string) => void;
  onDirections: (id: string) => void;
}

export const StoreLocatorScreen: React.FC<StoreLocatorScreenProps> = ({
  onBack,
  onCall,
  onDirections,
}) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const formatAddress = (address: any): string => {
    if (typeof address === 'string') {
      return address;
    }
    if (address && typeof address === 'object') {
      const parts = [
        address.address_detail,
        address.ward,
        address.district,
        address.province,
      ].filter(Boolean);
      return parts.join(', ');
    }
    return '';
  };

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      const response = await storeService.searchStore({
        type: StoreType.HUB,
      }, { page: 0, size: 100 });
      const storeData = response?.data || [];
      
      const formattedStores: Store[] = storeData.map((store: any) => ({
        id: store.id,
        name: store.name || 'Cửa hàng',
        address: formatAddress(store.address),
        isOpen: store.is_active !== false,
        phone_contact: store.phone_contact,
        phone_number: store.phone_number,
      }));
      
      setStores(formattedStores);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStores();
  }, [fetchStores]);

  // Remove accents/diacritics from Vietnamese text for search
  const removeAccents = (str: string): string => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  // Filter stores by search query (case-insensitive and accent-insensitive)
  const filteredStores = stores.filter((store) => {
    if (!searchQuery.trim()) return true;
    const query = removeAccents(searchQuery.toLowerCase());
    const storeName = removeAccents(store.name.toLowerCase());
    const storeAddress = removeAccents(store.address.toLowerCase());
    return storeName.includes(query) || storeAddress.includes(query);
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <FontAwesome5 name="arrow-left" size={16} color="#4B5563" />
          </TouchableOpacity>
          <Text style={styles.title}>Hệ thống Cửa hàng</Text>
        </View>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.mapButton}>
            <FontAwesome5 name="map-marked-alt" size={14} color="#2563EB" /> Bản đồ
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <FontAwesome5 name="search" size={14} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo quận, tên đường..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
      >
        {loading && stores.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Đang tải...</Text>
          </View>
        ) : filteredStores.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Không tìm thấy cửa hàng nào' : 'Không có cửa hàng nào'}
            </Text>
          </View>
        ) : (
          filteredStores.map((store) => (
          <View
            key={store.id}
            style={[styles.storeCard, !store.isOpen && styles.storeCardClosed]}
          >
            <View style={styles.storeHeader}>
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{store.name}</Text>
                <View style={styles.infoRow}>
                  <View style={styles.infoIconContainer}>
                    <FontAwesome5 name="map-marker-alt" size={12} color="#2563EB" />
                  </View>
                  <Text style={styles.storeAddress}>{store.address || 'Chưa có địa chỉ'}</Text>
                </View>
                {store.phone_number && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <FontAwesome5 name="phone-alt" size={12} color="#059669" />
                    </View>
                    <Text style={styles.hotline}>{store.phone_number}</Text>
                  </View>
                )}
              </View>
              <View style={styles.storeStatus}>
                <View style={[styles.statusBadge, store.isOpen ? styles.statusOpen : styles.statusClosed]}>
                  <Text style={[styles.statusText, store.isOpen ? styles.statusTextOpen : styles.statusTextClosed]}>
                    {store.isOpen ? 'Mở cửa' : 'Đóng cửa'}
                  </Text>
                </View>
                <Text style={styles.distance}>{store.distance}</Text>
              </View>
            </View>
            <View style={styles.storeActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.callButton, (!store.isOpen || !store.phone_number) && styles.actionButtonDisabled]}
                onPress={() => {
                  if (store.phone_number) {
                    const phoneNumber = store.phone_number.replace(/\s/g, '');
                    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
                      Alert.alert('Lỗi', 'Không thể mở ứng dụng gọi điện');
                    });
                  } else {
                    Alert.alert('Thông báo', 'Cửa hàng chưa có số điện thoại');
                  }
                }}
                activeOpacity={0.7}
                disabled={!store.isOpen || !store.phone_number}
              >
                <FontAwesome5 name="phone-alt" size={10} color={(store.isOpen && store.phone_number) ? '#2563EB' : '#9CA3AF'} />
                <Text style={[styles.callButtonText, (!store.isOpen || !store.phone_number) && styles.actionTextDisabled]}>Gọi điện</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.directionsButton, !store.isOpen && styles.actionButtonDisabledAlt]}
                onPress={() => {
                  if (store.address) {
                    // Encode the address for URL
                    const encodedAddress = encodeURIComponent(store.address);
                    console.log("encodedAddress", encodedAddress);
                    
                    // Try to open Google Maps app first, fallback to web if app not available
                    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
                    const googleMapsAppUrl = `comgooglemaps://?q=${encodedAddress}`;
                    
                    // Try to open Google Maps app, fallback to web version
                    Linking.canOpenURL(googleMapsAppUrl)
                      .then((supported) => {
                        if (supported) {
                          return Linking.openURL(googleMapsAppUrl);
                        } else {
                          return Linking.openURL(googleMapsUrl);
                        }
                      })
                      .catch(() => {
                        // If both fail, try web version
                        Linking.openURL(googleMapsUrl).catch(() => {
                          Alert.alert('Lỗi', 'Không thể mở Google Maps. Vui lòng kiểm tra kết nối mạng.');
                        });
                      });
                  } else {
                    Alert.alert('Thông báo', 'Cửa hàng chưa có địa chỉ');
                  }
                }}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="directions" size={10} color={store.isOpen ? '#FFFFFF' : '#4B5563'} />
                <Text style={[styles.directionsButtonText, !store.isOpen && styles.actionTextDisabledAlt]}>Chỉ đường</Text>
              </TouchableOpacity>
            </View>
          </View>
          ))
        )}
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
  mapButton: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  searchBar: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  content: {
    padding: 16,
  },
  storeCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  storeCardClosed: {
    opacity: 0.8,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  storeInfo: {
    flex: 1,
    marginRight: 8,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  infoIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  storeAddress: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    fontWeight: '500',
  },
  hotline: {
    flex: 1,
    fontSize: 13,
    color: '#059669',
    lineHeight: 20,
    fontWeight: '600',
  },
  storeStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  statusOpen: {
    backgroundColor: '#D1FAE5',
  },
  statusClosed: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextOpen: {
    color: '#059669',
  },
  statusTextClosed: {
    color: '#6B7280',
  },
  distance: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  storeActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  callButton: {
    backgroundColor: '#EFF6FF',
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  directionsButton: {
    backgroundColor: '#2563EB',
    shadowColor: '#BFDBFE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  directionsButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  actionButtonDisabledAlt: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionTextDisabled: {
    color: '#9CA3AF',
  },
  actionTextDisabledAlt: {
    color: '#4B5563',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
});

