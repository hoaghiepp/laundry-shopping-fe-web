import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

type LogisticsTabType = 'out' | 'in';

interface LogisticsScreenProps {
  onCreateShipment: () => void;
  onReceiveShipment: () => void;
}

export const LogisticsScreen: React.FC<LogisticsScreenProps> = ({
  onCreateShipment,
  onReceiveShipment,
}) => {
  const [activeTab, setActiveTab] = useState<LogisticsTabType>('out');

  return (
    <View className="flex-1">
      <View className="bg-white p-4 shadow-sm border-b border-gray-100">
        <Text className="font-bold text-gray-800 text-lg mb-3">Điều phối Vận chuyển</Text>
        <View className="flex-row bg-gray-100 p-1 rounded-lg">
          <TouchableOpacity
            className={`flex-1 py-1.5 rounded ${
              activeTab === 'out' ? 'bg-white shadow-sm' : ''
            }`}
            onPress={() => setActiveTab('out')}
          >
            <Text
              className={`text-xs font-bold text-center ${
                activeTab === 'out' ? 'text-blue-800' : 'text-gray-500'
              }`}
            >
              Chuyển đi (Out)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-1.5 rounded ${
              activeTab === 'in' ? 'bg-white shadow-sm' : ''
            }`}
            onPress={() => setActiveTab('in')}
          >
            <Text
              className={`text-xs font-bold text-center ${
                activeTab === 'in' ? 'text-green-800' : 'text-gray-500'
              }`}
            >
              Nhận về (In)
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4 bg-gray-50" showsVerticalScrollIndicator={false}>
        {activeTab === 'out' ? (
          <View>
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center mb-6">
              <Text className="text-xs text-blue-600 font-bold uppercase mb-1">
                Đơn hàng chờ chuyển xưởng
              </Text>
              <View className="flex-row justify-center items-baseline mb-2">
                <Text className="text-4xl font-bold text-blue-800">08</Text>
                <Text className="text-sm text-blue-800 ml-1">đơn</Text>
              </View>
              <View className="flex-row justify-center gap-4 mb-4">
                <Text className="text-xs text-gray-500">
                  <FontAwesome5 name="weight-hanging" size={10} /> 35kg
                </Text>
                <Text className="text-xs text-gray-500">
                  <FontAwesome5 name="tshirt" size={10} /> 12 áo lẻ
                </Text>
              </View>
              <TouchableOpacity
                className="bg-blue-600 py-3 rounded-xl shadow-lg flex-row items-center justify-center gap-2"
                onPress={onCreateShipment}
              >
                <FontAwesome5 name="qrcode" size={14} color="#FFFFFF" />
                <Text className="text-white font-bold text-sm">Quét gom đơn & Tạo chuyến</Text>
              </TouchableOpacity>
            </View>

            <Text className="font-bold text-gray-700 text-sm mb-3">Lịch sử Chuyến đi</Text>
            <View className="bg-white p-3 rounded-xl border border-gray-200 flex-row justify-between items-center mb-2">
              <View>
                <Text className="font-bold text-xs text-gray-800">Chuyến #TRUCK-992</Text>
                <Text className="text-[10px] text-gray-500">10:00 AM • Đang đến Xưởng A</Text>
              </View>
              <View className="bg-yellow-100 px-2 py-1 rounded">
                <Text className="text-[10px] text-yellow-700 font-bold">Đang đi</Text>
              </View>
            </View>
          </View>
        ) : (
          <View>
            <View className="bg-green-50 border border-green-200 rounded-xl p-4 text-center mb-6">
              <Text className="text-xs text-green-600 font-bold uppercase mb-1">
                Nhận đồ sạch từ Xưởng
              </Text>
              <Text className="text-lg font-bold text-green-800 mb-2">#TRUCK-RETURN-88</Text>
              <View className="bg-white p-2 rounded-lg mb-3 border border-green-100">
                <Text className="text-xs text-left mb-1">📦 03 Bao tải đồ sạch</Text>
                <Text className="text-xs text-left">👔 05 Áo treo (Giặt khô)</Text>
              </View>
              <TouchableOpacity
                className="bg-green-600 py-3 rounded-xl shadow-lg flex-row items-center justify-center gap-2"
                onPress={onReceiveShipment}
              >
                <FontAwesome5 name="barcode" size={14} color="#FFFFFF" />
                <Text className="text-white font-bold text-sm">Quét mã nhận hàng</Text>
              </TouchableOpacity>
            </View>

            <Text className="font-bold text-gray-700 text-sm mb-3">Lịch sử Nhận hàng</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

