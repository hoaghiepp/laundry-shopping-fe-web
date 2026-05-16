import { StaffBottomNav, StaffHeader, StaffTabType } from '@/components/staff';
import {
  InventoryScreen,
  LogisticsScreen,
  OrdersScreen,
  ProcessDetailScreen,
  ReportScreen,
} from '@/components/staff-screens';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

export default function StaffHomeScreen() {
  const [activeTab, setActiveTab] = useState<StaffTabType>('orders');
  const [showProcessDetail, setShowProcessDetail] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState('');

  const handleOrderPress = (orderId: string, type: string) => {
    setCurrentOrderId(orderId);
    setShowProcessDetail(true);
  };

  const handleQRScan = () => {
    Alert.alert('QR Scanner', 'Mở camera để quét mã QR');
  };

  const handleShipRetail = () => {
    Alert.alert('Thành công', 'Đã tạo đơn giao hàng cho phần Bán lẻ!');
  };

  const handleCompleteService = () => {
    Alert.alert('Thành công', 'Đơn hàng đã chuyển sang trạng thái: Chờ đi Xưởng');
    setShowProcessDetail(false);
  };

  const handleAddStock = (itemId: string) => {
    Alert.alert('Nhập kho', `Thêm tồn kho cho sản phẩm #${itemId}`);
  };

  const handleCreateShipment = () => {
    Alert.alert('Tạo chuyến', 'Đã tạo chuyến xe #TRUCK-NEW');
  };

  const handleReceiveShipment = () => {
    Alert.alert('Nhận hàng', 'Đã nhận 03 bao hàng từ xưởng');
  };

  const handleShowReportDetail = (type: string) => {
    Alert.alert('Chi tiết', `Xem chi tiết ${type}`);
  };

  if (showProcessDetail) {
    return (
      <View style={styles.container}>
        <ProcessDetailScreen
          orderId={currentOrderId}
          customerName="Nguyễn Văn A"
          customerPhone="0912345678"
          customerTier={undefined}
          customerAddress="Tòa R2, Royal City, 72 Nguyễn Trãi"
          onBack={() => setShowProcessDetail(false)}
          onShipRetail={handleShipRetail}
          onCompleteService={handleCompleteService}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StaffHeader
        storeName="Royal City Hub"
        onStorePress={() => Alert.alert('Store', 'Chọn điểm giao dịch')}
        onNotificationPress={() => Alert.alert('Notifications', 'Xem thông báo')}
        onPrintPress={() => Alert.alert('Print', 'In đơn hàng')}
        hasNotification={true}
      />

      {activeTab === 'orders' && (
        <OrdersScreen onOrderPress={handleOrderPress} onQRScan={handleQRScan} />
      )}

      {activeTab === 'inventory' && <InventoryScreen onAddStock={handleAddStock} />}

      {activeTab === 'logistics' && (
        <LogisticsScreen
          onCreateShipment={handleCreateShipment}
          onReceiveShipment={handleReceiveShipment}
        />
      )}

      {activeTab === 'report' && <ReportScreen onShowDetail={handleShowReportDetail} />}

      <StaffBottomNav activeTab={activeTab} onTabChange={setActiveTab} onQRScan={handleQRScan} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
});

