import { LogisticTripStatus } from '@/constants/enum';
import { compatAlert } from '@/lib/compatAlert';
import { logisticService } from '@/services/api/logisticService';
import { orderService } from '@/services/api/orderService';
import { FontAwesome5 } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ServiceItem {
  id: string;
  product_name?: string;
  quantity: number;
  adjusted_quantity?: number;
  unit?: string;
}

interface Bag {
  trackingId: string;
  orderCode: string;
  orderId: string;
  scanned: boolean;
  scanTime?: string;
  serviceItems?: ServiceItem[];
}

interface ReceiveItemsScreenProps {
  tripId: string;
  tripCode: string;
  sourceStoreName: string;
  hubId: string;
  hubType: 'factory' | 'store';
  onBack: () => void;
  onComplete: () => void;
}

export const ReceiveItemsScreen: React.FC<ReceiveItemsScreenProps> = ({
  tripId,
  tripCode,
  sourceStoreName,
  hubId,
  hubType,
  onBack,
  onComplete,
}) => {
  const [bags, setBags] = useState<Bag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  const title = hubType === 'factory' ? 'Nhận hàng từ tiệm' : 'Nhận hàng từ xưởng';

  useEffect(() => {
    loadTripDetails();
  }, [tripId]);

  useEffect(() => {
    if (showScanner) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [showScanner, scanLineAnim]);

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 256],
  });

  const loadTripDetails = async () => {
    try {
      setLoading(true);
      const response = await logisticService.getTripDetails(tripId);

      console.log('Trip details response:', response.data);
      
      if (response?.data?.logistic_trip_items) {
        // Extract tracking item IDs from trip items
        const trackingItemIds = response.data.logistic_trip_items
          .map((item: any) => item.service_item_tracking_id)
          .filter((id: string) => id);

        console.log('Tracking item IDs:', trackingItemIds);

        if (trackingItemIds.length > 0) {
          // Search all tracking items from the source store
          const trackingResponse = await logisticService.searchTrackingItems(
            {
              current_store_id: response.data.source_store_id,
            },
            { page: 0, size: 1000 }
          );

          console.log('Tracking items response:', trackingResponse?.data);

          // Map tracking item ID to order_id
          const trackingIdToOrderId = new Map<string, string>();
          
          if (trackingResponse?.data && Array.isArray(trackingResponse.data)) {
            trackingResponse.data.forEach((item: any) => {
              // Only process tracking items that are in this trip
              if (trackingItemIds.includes(item.id) && item.order_id) {
                trackingIdToOrderId.set(item.id, item.order_id);
              }
            });
          }

          // console.log('Tracking ID to Order ID map:', trackingIdToOrderId);

          // Fetch orders to get order_code and service items
          const orderIds = Array.from(trackingIdToOrderId.values());
          // console.log('Order IDs to fetch:', orderIds);
          
          const orderIdToCode = new Map<string, string>();
          const orderIdToServiceItems = new Map<string, ServiceItem[]>();
          
          if (orderIds.length > 0) {
            // Fetch each order by ID
            await Promise.all(
              orderIds.map(async (orderId) => {
                try {
                  const orderResponse = await orderService.getStaffOrderById(orderId);
                  // console.log(`Order ${orderId} response:`, orderResponse?.data);

                  if (orderResponse?.data) {
                    const order = orderResponse.data;
                    orderIdToCode.set(order.id, order.code);
                    
                    // Extract service items from order_items
                    if (order.order_items && Array.isArray(order.order_items)) {
                      const serviceItems: ServiceItem[] = order.order_items
                        .filter((item: any) => item.product_type === 'SERVICE')
                        .map((item: any) => ({
                          id: item.id || '',
                          product_name: item.product_name || item.name || 'N/A',
                          quantity: item.quantity || 0,
                          adjusted_quantity: item.adjusted_quantity,
                          unit: item.unit || 'cái',
                        }));
                      orderIdToServiceItems.set(order.id, serviceItems);
                    }
                  }
                } catch (error) {
                  console.error(`Failed to fetch order ${orderId}:`, error);
                }
              })
            );

            // console.log('Order ID to Code map:', orderIdToCode);
            // console.log('Order ID to Service Items map:', orderIdToServiceItems);
          }

          // Each tracking item is one bag (one order)
          const bagsList: Bag[] = [];
          
          trackingItemIds.forEach((trackingId: string) => {
            const orderId = trackingIdToOrderId.get(trackingId);
            const orderCode = orderId ? (orderIdToCode.get(orderId) || 'N/A') : 'N/A';
            const serviceItems = orderId ? (orderIdToServiceItems.get(orderId) || []) : [];

            bagsList.push({
              trackingId,
              orderCode,
              orderId: orderId || '',
              scanned: false,
              serviceItems,
            });
          });

          console.log('Final bags list:', bagsList);
          setBags(bagsList);
        }
      }
    } catch (error) {
      console.error('Failed to load trip details:', error);
      compatAlert('Lỗi', 'Không thể tải thông tin chuyến hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleScanPress = async () => {
    if (!permission) {
      await requestPermission();
    }
    if (!permission?.granted) {
      compatAlert(
        'Cần quyền camera',
        'Cần quyền truy cập camera để quét QR code. Vui lòng cấp quyền trong cài đặt.'
      );
      return;
    }
    setShowScanner(true);
  };

  const markBagAsReceived = async (bagIndex: number) => {
    const bag = bags[bagIndex];
    
    // If order is already scanned, just show message
    if (bag.scanned) {
      compatAlert(
        'Đã nhận',
        `Đơn hàng "${bag.orderCode}" đã được nhận trước đó.`
      );
      return;
    }
    
    // Mark bag as scanned immediately (add tag to UI)
    const updatedBags = [...bags];
    updatedBags[bagIndex] = {
      ...updatedBags[bagIndex],
      scanned: true,
      scanTime: new Date().toLocaleString('vi-VN'),
    };
    setBags(updatedBags);
    
    // Check if all bags are scanned
    const newScannedCount = updatedBags.filter((bag) => bag.scanned).length;
    const allScanned = newScannedCount === updatedBags.length;
    
    // If all bags are scanned, automatically update trip status to COMPLETED
    if (allScanned) {
      try {
        await logisticService.updateStatusTrips(tripId, LogisticTripStatus.COMPLETED);
      } catch (error) {
        console.error('Failed to update trip status:', error);
        // Don't show error to user, just log it
      }
    }
    
    // Show success feedback
    compatAlert(
      'Thành công',
      allScanned
        ? `Đã nhận đơn hàng: ${bag.orderCode}\nĐã nhận đủ tất cả đơn hàng!`
        : `Đã nhận đơn hàng: ${bag.orderCode}`
    );
  };

  const handleQRCodeScanned = async (data: string) => {
    if (scanning) return;
    
    setScanning(true);
    setScanned(true);

    // Extract order code from scanned data
    let scannedCode = data.trim();
    if (scannedCode.includes("/")) {
      const parts = scannedCode.split("/");
      scannedCode = parts[parts.length - 1];
    }

    // First try to find by barcode (tracking item)
    let bagIndex = bags.findIndex(
      (bag) => bag.trackingId === scannedCode
    );

    // If not found by tracking ID, try to find by order code
    if (bagIndex === -1) {
      bagIndex = bags.findIndex(
        (bag) => bag.orderCode === scannedCode
      );
    }

    if (bagIndex === -1) {
      compatAlert(
        'Không tìm thấy',
        `Đơn hàng "${scannedCode}" không có trong chuyến này.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setScanning(false);
              setScanned(false);
            },
          },
        ]
      );
      return;
    }

    await markBagAsReceived(bagIndex);
    
    setScanning(false);
    setScanned(false);
  };

  const handleManualReceive = async (bagIndex: number) => {
    compatAlert(
      'Xác nhận nhận hàng',
      `Bạn có chắc muốn nhận đơn hàng "${bags[bagIndex].orderCode}" mà không quét mã QR?`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xác nhận',
          onPress: () => markBagAsReceived(bagIndex),
        },
      ]
    );
  };

  const handleCompleteReceiving = () => {
    const unscannedBags = bags.filter((bag) => !bag.scanned);
    
    if (unscannedBags.length > 0) {
      compatAlert(
        'Chưa đủ',
        `Còn ${unscannedBags.length} đơn hàng chưa được quét. Bạn có chắc muốn hoàn thành?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Hoàn thành',
            style: 'destructive',
            onPress: () => {
              onComplete();
            },
          },
        ]
      );
    } else {
      compatAlert('Thành công', 'Đã nhận đủ tất cả đơn hàng!', [
        {
          text: 'OK',
          onPress: () => {
            onComplete();
          },
        },
      ]);
    }
  };

  const scannedCount = bags.filter((bag) => bag.scanned).length;
  const totalBags = bags.length;
  const progress = totalBags > 0 ? (scannedCount / totalBags) * 100 : 0;

  if (loading) {
    return (
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <FontAwesome5 name="arrow-left" size={16} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.title}>Nhận hàng</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Đang tải thông tin chuyến hàng...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <FontAwesome5 name="arrow-left" size={16} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              {tripCode} • {sourceStoreName}
            </Text>
          </View>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Tiến độ nhận hàng</Text>
            <Text style={styles.progressCount}>
              {scannedCount}/{totalBags} đơn
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressPercentage}>{progress.toFixed(0)}% hoàn thành</Text>
        </View>

        {/* Bags List */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Danh sách đơn hàng ({totalBags})</Text>
          {bags.map((bag, index) => (
            <View
              key={bag.trackingId}
              style={[styles.bagCard, bag.scanned && styles.bagCardScanned]}
            >
              <View style={styles.bagHeader}>
                <View style={styles.bagIconContainer}>
                  {bag.scanned ? (
                    <FontAwesome5 name="check-circle" size={28} color="#10B981" />
                  ) : (
                    <FontAwesome5 name="shopping-bag" size={28} color="#6B7280" />
                  )}
                </View>
                <View style={styles.bagInfo}>
                  <Text style={styles.bagOrderCode}>{bag.orderCode}</Text>
                  <Text style={styles.bagNumber}>Đơn hàng #{index + 1}</Text>
                  {bag.scanned && bag.scanTime && (
                    <Text style={styles.bagScanTime}>Đã quét: {bag.scanTime}</Text>
                  )}
                </View>
                {bag.scanned && (
                  <View style={styles.scannedBadge}>
                    <Text style={styles.scannedBadgeText}>✓ Đã nhận</Text>
                  </View>
                )}
              </View>

              {/* Service Items */}
              {bag.serviceItems && bag.serviceItems.length > 0 && (
                <View style={styles.serviceItemsSection}>
                  <Text style={styles.serviceItemsTitle}>
                    Dịch vụ ({bag.serviceItems.length}):
                  </Text>
                  {bag.serviceItems.map((serviceItem, idx) => {
                    const quantity = serviceItem.adjusted_quantity !== undefined 
                      ? serviceItem.adjusted_quantity 
                      : serviceItem.quantity;
                    const unit = serviceItem.unit || 'cái';
                    
                    return (
                      <View key={serviceItem.id || idx} style={styles.serviceItemRow}>
                        <View style={styles.serviceItemIcon}>
                          <FontAwesome5 name="tshirt" size={14} color="#2563EB" />
                        </View>
                        <View style={styles.serviceItemInfo}>
                          <Text style={styles.serviceItemName}>
                            {serviceItem.product_name}
                          </Text>
                        </View>
                        <View style={styles.serviceItemQuantity}>
                          <Text style={styles.serviceItemQuantityText}>
                            {quantity} {unit}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Manual Receive Button */}
              {!bag.scanned && (
                <TouchableOpacity
                  style={styles.manualReceiveButton}
                  onPress={() => handleManualReceive(index)}
                  activeOpacity={0.8}
                >
                  <FontAwesome5 name="check-circle" size={16} color="#2563EB" />
                  <Text style={styles.manualReceiveButtonText}>Nhận đơn hàng</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.scanButton, scannedCount === totalBags && styles.scanButtonDisabled]}
            onPress={handleScanPress}
            disabled={scannedCount === totalBags}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="qrcode" size={18} color="#FFFFFF" />
            <Text style={styles.scanButtonText}>Quét đơn hàng</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.completeButton,
              scannedCount === 0 && styles.completeButtonDisabled,
            ]}
            onPress={handleCompleteReceiving}
            disabled={scannedCount === 0}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="check" size={18} color="#FFFFFF" />
            <Text style={styles.completeButtonText}>Hoàn thành</Text>
          </TouchableOpacity>
        </View>

        {/* Scanner Overlay */}
        {showScanner && (
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerContainer}>
              {/* Scanner Header */}
              <View style={styles.scannerHeader}>
                <TouchableOpacity
                  style={styles.closeScannerButton}
                  onPress={() => {
                    setShowScanner(false);
                    setScanned(false);
                    setScanning(false);
                  }}
                >
                  <FontAwesome5 name="times" size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.scannerTitle}>Quét đơn hàng</Text>
              </View>

              {/* Camera View */}
              <View style={styles.cameraContainer}>
                {permission?.granted ? (
                  <>
                    <CameraView
                      style={StyleSheet.absoluteFillObject}
                      facing="back"
                      barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                      }}
                      onBarcodeScanned={
                        scanned
                          ? undefined
                          : (event: { data: string }) => {
                              handleQRCodeScanned(event.data);
                            }
                      }
                    />

                    {/* Scan overlay */}
                    <View style={styles.scanOverlay} pointerEvents="none">
                      <View style={styles.scanFrame}>
                        {/* Corners */}
                        <View style={[styles.corner, styles.cornerTopLeft]} />
                        <View style={[styles.corner, styles.cornerTopRight]} />
                        <View style={[styles.corner, styles.cornerBottomLeft]} />
                        <View style={[styles.corner, styles.cornerBottomRight]} />

                        {/* Animated scan line */}
                        <Animated.View
                          style={[
                            styles.scanLine,
                            { transform: [{ translateY: scanLineTranslateY }] },
                          ]}
                        />
                      </View>
                      <View style={styles.instructionContainer}>
                        <Text style={styles.instructionText}>
                          {scanned ? 'Đã quét! Đang xử lý...' : 'Di chuyển camera vào mã QR'}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.cameraPlaceholder}>
                    <FontAwesome5 name="camera" size={48} color="#9CA3AF" />
                    <Text style={styles.cameraPlaceholderText}>
                      Cần quyền truy cập camera
                    </Text>
                  </View>
                )}
              </View>

              {/* Progress Indicator */}
              <View style={styles.scannerProgress}>
                <Text style={styles.scannerProgressText}>
                  Đã quét: {scannedCount}/{totalBags} đơn hàng
                </Text>
                <View style={styles.scannerProgressBar}>
                  <View style={[styles.scannerProgressFill, { width: `${progress}%` }]} />
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingTop: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  progressCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563EB',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  bagCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bagCardScanned: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  bagHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bagIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bagInfo: {
    flex: 1,
  },
  bagOrderCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  bagNumber: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  bagScanTime: {
    fontSize: 10,
    color: '#059669',
    marginTop: 2,
  },
  scannedBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  scannedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  serviceItemsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  serviceItemsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  serviceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    gap: 8,
  },
  serviceItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceItemInfo: {
    flex: 1,
  },
  serviceItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  serviceItemQuantity: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  serviceItemQuantityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  manualReceiveButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563EB',
    gap: 8,
  },
  manualReceiveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  scanButton: {
    flex: 1,
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
  scanButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.5,
  },
  scanButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  completeButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.5,
  },
  completeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: '#000000',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerHeader: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeScannerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraContainer: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  cameraPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scanFrame: {
    width: 256,
    height: 256,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#3B82F6',
  },
  cornerTopLeft: {
    top: -4,
    left: -4,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    top: -4,
    right: -4,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    bottom: -4,
    left: -4,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    bottom: -4,
    right: -4,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#EF4444',
  },
  instructionContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    marginTop: 24,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scannerProgress: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
  },
  scannerProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  scannerProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scannerProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
});

