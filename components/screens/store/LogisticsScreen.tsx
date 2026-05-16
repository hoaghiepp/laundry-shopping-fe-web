import { ReceiveItemsScreen } from '@/components/screens/shared/ReceiveItemsScreen';
import {
  CarrierSelectionDialog,
  InboundSection,
  LogisticsHeader,
  LogisticsTab,
  OutboundSection,
  Trip,
  TripDetailsModal,
} from '@/components/store/logistics';
import { LogisticTripStatus } from '@/constants/enum';
import {
  storeMainContentMarginBottom,
} from '@/constants/storeWebLayout';
import { compatAlert } from '@/lib/compatAlert';
import { AddressLocation, goshipService, ShipmentAddress, ShipmentRequest } from '@/services/api/goshipService';
import { logisticService } from '@/services/api/logisticService';
import { orderService } from '@/services/api/orderService';
import { storeService } from '@/services/api/storeService';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

interface LogisticsScreenProps {
  storeId?: string;
  onOrderPress?: (order: any) => void;
}

export const LogisticsScreen: React.FC<LogisticsScreenProps> = ({
  storeId,
  onOrderPress,
}) => {
  const [activeTab, setActiveTab] = useState<LogisticsTab>('out');
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
  const [tripDetails, setTripDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showReceiveItems, setShowReceiveItems] = useState(false);
  const [receiveItemsData, setReceiveItemsData] = useState<{
    tripId: string;
    tripCode: string;
    sourceStoreId: string;
  } | null>(null);
  const [showCarrierSelection, setShowCarrierSelection] = useState(false);
  const [carrierSelectionData, setCarrierSelectionData] = useState<{
    tripId: string;
    tripCode: string;
    tripDetails: any;
  } | null>(null);

  const handleCreateShipment = () => {
    compatAlert('Tạo chuyến', 'Quét gom đơn & Tạo chuyến xe');
  };

  const handleScanInbound = (tripId?: string, tripCode?: string, sourceStoreId?: string) => {
    if (tripId && tripCode && sourceStoreId) {
      setReceiveItemsData({ tripId, tripCode, sourceStoreId });
      setShowReceiveItems(true);
    } else {
      compatAlert('Nhận hàng', 'Vui lòng chọn một chuyến đi để nhận hàng');
    }
  };

  // Fetch trips for outbound (source_store_id = storeId)
  const fetchOutboundTrips = async () => {
    if (!storeId) return;

    try {
      setLoading(true);
      const response = await logisticService.searchTrips(
        {
          source_store_id: storeId,
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

  // Fetch trips for inbound (destination_store_id = storeId)
  const fetchInboundTrips = async () => {
    if (!storeId) return;

    try {
      setLoading(true);
      const response = await logisticService.searchTrips(
        {
          destination_store_id: storeId,
        },
        { page: 0, size: 100 }
      );

      if (response?.data) {
        setInboundTrips(response.data);
        // Collect unique store IDs to fetch names
        const storeIds = new Set<string>();
        response.data.forEach((trip: Trip) => {
          if (trip.source_store_id) {
            storeIds.add(trip.source_store_id);
          }
        });
        fetchStoreNames(Array.from(storeIds));
      }
    } catch (error) {
      console.error('Failed to fetch inbound trips:', error);
      setInboundTrips([]);
    } finally {
      setLoading(false);
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
    if (storeId) {
      if (activeTab === 'out') {
        fetchOutboundTrips();
      } else {
        fetchInboundTrips();
      }
    }
  }, [storeId, activeTab]);


  const handleTripPress = async (tripId: string) => {
    try {
      setLoadingDetails(true);
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
      compatAlert('Lỗi', 'Không thể tải thông tin chuyến đi');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseModal = () => {
    setShowTripModal(false);
    setTripDetails(null);
  };

  const handleCompleteReceiving = () => {
    setShowReceiveItems(false);
    setReceiveItemsData(null);
    // Refresh inbound trips
    if (activeTab === 'in') {
      fetchInboundTrips();
    }
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

        // Get source store info (hub info) for name and phone
        const sourceStoreId = tripDetailsResponse?.data?.source_store_id;
        const sourceStoreInfo = sourceStoreId ? storeInfos.get(sourceStoreId) : null;
        const hubName = sourceStoreInfo?.name || '';
        const hubPhone = sourceStoreInfo?.phone_contact || sourceStoreInfo?.phone_number || '';

        // Get destination store info (factory target info) for name and phone
        const destinationStoreId = tripDetailsResponse?.data?.destination_store_id;
        const destinationStoreInfo = destinationStoreId ? storeInfos.get(destinationStoreId) : null;
        const factoryName = destinationStoreInfo?.name || '';
        const factoryPhone = destinationStoreInfo?.phone_contact || destinationStoreInfo?.phone_number || '';

        // Build address_from from source store address
        const addressFrom: ShipmentAddress = {
          name: hubName,
          phone: hubPhone,
          street: addresses.from.address_detail,
          ward: addresses.from.ward_id,
          district: addresses.from.district_id,
          city: addresses.from.province_id,
        };

        // Build address_to from destination store address
        const addressTo: ShipmentAddress = {
          name: factoryName,
          phone: factoryPhone,
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
          // Update trip status
          await logisticService.updateStatusTrips(tripId, LogisticTripStatus.IN_TRANSIT);
          compatAlert('Thành công', 'Đã gọi xe và chuyến đi đang được vận chuyển', [
            {
              text: 'OK',
              onPress: () => {
                // Refresh outbound trips
                if (activeTab === 'out') {
                  fetchOutboundTrips();
                }
              },
            },
          ]);
        } catch (error: any) {
          console.error('Failed to update trip status:', error);
          compatAlert('Lỗi', error.message || 'Không thể cập nhật trạng thái chuyến đi');
        }
      } catch (shipmentError: any) {
        console.error('Failed to create shipment:', shipmentError);
        compatAlert('Cảnh báo', `Đã cập nhật trạng thái nhưng không thể tạo vận đơn: ${shipmentError.message}`);
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
    console.log('address', address);
    if (typeof address === 'object' && address.district && address.province) {
      return {
        district: address.district_id,
        city: address.province_id,
      };
    }

    return null;
  };

  if (showReceiveItems && receiveItemsData && storeId) {
    const sourceStoreName = storeNames.get(receiveItemsData.sourceStoreId) || 'Xưởng';
    return (
      <ReceiveItemsScreen
        tripId={receiveItemsData.tripId}
        tripCode={receiveItemsData.tripCode}
        sourceStoreName={sourceStoreName}
        hubId={storeId}
        hubType="store"
        onBack={() => {
          setShowReceiveItems(false);
          setReceiveItemsData(null);
        }}
        onComplete={handleCompleteReceiving}
      />
    );
  }

  return (
    <View style={styles.container}>
      <LogisticsHeader activeTab={activeTab} onTabChange={setActiveTab} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'out' ? (
          <OutboundSection
            totalTrips={outboundTrips.length}
            trips={outboundTrips}
            loading={loading}
            storeNames={storeNames}
            onTripPress={handleTripPress}
            onCreateShipment={handleCreateShipment}
          />
        ) : (
          <InboundSection
            totalTrips={inboundTrips.filter((trip) => trip.status !== LogisticTripStatus.CREATED).length}
            trips={inboundTrips.filter((trip) => trip.status !== LogisticTripStatus.CREATED)}
            loading={loading}
            storeNames={storeNames}
            onTripPress={handleTripPress}
            onScanInbound={() => handleScanInbound()}
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
        storeId={storeId}
        isInbound={activeTab === 'in'}
        onClose={handleCloseModal}
        onOrderPress={onOrderPress}
        onScanInbound={activeTab === 'in' ? (tripId: string, tripCode: string, sourceStoreId: string) => {
          handleScanInbound(tripId, tripCode, sourceStoreId);
        } : undefined}
        onCallVehicle={activeTab === 'out' ? handleCallVehicle : undefined}
        onSelfTransport={
          activeTab === "out"
            ? async (tripId: string, tripCode: string) => {
                try {
                  await logisticService.updateStatusTrips(
                    tripId,
                    LogisticTripStatus.IN_TRANSIT
                  );
                  compatAlert(
                    "Thành công",
                    "Đã chuyển trạng thái sang đang vận chuyển",
                    [
                      {
                        text: "OK",
                        onPress: () => {
                          handleCloseModal();
                          fetchOutboundTrips();
                        },
                      },
                    ]
                  );
                } catch (error: any) {
                  console.error("Failed to update trip status:", error);
                  compatAlert(
                    "Lỗi",
                    error?.message || "Không thể cập nhật trạng thái chuyến đi"
                  );
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
    marginBottom: storeMainContentMarginBottom(),
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});







