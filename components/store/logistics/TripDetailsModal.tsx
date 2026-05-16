import { LogisticTripStatus, ProductType } from '@/constants/enum';
import { compatAlert } from '@/lib/compatAlert';
import { orderService } from '@/services/api/orderService';
import { FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatDate, getStatusDisplay } from './logisticsUtils';
import { TripItemCard } from './TripItemCard';

interface TripDetailsModalProps {
  visible: boolean;
  loading: boolean;
  tripDetails: any;
  storeNames: Map<string, string>;
  storeInfos: Map<string, any>;
  trackingIdToOrderCode: Map<string, string>;
  trackingIdToBarcode?: Map<string, string>;
  storeId?: string;
  factoryId?: string;
  isInbound?: boolean;
  onClose: () => void;
  onOrderPress?: (order: any) => void;
  onScanInbound?: (tripId: string, tripCode: string, sourceStoreId: string) => void;
  onCallVehicle?: (tripId: string, tripCode: string) => void;
  onSelfTransport?: (tripId: string, tripCode: string) => void;
}

export const TripDetailsModal: React.FC<TripDetailsModalProps> = ({
  visible,
  loading,
  tripDetails,
  storeNames,
  storeInfos,
  trackingIdToOrderCode,
  trackingIdToBarcode,
  storeId,
  factoryId,
  isInbound,
  onClose,
  onOrderPress,
  onScanInbound,
  onCallVehicle,
  onSelfTransport,
}) => {
  const [orderDataMap, setOrderDataMap] = useState<Map<string, any>>(new Map());
  
  // console.log('Tracking ID to Order Code:', trackingIdToOrderCode);
  // console.log('Tracking ID to Barcode:', trackingIdToBarcode);

  const getStoreName = (storeId: string): string => {
    const storeInfo = storeInfos.get(storeId);
    return storeInfo?.name || storeNames.get(storeId) || storeId;
  };

  const getStoreAddress = (storeId: string): string | null => {
    const storeInfo = storeInfos.get(storeId);
    if (!storeInfo || !storeInfo.address) {
      return null;
    }

    const address = storeInfo.address;
    if (typeof address === 'string') {
      return address;
    } else if (typeof address === 'object' && address.address_detail) {
      const parts = [
        address.address_detail,
        address.ward,
        address.district,
        address.province,
      ].filter(Boolean);
      return parts.join(', ');
    }

    return null;
  };

  const handleOrderPress = async (orderCode: string) => {
    console.log('orderCode', orderCode);
    console.log('storeId', storeId);
    console.log('factoryId', factoryId);
    console.log('onOrderPress', onOrderPress);
    if (!onOrderPress || (!storeId && !factoryId)) return;

    try {
      const searchParams: any = {
        code: orderCode,
        fetch_order_items: true,
      };
      console.log('searchParams', searchParams);
      
      if (storeId) {
        searchParams.hub_id = storeId;
      } else if (factoryId) {
        searchParams.factory_id = factoryId;
      }

      const response = await orderService.searchStoreOrders(
        searchParams,
        { page: 0, size: 1 }
      );
      if (response?.data && response.data.length > 0) {
        onOrderPress(response.data[0]);
        onClose();
      } else {
        compatAlert(
          'Không tìm thấy',
          `Không tìm thấy đơn hàng với mã: ${orderCode}`
        );
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
      compatAlert('Lỗi', 'Không thể tải thông tin đơn hàng');
    }
  };

  const handleCallVehicle = () => {
    if (!tripDetails?.id || !tripDetails?.trip_code) return;

    if (onCallVehicle) {
      onCallVehicle(tripDetails.id, tripDetails.trip_code);
    }
  };

  const handleSelfTransport = () => {
    if (!tripDetails?.id || !tripDetails?.trip_code) return;

    if (onSelfTransport) {
      onSelfTransport(tripDetails.id, tripDetails.trip_code);
      return;
    }

    compatAlert("Tự vận chuyển", "Chưa cấu hình hành động tự vận chuyển");
  };

  // Fetch order data for all trip items
  useEffect(() => {
    const hubId = storeId || factoryId;
    if (!tripDetails?.logistic_trip_items || !hubId) return;

    const fetchOrderData = async () => {
      const orderCodes = Array.from(trackingIdToOrderCode.values());
      if (orderCodes.length === 0) return;

      // Get current map to check what's already loaded
      setOrderDataMap((prev) => {
        const codesToFetch = orderCodes.filter((code) => !prev.has(code));
        
        if (codesToFetch.length === 0) return prev;

        // Fetch missing orders
        Promise.all(
          codesToFetch.map(async (orderCode) => {
            try {
              const response = await orderService.searchStoreOrders(
                {
                  code: orderCode,
                  hub_id: hubId,
                  fetch_order_items: true,
                },
                { page: 0, size: 1 }
              );
              if (response?.data && response.data.length > 0) {
                return { code: orderCode, order: response.data[0] };
              }
            } catch (error) {
              console.error(`Failed to fetch order ${orderCode}:`, error);
            }
            return null;
          })
        ).then((results) => {
          const newOrders = results.filter((r) => r !== null) as Array<{ code: string; order: any }>;
          if (newOrders.length > 0) {
            setOrderDataMap((current) => {
              const updated = new Map(current);
              newOrders.forEach(({ code, order }) => updated.set(code, order));
              return updated;
            });
          }
        });

        return prev;
      });
    };

    fetchOrderData();
  }, [tripDetails?.logistic_trip_items, trackingIdToOrderCode, storeId, factoryId]);

  // Calculate total service quantity across all orders
  const calculateTotalServiceQuantity = (): number => {
    let total = 0;
    orderDataMap.forEach((order) => {
      if (order?.order_items && Array.isArray(order.order_items)) {
        const serviceItems = order.order_items.filter(
          (item: any) => (item.product_type as ProductType) === ProductType.SERVICE
        );
        const orderTotal = serviceItems.reduce((sum: number, item: any) => {
          const quantity = Number(item.adjusted_quantity) || 0;
          return sum + quantity;
        }, 0);
        total += orderTotal;
      }
    });
    return total;
  };

  const totalServiceQuantity = calculateTotalServiceQuantity();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {loading ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.modalLoadingText}>Đang tải thông tin...</Text>
            </View>
          ) : tripDetails ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chi tiết chuyến đi</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.modalCloseButton}
                >
                  <FontAwesome5 name="times" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Thông tin chuyến</Text>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Mã chuyến:</Text>
                  <Text style={styles.modalInfoValue}>{tripDetails.trip_code}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Trạng thái:</Text>
                  <View
                    style={[
                      styles.modalStatusBadge,
                      {
                        backgroundColor: getStatusDisplay(tripDetails.status).bg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalStatusText,
                        { color: getStatusDisplay(tripDetails.status).color },
                      ]}
                    >
                      {getStatusDisplay(tripDetails.status).text}
                    </Text>
                  </View>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Từ:</Text>
                  <View style={styles.modalInfoValueContainer}>
                    <Text style={styles.modalInfoValue}>
                      {getStoreName(tripDetails.source_store_id)}
                    </Text>
                    {getStoreAddress(tripDetails.source_store_id) && (
                      <Text style={styles.modalInfoAddress}>
                        {getStoreAddress(tripDetails.source_store_id)}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Đến:</Text>
                  <View style={styles.modalInfoValueContainer}>
                    <Text style={styles.modalInfoValue}>
                      {getStoreName(tripDetails.destination_store_id)}
                    </Text>
                    {getStoreAddress(tripDetails.destination_store_id) && (
                      <Text style={styles.modalInfoAddress}>
                        {getStoreAddress(tripDetails.destination_store_id)}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Ngày tạo:</Text>
                  <Text style={styles.modalInfoValue}>
                    {formatDate(tripDetails.created_date)}
                  </Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  Danh sách hàng hóa ({tripDetails.logistic_trip_items?.length || 0})
                </Text>
                {totalServiceQuantity > 0 && (
                  <View style={styles.totalQuantityContainer}>
                    <Text style={styles.totalQuantityLabel}>Tổng số lượng dịch vụ:</Text>
                    <Text style={styles.totalQuantityValue}>
                      {totalServiceQuantity.toFixed(1)} kg
                    </Text>
                  </View>
                )}
                {tripDetails.logistic_trip_items &&
                tripDetails.logistic_trip_items.length > 0 ? (
                  tripDetails.logistic_trip_items.map((item: any, index: number) => {
                    const orderCode = trackingIdToOrderCode.get(
                      item.service_item_tracking_id
                    );
                    const barcode = trackingIdToBarcode?.get(
                      item.service_item_tracking_id
                    );
                    const orderData = orderCode ? orderDataMap.get(orderCode) : undefined;
                    return (
                      <TripItemCard
                        key={item.id}
                        item={item}
                        index={index}
                        orderCode={orderCode}
                        barcode={barcode}
                        orderData={orderData}
                        storeId={storeId || factoryId}
                        onOrderPress={
                          orderCode
                            ? () => handleOrderPress(orderCode)
                            : undefined
                        }
                      />
                    );
                  })
                ) : (
                  <Text style={styles.modalEmptyText}>Chưa có hàng hóa</Text>
                )}
              </View>

              {/* Action Button: Call Vehicle or Scan Inbound */}
              {tripDetails.status !== LogisticTripStatus.COMPLETED && (
                <View style={styles.modalSection}>
                  {((tripDetails.source_store_id === storeId || tripDetails.source_store_id === factoryId) && tripDetails.status !== LogisticTripStatus.IN_TRANSIT) ? (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.scanInboundButton, styles.actionButton]}
                        onPress={handleCallVehicle}
                        activeOpacity={0.8}
                      >
                        <FontAwesome5 name="car" size={18} color="#FFFFFF" />
                        <Text style={styles.scanInboundButtonText}>Gọi xe ngay</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.selfTransportButton, styles.actionButton]}
                        onPress={handleSelfTransport}
                        activeOpacity={0.8}
                      >
                        <FontAwesome5 name="walking" size={18} color="#2563EB" />
                        <Text style={styles.selfTransportButtonText}>Tự vận chuyển</Text>
                      </TouchableOpacity>
                    </View>
                  ) : onScanInbound ? (
                    <TouchableOpacity
                      style={styles.scanInboundButton}
                      onPress={() => {
                        if (tripDetails.id && tripDetails.trip_code && tripDetails.source_store_id) {
                          onScanInbound(tripDetails.id, tripDetails.trip_code, tripDetails.source_store_id);
                          onClose();
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <FontAwesome5 name="qrcode" size={18} color="#FFFFFF" />
                      <Text style={styles.scanInboundButtonText}>
                        {isInbound ? 'Quét QR nhận hàng' : 'Quét mã nhận hàng'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  modalSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    marginRight: 12,
  },
  modalInfoValueContainer: {
    flex: 2,
    alignItems: 'flex-end',
  },
  modalInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
  },
  modalInfoAddress: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 2,
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    padding: 20,
  },
  totalQuantityContainer: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalQuantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  totalQuantityValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#16A34A',
  },
  scanInboundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  selfTransportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  scanInboundButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selfTransportButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2563EB",
  },
});

