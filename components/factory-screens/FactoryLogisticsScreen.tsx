import {
  FactoryInboundSection,
  FactoryLogisticsHeader,
  FactoryLogisticsTab,
  FactoryOutboundSection,
  Trip,
} from '@/components/factory/logistics';
import { FactoryItemScanScreen } from '@/components/screens/shared/FactoryItemScanScreen';
import { ItemPassportScreen } from '@/components/screens/shared/ItemPassportScreen';
import { TripBuilderScreen } from '@/components/screens/shared/TripBuilderScreen';
import { CarrierSelectionDialog, TripDetailsModal } from '@/components/store/logistics';
import { LogisticTripStatus } from '@/constants/enum';
import { AddressLocation, goshipService, ShipmentAddress, ShipmentRequest } from '@/services/api/goshipService';
import { logisticService } from '@/services/api/logisticService';
import { orderService } from '@/services/api/orderService';
import { storeService } from '@/services/api/storeService';
import React, { useEffect, useState } from 'react';
import { extractApiErrorMessage } from '@/services/api/apiUtils';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface FactoryLogisticsScreenProps {
  factoryId?: string;
  onScanPress: () => void;
  onReceiveTrip?: (tripId: string, tripCode: string, sourceStoreId: string) => void;
  initialTripId?: string | null;
  onTripShown?: () => void;
  onOrderPress?: (order: any) => void;
  refreshTrigger?: number;
}

export const FactoryLogisticsScreen: React.FC<FactoryLogisticsScreenProps> = ({
  factoryId,
  onScanPress,
  onReceiveTrip,
  initialTripId,
  onTripShown,
  onOrderPress,
  refreshTrigger,
}) => {
  const [activeTab, setActiveTab] = useState<FactoryLogisticsTab>('in');
  const [outboundTrips, setOutboundTrips] = useState<Trip[]>([]);
  const [inboundTrips, setInboundTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [storeNames, setStoreNames] = useState<Map<string, string>>(new Map());
  const [storeInfos, setStoreInfos] = useState<Map<string, any>>(new Map());
  const [trackingIdToOrderCode, setTrackingIdToOrderCode] = useState<Map<string, string>>(
    new Map()
  );
  const [trackingIdToBarcode, setTrackingIdToBarcode] = useState<Map<string, string>>(
    new Map()
  );
  const [tripOrderCodes, setTripOrderCodes] = useState<Map<string, string[]>>(new Map());
  const [tripDetails, setTripDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showCarrierSelection, setShowCarrierSelection] = useState(false);
  const [carrierSelectionData, setCarrierSelectionData] = useState<{
    tripId: string;
    tripCode: string;
    tripDetails: any;
  } | null>(null);

  const [showBuilder, setShowBuilder] = useState(false);
  const [showPassport, setShowPassport] = useState(false);
  const [passportBarcode, setPassportBarcode] = useState<string | undefined>();
  const [passportTrackingId, setPassportTrackingId] = useState<string | undefined>();
  const [showFactoryScan, setShowFactoryScan] = useState(false);
  const [tripCodeInput, setTripCodeInput] = useState('');
  const [tripStatusInput, setTripStatusInput] = useState('');
  const [appliedTripQuery, setAppliedTripQuery] = useState<{ trip_code?: string; status?: string }>({});

  const handleCreateShipment = () => {
    setShowBuilder(true);
  };

  // Fetch trips for outbound (source_store_id = factoryId) - Factory sending back to stores
  const fetchOutboundTrips = async () => {
    if (!factoryId) return;

    try {
      setLoading(true);
      const response = await logisticService.searchTrips(
        {
          source_store_id: factoryId,
          ...appliedTripQuery,
        },
        { page: 0, size: 100 }
      );

      if (response?.data) {
        setOutboundTrips(response.data);
        // Collect unique store IDs to fetch names
        const storeIds = new Set<string>();
        response.data.forEach((trip: Trip) => {
          if (trip.destination_store_id) {
            storeIds.add(trip.destination_store_id);
          }
        });
        fetchStoreNames(Array.from(storeIds));
      }
    } catch (error) {
      console.error('Failed to fetch outbound trips:', error);
      setOutboundTrips([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch trips for inbound (destination_store_id = factoryId) - Factory receiving from stores
  const fetchInboundTrips = async () => {
    if (!factoryId) return;

    try {
      setLoading(true);
      const response = await logisticService.searchTrips(
        {
          destination_store_id: factoryId,
          ...appliedTripQuery,
        },
        { page: 0, size: 100 }
      );

      if (response?.data) {
        // Sort trips: IN_TRANSIT first, then CREATED, then COMPLETED last
        const sortedTrips = [...response.data].sort((a: Trip, b: Trip) => {
          const statusOrder: Record<string, number> = {
            IN_TRANSIT: 1,
            ARRIVED: 2,
            CREATED: 3,
            COMPLETED: 4,
            CANCELLED: 5,
          };
          const aOrder = statusOrder[a.status] || 999;
          const bOrder = statusOrder[b.status] || 999;
          return aOrder - bOrder;
        });
        setInboundTrips(sortedTrips);
        // Collect unique store IDs to fetch names
        const storeIds = new Set<string>();
        response.data.forEach((trip: Trip) => {
          if (trip.source_store_id) {
            storeIds.add(trip.source_store_id);
          }
        });
        fetchStoreNames(Array.from(storeIds));
        
        // Fetch order codes for each trip
        fetchOrderCodesForTrips(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch inbound trips:', error);
      setInboundTrips([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch order codes for trips
  const fetchOrderCodesForTrips = async (trips: Trip[]) => {
    if (!factoryId || trips.length === 0) return;

    try {
      const newTripOrderCodes = new Map<string, string[]>();
      
      await Promise.all(
        trips.map(async (trip) => {
          try {
            const tripDetailResponse = await logisticService.getTripDetails(trip.id);
            if (tripDetailResponse?.data?.logistic_trip_items) {
              const trackingItemIds = tripDetailResponse.data.logistic_trip_items
                .map((item: any) => item.service_item_tracking_id)
                .filter((id: string) => id);
              
              if (trackingItemIds.length > 0) {
                // Fetch each tracking item individually to get order_id and barcode
                const trackingIdToOrderId = new Map<string, string>();
                const newBarcodeMapping = new Map<string, string>();
                
                await Promise.all(
                  trackingItemIds.map(async (trackingId: string) => {
                    try {
                      const trackingItemResponse = await logisticService.getTrackingItem(trackingId);
                      if (trackingItemResponse?.data) {
                        const trackingItem = trackingItemResponse.data;
                        if (trackingItem.order_id) {
                          trackingIdToOrderId.set(trackingId, trackingItem.order_id);
                        }
                        if (trackingItem.barcode) {
                          newBarcodeMapping.set(trackingId, trackingItem.barcode);
                        }
                      }
                    } catch (error) {
                      console.error(`Failed to fetch tracking item ${trackingId}:`, error);
                    }
                  })
                );
                
                // Update barcode mapping
                if (newBarcodeMapping.size > 0) {
                  setTrackingIdToBarcode((prev) => {
                    const updated = new Map(prev);
                    newBarcodeMapping.forEach((barcode, id) => updated.set(id, barcode));
                    return updated;
                  });
                }
                
                // Fetch orders to get order_code from order_id
                const orderIds = Array.from(trackingIdToOrderId.values());
                if (orderIds.length > 0) {
                  // Fetch each order individually
                  const orderCodes: string[] = [];
                  await Promise.all(
                    orderIds.map(async (orderId: string) => {
                      try {
                        const orderResponse = await orderService.getStaffOrderById(orderId);
                        if (orderResponse?.data) {
                          orderCodes.push(orderResponse.data.code);
                        }
                      } catch (error) {
                        console.error(`Failed to fetch order ${orderId}:`, error);
                      }
                    })
                  );
                  
                  if (orderCodes.length > 0) {
                    newTripOrderCodes.set(trip.id, orderCodes);
                  }
                }
              }
            }
          } catch (error) {
            console.error(`Failed to fetch order codes for trip ${trip.id}:`, error);
          }
        })
      );
      
      setTripOrderCodes((prev) => {
        const newMap = new Map(prev);
        newTripOrderCodes.forEach((codes, tripId) => newMap.set(tripId, codes));
        return newMap;
      });
    } catch (error) {
      console.error('Failed to fetch order codes for trips:', error);
    }
  };

  // Fetch store names for display
  const fetchStoreNames = async (storeIds: string[]) => {
    if (storeIds.length === 0) return;

    try {
      const response = await storeService.searchStore(
        { deleted: false },
        { page: 0, size: 1000 }
      );

      if (response?.data) {
        const namesMap = new Map<string, string>();
        response.data.forEach((store: any) => {
          if (storeIds.includes(store.id)) {
            namesMap.set(store.id, store.name);
          }
        });
        setStoreNames((prev) => {
          const newMap = new Map(prev);
          namesMap.forEach((name, id) => newMap.set(id, name));
          return newMap;
        });
      }
    } catch (error) {
      console.error('Failed to fetch store names:', error);
    }
  };

  // Fetch full store profiles with addresses
  const fetchStoreInfos = async (storeIds: string[]) => {
    if (storeIds.length === 0) return;

    try {
      const infosMap = new Map<string, any>();
      await Promise.all(
        storeIds.map(async (storeId) => {
          try {
            const response = await storeService.getStoreProfile(storeId);
            if (response?.data) {
              infosMap.set(storeId, response.data);
            }
          } catch (error) {
            console.error(`Failed to fetch store profile for ${storeId}:`, error);
          }
        })
      );

      setStoreInfos((prev) => {
        const newMap = new Map(prev);
        infosMap.forEach((info, id) => newMap.set(id, info));
        return newMap;
      });
    } catch (error) {
      console.error('Failed to fetch store infos:', error);
    }
  };

  useEffect(() => {
    if (factoryId) {
      if (activeTab === 'out') {
        fetchOutboundTrips();
      } else {
        fetchInboundTrips();
      }
    }
  }, [factoryId, activeTab, refreshTrigger, appliedTripQuery]);

  const handleTripPress = async (tripId: string) => {
    try {
      setLoadingDetails(true);
      console.log(tripId);
      const response = await logisticService.getTripDetails(tripId);
      if (response?.data) {
        setTripDetails(response.data);
        
        // Fetch store names for source and destination stores
        const storeIdsToFetch: string[] = [];
        if (response.data.source_store_id && !storeNames.has(response.data.source_store_id)) {
          storeIdsToFetch.push(response.data.source_store_id);
        }
        if (response.data.destination_store_id && !storeNames.has(response.data.destination_store_id)) {
          storeIdsToFetch.push(response.data.destination_store_id);
        }
        
        if (storeIdsToFetch.length > 0) {
          await fetchStoreNames(storeIdsToFetch);
        }

        // Fetch store infos (with addresses) for source and destination stores
        const storeIdsToFetchInfo: string[] = [];
        if (response.data.source_store_id && !storeInfos.has(response.data.source_store_id)) {
          storeIdsToFetchInfo.push(response.data.source_store_id);
        }
        if (response.data.destination_store_id && !storeInfos.has(response.data.destination_store_id)) {
          storeIdsToFetchInfo.push(response.data.destination_store_id);
        }
        
        if (storeIdsToFetchInfo.length > 0) {
          await fetchStoreInfos(storeIdsToFetchInfo);
        }
        
        // Fetch order codes for tracking items
        if (response.data.logistic_trip_items && response.data.logistic_trip_items.length > 0) {
          const trackingItemIds = response.data.logistic_trip_items
            .map((item: any) => item.service_item_tracking_id)
            .filter((id: string) => id && !trackingIdToOrderCode.has(id));
          
          if (trackingItemIds.length > 0) {
            try {
              // Fetch each tracking item individually to get order_id and barcode
              const trackingIdToOrderId = new Map<string, string>();
              const newBarcodeMapping = new Map<string, string>();
              
              await Promise.all(
                trackingItemIds.map(async (trackingId: string) => {
                  try {
                    const trackingItemResponse = await logisticService.getTrackingItem(trackingId);
                    if (trackingItemResponse?.data) {
                      const trackingItem = trackingItemResponse.data;
                      if (trackingItem.order_id) {
                        trackingIdToOrderId.set(trackingId, trackingItem.order_id);
                      }
                      if (trackingItem.barcode) {
                        newBarcodeMapping.set(trackingId, trackingItem.barcode);
                      }
                    }
                  } catch (error) {
                    console.error(`Failed to fetch tracking item ${trackingId}:`, error);
                  }
                })
              );
              
              // Update barcode mapping
              if (newBarcodeMapping.size > 0) {
                setTrackingIdToBarcode((prev) => {
                  const updated = new Map(prev);
                  newBarcodeMapping.forEach((barcode, id) => updated.set(id, barcode));
                  return updated;
                });
              }
              
              // Fetch orders to get order_code from order_id
              const orderIds = Array.from(trackingIdToOrderId.values());
              if (orderIds.length > 0) {
                // Fetch each order individually
                const newMapping = new Map<string, string>();
                await Promise.all(
                  orderIds.map(async (orderId: string) => {
                    try {
                      const orderResponse = await orderService.getStaffOrderById(orderId);
                      if (orderResponse?.data) {
                        const order = orderResponse.data;
                        // Find tracking item IDs for this order
                        trackingIdToOrderId.forEach((oid, trackingId) => {
                          if (oid === order.id) {
                            newMapping.set(trackingId, order.code);
                          }
                        });
                      }
                    } catch (error) {
                      console.error(`Failed to fetch order ${orderId}:`, error);
                    }
                  })
                );
                
                setTrackingIdToOrderCode((prev) => {
                  const updated = new Map(prev);
                  newMapping.forEach((code, id) => updated.set(id, code));
                  return updated;
                });
              }
            } catch (error) {
              console.error('Failed to fetch order codes for tracking items:', error);
            }
          }
        }
        
        setShowTripModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch trip details:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin chuyến đi');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseModal = () => {
    setShowTripModal(false);
    setTripDetails(null);
  };

  const handleCallVehicle = (tripId: string, tripCode: string) => {
    setCarrierSelectionData({ tripId, tripCode, tripDetails });
    setShowCarrierSelection(true);
  };

  const handleSelectCarrier = async (
    carrierId: string,
    tripId: string,
    rateData?: any,
    parcelData?: any,
    addresses?: { from: any; to: any }
  ) => {

    // Create shipment if rate data is provided
    if (rateData && parcelData && addresses) {
      try {
        // Get trip details to get tripCode for order_id
        const tripDetailsResponse = await logisticService.getTripDetails(tripId);
        const tripCode = tripDetailsResponse?.data?.code || tripId;

        // Get source store info (factory info) for name and phone
        const sourceStoreId = tripDetailsResponse?.data?.source_store_id;
        const sourceStoreInfo = sourceStoreId ? storeInfos.get(sourceStoreId) : null;
        const factoryName = sourceStoreInfo?.name || '';
        const factoryPhone = sourceStoreInfo?.phone_contact || sourceStoreInfo?.phone_number || '';

        // Get destination store info (store info) for name and phone
        const destinationStoreId = tripDetailsResponse?.data?.destination_store_id;
        const destinationStoreInfo = destinationStoreId ? storeInfos.get(destinationStoreId) : null;
        const storeName = destinationStoreInfo?.name || '';
        const storePhone = destinationStoreInfo?.phone_contact || destinationStoreInfo?.phone_number || '';

        // Build address_from from source store address (factory)
        const addressFrom: ShipmentAddress = {
          name: factoryName,
          phone: factoryPhone,
          street: addresses.from.address_detail,
          ward: addresses.from.ward_id,
          district: addresses.from.district_id,
          city: addresses.from.province_id,
        };

        // Build address_to from destination store address (store)
        const addressTo: ShipmentAddress = {
          name: storeName,
          phone: storePhone,
          street: addresses.to.address_detail,
          ward: addresses.to.ward_id,
          district: addresses.to.district_id,
          city: addresses.to.province_id,
        };

        // Get rate ID from rateData (could be rate.rate, rate.id, or rate.rate_id)
        const rateId = rateData?.rate || rateData?.id || rateData?.rate_id || '';

        if (!rateId) {
          throw new Error('Không tìm thấy thông tin bảng giá');
        }

        // Create shipment request
        const shipmentRequest: ShipmentRequest = {
          shipment: {
            rate: rateId,
            payer: 1, // Shop pays (1), customer pays (0)
            order_id: tripCode,
            address_from: addressFrom,
            address_to: addressTo,
            parcel: {
              cod: parcelData.cod || 0,
              amount: parcelData.amount || 0,
              weight: parcelData.weight || '1000',
              width: parcelData.width || '10',
              height: parcelData.height || '10',
              length: parcelData.length || '10',
            },
          },
        };

        console.log('shipmentRequest', shipmentRequest);
        const shipmentResponse = await goshipService.createShipment(shipmentRequest);
        console.log('Shipment created:', shipmentResponse);

        try {
          await logisticService.departTrip(tripId);
          handleCloseCarrierDialog();
          handleCloseModal();
          if (activeTab === 'out') {
            fetchOutboundTrips();
          }
          Alert.alert('Thành công', 'Đã gọi xe và chuyến đi đang được vận chuyển');
        } catch (error: any) {
          console.error('Failed to update trip status:', error);
          Alert.alert('Lỗi', error.message || 'Không thể cập nhật trạng thái chuyến đi');
        }
      } catch (shipmentError: any) {
        console.error('Failed to create shipment:', shipmentError);
        Alert.alert('Cảnh báo', `Đã cập nhật trạng thái nhưng không thể tạo vận đơn: ${shipmentError.message}`);
      }
    }
    
  };

  const handleCloseCarrierDialog = () => {
    setShowCarrierSelection(false);
    setCarrierSelectionData(null);
  };

  const getAddressLocation = (storeId: string): AddressLocation | null => {
    const storeInfo = storeInfos.get(storeId);
    if (!storeInfo || !storeInfo.address) {
      return null;
    }

    const address = storeInfo.address;
    if (typeof address === 'object' && address.district && address.province) {
      return {
        district: address.district_id,
        city: address.province_id,
      };
    }

    return null;
  };

  const handleOrderPress = (order: any) => {
    if (onOrderPress) {
      onOrderPress(order);
    }
  };

  // Show trip details when initialTripId is provided
  useEffect(() => {
    if (initialTripId && !showTripModal && factoryId) {
      handleTripPress(initialTripId).then(() => {
        if (onTripShown) {
          onTripShown();
        }
      }).catch((error) => {
        console.error('Failed to show trip details:', error);
      });
    }
  }, [initialTripId, factoryId]);

  const refreshTrips = () => {
    if (activeTab === 'out') fetchOutboundTrips();
    else fetchInboundTrips();
  };

  const handleCancelTrip = (tripId: string) => {
    Alert.alert('Huỷ chuyến', 'Chỉ huỷ được chuyến chưa xuất phát.', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Huỷ chuyến',
        style: 'destructive',
        onPress: async () => {
          try {
            await logisticService.cancelTrip(tripId);
            handleCloseModal();
            refreshTrips();
          } catch (error) {
            Alert.alert('Lỗi', extractApiErrorMessage(error, 'Không thể huỷ chuyến'));
          }
        },
      },
    ]);
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!tripDetails?.id) return;
    try {
      await logisticService.removeTripItem(tripDetails.id, itemId);
      await handleTripPress(tripDetails.id);
    } catch (error) {
      Alert.alert('Lỗi', extractApiErrorMessage(error, 'Không thể bỏ món khỏi chuyến'));
    }
  };

  if (showFactoryScan) {
    return <FactoryItemScanScreen onBack={() => setShowFactoryScan(false)} />;
  }

  if (showPassport) {
    return (
      <ItemPassportScreen
        trackingId={passportTrackingId}
        initialBarcode={passportBarcode}
        onBack={() => {
          setShowPassport(false);
          setPassportBarcode(undefined);
          setPassportTrackingId(undefined);
        }}
      />
    );
  }

  if (showBuilder && factoryId) {
    return (
      <TripBuilderScreen
        sourceStoreId={factoryId}
        sourceKind="factory"
        onBack={() => {
          setShowBuilder(false);
          fetchOutboundTrips();
        }}
        onDone={() => {
          setShowBuilder(false);
          fetchOutboundTrips();
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FactoryLogisticsHeader activeTab={activeTab} onTabChange={setActiveTab} />
      <View style={styles.linkRow}>
        <TouchableOpacity onPress={() => setShowFactoryScan(true)}>
          <Text style={styles.passportLinkText}>Quét trạng thái</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.filterRow}>
        <TextInput
          style={styles.filterInput}
          value={tripCodeInput}
          onChangeText={setTripCodeInput}
          placeholder="Mã chuyến"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="characters"
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() =>
            setAppliedTripQuery({
              trip_code: tripCodeInput.trim() || undefined,
              status: tripStatusInput || undefined,
            })
          }
        >
          <Text style={styles.filterButtonText}>Lọc</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statusRow}>
        {[
          { value: '', label: 'Mọi trạng thái' },
          { value: 'CREATED', label: 'Đã tạo' },
          { value: 'IN_TRANSIT', label: 'Đang chạy' },
          { value: 'ARRIVED', label: 'Đã đến' },
          { value: 'COMPLETED', label: 'Hoàn thành' },
          { value: 'CANCELLED', label: 'Đã huỷ' },
        ].map((item) => (
          <TouchableOpacity key={item.label} onPress={() => setTripStatusInput(item.value)}>
            <Text style={[styles.statusChip, tripStatusInput === item.value && styles.statusChipOn]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'out' ? (
          <FactoryOutboundSection
            totalTrips={outboundTrips.length}
            trips={outboundTrips}
            loading={loading}
            storeNames={storeNames}
            onTripPress={handleTripPress}
            onCreateShipment={handleCreateShipment}
          />
        ) : (
          <FactoryInboundSection
            totalTrips={inboundTrips.filter((trip) => trip.status !== LogisticTripStatus.CREATED).length}
            trips={inboundTrips.filter((trip) => trip.status !== LogisticTripStatus.CREATED)}
            loading={loading}
            storeNames={storeNames}
            tripOrderCodes={tripOrderCodes}
            onTripPress={handleTripPress}
          />
        )}
      </ScrollView>

      <TripDetailsModal
        visible={showTripModal}
        loading={loadingDetails}
        tripDetails={tripDetails}
        storeNames={storeNames}
        storeInfos={storeInfos}
        trackingIdToOrderCode={trackingIdToOrderCode}
        trackingIdToBarcode={trackingIdToBarcode}
        factoryId={factoryId}
        isInbound={activeTab === 'in'}
        onClose={handleCloseModal}
        onScanInbound={activeTab === 'in' ? onReceiveTrip : undefined}
        onOrderPress={handleOrderPress}
        onCallVehicle={activeTab === 'out' ? handleCallVehicle : undefined}
        onCancel={activeTab === 'out' ? handleCancelTrip : undefined}
        onRemoveItem={activeTab === 'out' ? handleRemoveItem : undefined}
        onOpenPassport={(barcode) => {
          handleCloseModal();
          setPassportTrackingId(undefined);
          setPassportBarcode(barcode);
          setShowPassport(true);
        }}
        onSelfTransport={
          activeTab === 'out'
            ? async (tripId: string, tripCode: string) => {
                try {
                  await logisticService.departTrip(tripId);
                  handleCloseModal();
                  fetchOutboundTrips();
                  Alert.alert('Thành công', 'Đã chuyển trạng thái sang đang vận chuyển');
                } catch (error: any) {
                  console.error('Failed to update trip status:', error);
                  Alert.alert('Lỗi', extractApiErrorMessage(error, 'Không thể xuất phát'));
                }
              }
            : undefined
        }
      />

      {carrierSelectionData && carrierSelectionData.tripDetails && (
        <CarrierSelectionDialog
          visible={showCarrierSelection}
          tripId={carrierSelectionData.tripId}
          tripCode={carrierSelectionData.tripCode}
          sourceAddress={
            getAddressLocation(carrierSelectionData.tripDetails.source_store_id) || {
              district: '',
              city: '',
            }
          }
          destinationAddress={
            getAddressLocation(carrierSelectionData.tripDetails.destination_store_id) || {
              district: '',
              city: '',
            }
          }
          sourceStoreId={carrierSelectionData.tripDetails.source_store_id}
          destinationStoreId={carrierSelectionData.tripDetails.destination_store_id}
          sourceStoreName={storeNames.get(carrierSelectionData.tripDetails.source_store_id)}
          destinationStoreName={storeNames.get(carrierSelectionData.tripDetails.destination_store_id)}
          onSelectCarrier={handleSelectCarrier}
          onClose={handleCloseCarrierDialog}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  passportLink: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  passportLinkText: {
    color: '#2563EB',
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    color: '#111827',
  },
  filterButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  filterButtonText: { color: '#FFFFFF', fontWeight: '700' },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  statusChip: { color: '#4B5563', fontSize: 12 },
  statusChipOn: { color: '#1D4ED8', fontWeight: '700' },
});
