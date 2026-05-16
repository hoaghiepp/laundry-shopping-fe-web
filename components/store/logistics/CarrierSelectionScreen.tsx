import { AddressLocation, goshipService } from '@/services/api/goshipService';
import { storeService } from '@/services/api/storeService';
import { compatAlert } from '@/lib/compatAlert';
import { FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export interface Carrier {
  id: string;
  name: string;
  description?: string;
  estimatedTime?: string;
  price?: number;
  carrier_logo?: string | null;
}

interface CarrierSelectionDialogProps {
  visible: boolean;
  tripId: string;
  tripCode: string;
  sourceAddress: AddressLocation;
  destinationAddress: AddressLocation;
  sourceStoreId?: string;
  destinationStoreId?: string;
  sourceStoreName?: string;
  destinationStoreName?: string;
  onSelectCarrier: (carrierId: string, tripId: string, rateData?: any, parcelData?: any, addresses?: { from: any; to: any }) => void;
  onClose: () => void;
}

export const CarrierSelectionDialog: React.FC<CarrierSelectionDialogProps> = ({
  visible,
  tripId,
  tripCode,
  sourceAddress,
  destinationAddress,
  sourceStoreId,
  destinationStoreId,
  sourceStoreName,
  destinationStoreName,
  onSelectCarrier,
  onClose,
}) => {
  const [cod, setCod] = useState<string>('0');
  const [amount, setAmount] = useState<string>('0');
  const [width, setWidth] = useState<string>('10');
  const [height, setHeight] = useState<string>('10');
  const [length, setLength] = useState<string>('10');
  const [weight, setWeight] = useState<string>('1000');
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [ratesData, setRatesData] = useState<any[]>([]);
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [sourceCityName, setSourceCityName] = useState<string>('');
  const [sourceDistrictName, setSourceDistrictName] = useState<string>('');
  const [destinationCityName, setDestinationCityName] = useState<string>('');
  const [destinationDistrictName, setDestinationDistrictName] = useState<string>('');
  const [loadingAddressNames, setLoadingAddressNames] = useState(false);
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);
  const [sourceStoreAddress, setSourceStoreAddress] = useState<any>(null);
  const [destinationStoreAddress, setDestinationStoreAddress] = useState<any>(null);
  const [loadingStoreProfiles, setLoadingStoreProfiles] = useState(false);

  const handleFetchRates = async () => {
    const codNum = parseFloat(cod) || 0;
    const amountNum = parseFloat(amount) || 0;
    const widthNum = parseFloat(width) || 0;
    const heightNum = parseFloat(height) || 0;
    const lengthNum = parseFloat(length) || 0;
    const weightNum = parseFloat(weight) || 0;

    if (widthNum <= 0 || heightNum <= 0 || lengthNum <= 0 || weightNum <= 0) {
      compatAlert('Lỗi', 'Vui lòng nhập đầy đủ thông tin kích thước và trọng lượng');
      return;
    }

    setFetchingRates(true);
    try {

      const request = {
        shipment: {
          address_from: sourceAddress,
          address_to: destinationAddress,
          parcel: {
            cod: codNum,
            amount: amountNum,
            width: widthNum,
            height: heightNum,
            length: lengthNum,
            weight: weightNum,
          },
        },
      };

      // console.log('request', request);

      const response = await goshipService.getRates(request);

      // console.log('rates response', response)

      // Handle different response structures
      let ratesData = response?.data;
      if (ratesData && !Array.isArray(ratesData) && ratesData.data) {
        ratesData = ratesData.data;
      }

      if (ratesData && Array.isArray(ratesData) && ratesData.length > 0) {
        setRatesData(ratesData);
        const carriersList: Carrier[] = ratesData.map((rate: any, index: number) => ({
          id: rate.carrier_id || rate.id || rate.carrier?.id || `carrier-${index}`,
          name: rate.carrier_name || rate.name || rate.carrier?.name || `Đơn vị vận chuyển ${index + 1}`,
          description: rate.service_name || rate.service?.name || rate.description || rate.expected,
          estimatedTime: rate.estimated_delivery_time || rate.estimated_time || rate.delivery_time || rate.expected,
          price: rate.total_fee || rate.fee || rate.price || rate.shipping_fee || 0,
          carrier_logo: rate.carrier_logo || null,
        }));
        setCarriers(carriersList);
      } else {
        compatAlert('Thông báo', 'Không tìm thấy đơn vị vận chuyển phù hợp');
        setCarriers([]);
        setRatesData([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch rates:', error);
      compatAlert('Lỗi', error.message || 'Không thể lấy báo giá vận chuyển');
      setCarriers([]);
      setRatesData([]);
    } finally {
      setFetchingRates(false);
    }
  };

  // Fetch store profiles to get full addresses
  useEffect(() => {
    const fetchStoreProfiles = async () => {
      if (!sourceStoreId && !destinationStoreId) {
        return;
      }

      setLoadingStoreProfiles(true);
      try {
        const promises: Promise<any>[] = [];

        if (sourceStoreId) {
          promises.push(
            storeService.getStoreProfile(sourceStoreId).then((response) => ({
              type: 'source',
              data: response.data,
            }))
          );
        }

        if (destinationStoreId) {
          promises.push(
            storeService.getStoreProfile(destinationStoreId).then((response) => ({
              type: 'destination',
              data: response.data,
            }))
          );
        }

        const results = await Promise.all(promises);

        results.forEach((result) => {
          if (result.type === 'source') {
            setSourceStoreAddress(result.data?.address);
          } else if (result.type === 'destination') {
            setDestinationStoreAddress(result.data?.address);
          }
        });
      } catch (error) {
        console.error('Failed to fetch store profiles:', error);
      } finally {
        setLoadingStoreProfiles(false);
      }
    };

    fetchStoreProfiles();
  }, [sourceStoreId, destinationStoreId]);

  // Fetch city and district names from IDs (fallback if store profiles don't have addresses)
  useEffect(() => {
    const fetchAddressNames = async () => {
      if (!sourceAddress.city || !sourceAddress.district || !destinationAddress.city || !destinationAddress.district) {
        return;
      }

      setLoadingAddressNames(true);
      try {
        // Fetch all cities and districts
        const [citiesResponse, districtsResponse] = await Promise.all([
          goshipService.getCities({ page: 1, per_page: 100 }),
          goshipService.getAllDistricts(),
        ]);

        // Find source city and district names
        const sourceCity = citiesResponse.data.find(
          (city: any) => (city.id || city.city_id) == sourceAddress.city
        );
        const sourceDistrict = districtsResponse.find(
          (district: any) => (district.id || district.district_id) == sourceAddress.district
        );

        // Find destination city and district names
        const destCity = citiesResponse.data.find(
          (city: any) => (city.id || city.city_id) == destinationAddress.city
        );
        const destDistrict = districtsResponse.find(
          (district: any) => (district.id || district.district_id) == destinationAddress.district
        );

        setSourceCityName(sourceCity?.name || sourceCity?.city_name || '');
        setSourceDistrictName(sourceDistrict?.name || sourceDistrict?.district_name || '');
        setDestinationCityName(destCity?.name || destCity?.city_name || '');
        setDestinationDistrictName(destDistrict?.name || destDistrict?.district_name || '');
      } catch (error) {
        console.error('Failed to fetch address names:', error);
      } finally {
        setLoadingAddressNames(false);
      }
    };

    fetchAddressNames();
  }, [sourceAddress.city, sourceAddress.district, destinationAddress.city, destinationAddress.district]);

  const handleConfirm = async () => {
    if (!selectedCarrierId) return;

    setLoading(true);
    try {
      // Find the selected rate data
      // console.log('ratesData', ratesData);
      const selectedRate = ratesData.find((rate: any) => {
        const rateId = rate.id;
        return rateId === selectedCarrierId;
      });

      // Prepare parcel data
      const parcelData = {
        cod: parseFloat(cod) || 0,
        amount: parseFloat(amount) || 0,
        weight: weight,
        width: width,
        height: height,
        length: length,
      };

      // Prepare addresses
      const addresses = {
        from: sourceStoreAddress,
        to: destinationStoreAddress,
      };

      console.log('addresses', addresses);

      await onSelectCarrier(selectedCarrierId, tripId, selectedRate, parcelData, addresses);

      // TODO: Handle shipment creation
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.dialogOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.dialogContent} onStartShouldSetResponder={() => true}>
          <View style={styles.dialogHeader}>
            <Text style={styles.dialogTitle}>Chọn đơn vị vận chuyển</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <FontAwesome5 name="times" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.dialogBody}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.dialogBodyContent}
          >
            <View style={styles.tripInfoCard}>
              <TouchableOpacity
                style={styles.tripInfoRow}
                onPress={() => setIsAddressExpanded(!isAddressExpanded)}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="truck" size={16} color="#2563EB" />
                <View style={styles.tripInfoContent}>
                  <Text style={styles.tripInfoLabel}>Mã chuyến</Text>
                  <Text style={styles.tripInfoValue}>{tripCode}</Text>
                </View>
                <FontAwesome5
                  name={isAddressExpanded ? "chevron-up" : "chevron-down"}
                  size={14}
                  color="#6B7280"
                />
              </TouchableOpacity>
              
              {isAddressExpanded && (
                <View style={styles.addressRow}>
                  <View style={styles.addressCard}>
                    <View style={styles.addressCardHeader}>
                      <View style={[styles.addressIconContainer, styles.sourceIconContainer]}>
                        <FontAwesome5 name="map-marker-alt" size={16} color="#10B981" />
                      </View>
                      <View style={styles.addressCardContent}>
                        <Text style={styles.addressLabel}>Điểm đi</Text>
                        {sourceStoreName && (
                          <Text style={styles.addressStoreName}>{sourceStoreName}</Text>
                        )}
                        {loadingStoreProfiles || loadingAddressNames ? (
                          <Text style={styles.addressText}>Đang tải...</Text>
                        ) : sourceStoreAddress ? (
                          <Text style={styles.addressText}>
                            {typeof sourceStoreAddress === 'string'
                              ? sourceStoreAddress
                              : [
                                  sourceStoreAddress.address_detail,
                                  sourceStoreAddress.ward,
                                  sourceStoreAddress.district,
                                  sourceStoreAddress.province,
                                ]
                                  .filter(Boolean)
                                  .join(', ')}
                          </Text>
                        ) : (
                          <Text style={styles.addressText}>
                            {[
                              sourceDistrictName,
                              sourceCityName,
                              sourceAddress.ward,
                            ]
                              .filter(Boolean)
                              .join(', ') ||
                              (sourceAddress.district && sourceAddress.city
                                ? `Quận/Huyện: ${sourceAddress.district}, Tỉnh/TP: ${sourceAddress.city}`
                                : 'Chưa có thông tin địa chỉ')}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.addressCard}>
                    <View style={styles.addressCardHeader}>
                      <View style={[styles.addressIconContainer, styles.destinationIconContainer]}>
                        <FontAwesome5 name="map-marker-alt" size={16} color="#EF4444" />
                      </View>
                      <View style={styles.addressCardContent}>
                        <Text style={styles.addressLabel}>Điểm đến</Text>
                        {destinationStoreName && (
                          <Text style={styles.addressStoreName}>{destinationStoreName}</Text>
                        )}
                        {loadingStoreProfiles || loadingAddressNames ? (
                          <Text style={styles.addressText}>Đang tải...</Text>
                        ) : destinationStoreAddress ? (
                          <Text style={styles.addressText}>
                            {typeof destinationStoreAddress === 'string'
                              ? destinationStoreAddress
                              : [
                                  destinationStoreAddress.address_detail,
                                  destinationStoreAddress.ward,
                                  destinationStoreAddress.district,
                                  destinationStoreAddress.province,
                                ]
                                  .filter(Boolean)
                                  .join(', ')}
                          </Text>
                        ) : (
                          <Text style={styles.addressText}>
                            {[
                              destinationDistrictName,
                              destinationCityName,
                              destinationAddress.ward,
                            ]
                              .filter(Boolean)
                              .join(', ') ||
                              (destinationAddress.district && destinationAddress.city
                                ? `Quận/Huyện: ${destinationAddress.district}, Tỉnh/TP: ${destinationAddress.city}`
                                : 'Chưa có thông tin địa chỉ')}
                          </Text>
                        )}
                      </View>
                    </View>
                </View>
              </View>
              )}
            </View>

            <Text style={styles.sectionTitle}>Thông tin gói hàng</Text>

            <View style={styles.inputSection}>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>COD (đ)</Text>
                  <TextInput
                    style={styles.input}
                    value={cod}
                    onChangeText={setCod}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Giá trị (đ)</Text>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Chiều rộng (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={width}
                    onChangeText={setWidth}
                    keyboardType="numeric"
                    placeholder="10"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Chiều cao (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                    placeholder="10"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Chiều dài (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={length}
                    onChangeText={setLength}
                    keyboardType="numeric"
                    placeholder="10"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Trọng lượng (gam)</Text>
                  <TextInput
                    style={styles.input}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    placeholder="1000"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.fetchButton, fetchingRates && styles.fetchButtonDisabled]}
                onPress={handleFetchRates}
                disabled={fetchingRates}
                activeOpacity={0.8}
              >
                {fetchingRates ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <FontAwesome5 name="search" size={16} color="#FFFFFF" />
                    <Text style={styles.fetchButtonText}>Lấy báo giá</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {carriers.length > 0 && (
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Chọn đơn vị vận chuyển</Text>
            )}

            {carriers.length === 0 && !fetchingRates && (
              <View style={styles.emptyState}>
                <FontAwesome5 name="shipping-fast" size={32} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>
                  Nhập thông tin gói hàng và nhấn "Lấy báo giá" để xem các đơn vị vận chuyển
                </Text>
              </View>
            )}

            {carriers.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.carrierCard,
                  selectedCarrierId === item.id && styles.carrierCardSelected,
                ]}
                onPress={() => setSelectedCarrierId(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.carrierCardContent}>
                  <View style={styles.carrierCardHeader}>
                    <View style={styles.carrierHeaderLeft}>
                      <View style={styles.carrierIconContainer}>
                        {item.carrier_logo ? (
                          <Image
                            source={{ uri: item.carrier_logo }}
                            style={styles.carrierLogo}
                            resizeMode="contain"
                          />
                        ) : (
                          <FontAwesome5 name="truck" size={20} color="#2563EB" />
                        )}
                      </View>
                      <View style={styles.carrierInfo}>
                        <Text style={styles.carrierName}>{item.name}</Text>
                        {item.description && (
                          <Text style={styles.carrierDescription}>{item.description}</Text>
                        )}
                      </View>
                    </View>
                    {selectedCarrierId === item.id && (
                      <View style={styles.selectedBadge}>
                        <FontAwesome5 name="check" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  <View style={styles.carrierDetails}>
                    <View style={styles.carrierDetailRow}>
                      <View style={styles.carrierDetailItem}>
                        <FontAwesome5 name="clock" size={14} color="#6B7280" />
                        <Text style={styles.carrierDetailText}>{item.estimatedTime}</Text>
                      </View>
                    </View>

                    {item.price && (
                      <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>Phí vận chuyển</Text>
                        <Text style={styles.priceValue}>
                          {item.price.toLocaleString('vi-VN')} đ
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.dialogFooter}>
            <TouchableOpacity
              style={[styles.dialogButton, styles.cancelButton]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Hủy bỏ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dialogButton,
                styles.confirmButton,
                (!selectedCarrierId || loading) && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!selectedCarrierId || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.confirmButtonText,
                    !selectedCarrierId && styles.confirmButtonTextDisabled,
                  ]}
                >
                  Xác nhận
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '100%',
    overflow: 'hidden',
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  dialogBody: {
    maxHeight: 500,
  },
  dialogBodyContent: {
    padding: 20,
  },
  tripInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tripInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tripInfoContent: {
    flex: 1,
  },
  tripInfoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  tripInfoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  addressRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  addressCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addressCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  addressIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sourceIconContainer: {
    backgroundColor: '#D1FAE5',
  },
  destinationIconContainer: {
    backgroundColor: '#FEE2E2',
  },
  addressCardContent: {
    flex: 1,
    gap: 4,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressStoreName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  addressText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginTop: 2,
  },
  fullAddressContainer: {
    gap: 4,
    marginTop: 4,
  },
  addressDetailLabel: {
    fontWeight: '600',
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    marginTop: 8,
  },
  carrierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  carrierCardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    shadowColor: '#2563EB',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  carrierCardContent: {
    padding: 20,
  },
  carrierCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  carrierHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  carrierIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  carrierLogo: {
    width: '100%',
    height: '100%',
  },
  carrierInfo: {
    flex: 1,
  },
  carrierName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  carrierDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  carrierDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
    gap: 12,
  },
  carrierDetailRow: {
    flexDirection: 'row',
    gap: 16,
  },
  carrierDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  carrierDetailText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  priceLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  dialogFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    backgroundColor: '#2563EB',
  },
  confirmButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmButtonTextDisabled: {
    color: '#9CA3AF',
  },
  inputSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  fetchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  fetchButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  fetchButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
});

