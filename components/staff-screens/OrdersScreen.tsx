import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { OrderCard } from '../staff/OrderCard';

type OrderTabType = 'new' | 'processing' | 'factory' | 'pickup';

interface OrdersScreenProps {
  onOrderPress: (orderId: string, type: string) => void;
  onQRScan: () => void;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({ onOrderPress, onQRScan }) => {
  const [activeTab, setActiveTab] = useState<OrderTabType>('new');
  const [searchQuery, setSearchQuery] = useState('');

  const renderNewOrders = () => (
    <View>
      <OrderCard
        orderId="#DH-2310-001"
        customerName="Nguyễn Văn A"
        customerPhone="0912 345 678"
        customerTier={undefined}
        items={[
          { icon: 'box-open', text: 'Nước giặt Omo (Giao ngay)', iconColor: '#FB923C' },
          { icon: 'tshirt', text: 'Giặt chăn (Giao sau)', iconColor: '#60A5FA' },
        ]}
        status={{ text: 'Mới nhận', bgColor: 'bg-blue-100', textColor: 'text-blue-700' }}
        borderColor="border-blue-500"
        badge={{
          text: 'Giao riêng',
          icon: 'shipping-fast',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-700',
          borderColor: 'border-purple-200',
        }}
        footerNote="Khách yêu cầu tách đơn"
        actionButton={{
          text: 'Xử lý ngay',
          onPress: () => onOrderPress('#DH-2310-001', 'mixed-split'),
        }}
        onPress={() => onOrderPress('#DH-2310-001', 'mixed-split')}
      />
    </View>
  );

  const renderProcessingOrders = () => (
    <View>
      <View className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-orange-400 mb-3">
        <View className="flex-row justify-between items-start mb-2">
          <Text className="font-bold text-gray-800 text-sm">#DH-2310-008</Text>
          <View className="bg-orange-100 px-2 py-0.5 rounded">
            <Text className="text-orange-700 text-[10px] font-bold">Đang xử lý</Text>
          </View>
        </View>
        <Text className="text-xs text-gray-600 mb-2 font-medium">
          Đã cân xong (5.5kg). Chưa bắn tem.
        </Text>
        <View className="flex-row justify-end">
          <TouchableOpacity
            className="bg-orange-50 border border-orange-200 px-3 py-1 rounded"
            onPress={() => onOrderPress('#DH-2310-008', 'printing')}
          >
            <Text className="text-xs text-orange-700 font-bold">Tiếp tục in</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-purple-500">
        <View className="flex-row justify-between items-start mb-2">
          <Text className="font-bold text-gray-800 text-sm">#DH-2310-009</Text>
          <View className="bg-purple-100 px-2 py-0.5 rounded">
            <Text className="text-purple-700 text-[10px] font-bold">Soạn hàng</Text>
          </View>
        </View>
        <Text className="text-xs text-gray-600 mb-2 font-medium">
          Đang nhặt: 2 Nước giặt, 1 Giấy thơm
        </Text>
        <View className="flex-row justify-end">
          <TouchableOpacity
            className="bg-purple-50 border border-purple-200 px-3 py-1 rounded"
            onPress={() => onOrderPress('#DH-2310-009', 'picking')}
          >
            <Text className="text-xs text-purple-700 font-bold">Tiếp tục</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFactoryOrders = () => (
    <View>
      <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-3">
        <View className="flex-row justify-between mb-2">
          <Text className="font-bold text-gray-800 text-sm">#DH-2309-992</Text>
          <View className="bg-gray-100 px-2 py-0.5 rounded">
            <Text className="text-gray-600 text-[10px] font-bold">Lô #BATCH-102</Text>
          </View>
        </View>
        <View className="bg-blue-50 p-2 rounded-lg flex-row items-center">
          <FontAwesome5 name="truck-moving" size={12} color="#3B82F6" style={{ marginRight: 8 }} />
          <Text className="text-xs text-blue-600">Đã giao cho xe tải lúc 10:00 AM</Text>
        </View>
      </View>

      <View className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-red-500 border-gray-200">
        <View className="flex-row justify-between items-start mb-2">
          <Text className="font-bold text-gray-800 text-sm">#DH-2309-988</Text>
          <View className="bg-red-100 px-2 py-0.5 rounded">
            <Text className="text-red-700 text-[10px] font-bold">Sự cố</Text>
          </View>
        </View>
        <Text className="text-xs text-gray-600 mb-2">
          Xưởng báo: <Text className="font-bold text-red-600">Rách nách áo Vest</Text>
        </Text>
        <View className="bg-red-50 p-2 rounded flex-row justify-between items-center">
          <Text className="text-xs text-red-500 font-bold">
            <FontAwesome5 name="exclamation-triangle" size={10} /> Chờ khách xác nhận
          </Text>
        </View>
      </View>
    </View>
  );

  const renderPickupOrders = () => (
    <View>
      <View className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-l-green-500">
        <View className="flex-row justify-between items-start mb-2">
          <Text className="font-bold text-gray-800 text-sm">#DH-2309-999</Text>
          <View className="bg-green-100 px-2 py-0.5 rounded">
            <Text className="text-green-700 text-[10px] font-bold">Sẵn sàng trả</Text>
          </View>
        </View>
        <View className="border-t border-dashed border-gray-300 my-2 pt-2 flex-row justify-between items-center">
          <Text className="text-xs text-gray-500">Cần thu tiền mặt:</Text>
          <Text className="text-lg font-bold text-blue-600">50.000đ</Text>
        </View>
        <TouchableOpacity className="bg-green-600 py-2 rounded-lg shadow mt-1">
          <Text className="text-white text-xs font-bold text-center">
            <FontAwesome5 name="check-circle" size={10} /> Xác nhận Đã trả & Thu tiền
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white p-4 shadow-sm">
        <View className="bg-gray-100 rounded-xl flex-row items-center px-3 py-2.5 mb-3 border border-gray-200">
          <FontAwesome5 name="search" size={14} color="#9CA3AF" />
          <TextInput
            className="bg-transparent text-sm ml-2 flex-1 text-gray-700"
            placeholder="Tìm tên, SĐT, mã đơn..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={onQRScan}>
            <FontAwesome5 name="qrcode" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View className="flex-row -mx-4">
          <TouchableOpacity
            className={`px-4 py-2 border-b-2 whitespace-nowrap ${
              activeTab === 'new'
                ? 'bg-blue-50 border-blue-600'
                : 'bg-white border-transparent'
            }`}
            onPress={() => setActiveTab('new')}
          >
            <Text
              className={`text-xs font-bold whitespace-nowrap ${
                activeTab === 'new' ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              Mới về (3)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`px-4 py-2 border-b-2 whitespace-nowrap ${
              activeTab === 'processing'
                ? 'bg-blue-50 border-blue-600'
                : 'bg-white border-transparent'
            }`}
            onPress={() => setActiveTab('processing')}
          >
            <Text
              className={`text-xs font-bold whitespace-nowrap ${
                activeTab === 'processing' ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              Đang xử lý (2)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`px-4 py-2 border-b-2 whitespace-nowrap ${
              activeTab === 'factory'
                ? 'bg-blue-50 border-blue-600'
                : 'bg-white border-transparent'
            }`}
            onPress={() => setActiveTab('factory')}
          >
            <Text
              className={`text-xs font-bold whitespace-nowrap ${
                activeTab === 'factory' ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              Ở Xưởng (8)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`px-4 py-2 border-b-2 whitespace-nowrap ${
              activeTab === 'pickup'
                ? 'bg-blue-50 border-blue-600'
                : 'bg-white border-transparent'
            }`}
            onPress={() => setActiveTab('pickup')}
          >
            <Text
              className={`text-xs font-bold whitespace-nowrap ${
                activeTab === 'pickup' ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              Chờ trả (4)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {activeTab === 'new' && renderNewOrders()}
        {activeTab === 'processing' && renderProcessingOrders()}
        {activeTab === 'factory' && renderFactoryOrders()}
        {activeTab === 'pickup' && renderPickupOrders()}
      </ScrollView>
    </View>
  );
};

