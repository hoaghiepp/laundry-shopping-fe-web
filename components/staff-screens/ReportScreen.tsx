import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface ReportScreenProps {
  onShowDetail?: (type: string) => void;
}

export const ReportScreen: React.FC<ReportScreenProps> = ({ onShowDetail }) => {
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    // Set today's date on mount
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Chọn ngày';
    const date = new Date(dateStr);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 pb-20 shadow-md">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white font-bold text-lg">Báo cáo</Text>
          <TouchableOpacity className="bg-blue-700 px-3 py-1.5 rounded-lg shadow-inner flex-row items-center">
            <Text className="text-white text-[10px] font-bold uppercase tracking-wider">
              {formatDate(selectedDate)}
            </Text>
            <FontAwesome5 name="calendar-alt" size={10} color="#FFFFFF" style={{ marginLeft: 4, opacity: 0.8 }} />
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-4">
          <TouchableOpacity 
            className="flex-1" 
            onPress={() => onShowDetail?.('orders')}
            activeOpacity={0.7}
          >
            <Text className="text-xs text-blue-200 uppercase font-bold mb-1">Tổng Đơn</Text>
            <Text className="text-3xl font-bold text-white">25</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 items-end" 
            onPress={() => onShowDetail?.('revenue')}
            activeOpacity={0.7}
          >
            <Text className="text-xs text-blue-200 uppercase font-bold mb-1">Doanh thu (GMV)</Text>
            <Text className="text-2xl font-bold text-white">5.200k</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 -mt-8 relative" showsVerticalScrollIndicator={false}>
        {/* Cash Flow Card */}
        <TouchableOpacity
          className="bg-white rounded-xl shadow-lg p-4 border border-blue-100 mb-4 active:scale-95"
          onPress={() => onShowDetail?.('cash')}
          activeOpacity={0.9}
        >
          <View className="flex-row justify-between items-center mb-3">
            <Text className="font-bold text-gray-700 text-sm uppercase">
              <FontAwesome5 name="wallet" size={12} color="#3B82F6" /> Thực thu tiền mặt
            </Text>
            <View className="bg-green-100 px-2 py-0.5 rounded">
              <Text className="text-xs text-green-700 font-bold">Đã chốt két</Text>
            </View>
          </View>

          <View className="flex-row justify-between items-end border-b border-gray-100 pb-3 mb-3">
            <View className="items-center flex-1 border-r border-gray-100">
              <Text className="text-xs text-gray-500 mb-1">COD Đơn hàng</Text>
              <Text className="text-lg font-bold text-gray-800">850k</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-xs text-gray-500 mb-1">Bán lẻ tại quầy</Text>
              <Text className="text-lg font-bold text-gray-800">650k</Text>
            </View>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-sm font-bold text-blue-800">Tổng nộp về Cty:</Text>
            <Text className="text-xl font-bold text-blue-600">1.500.000đ</Text>
          </View>
        </TouchableOpacity>

        {/* Chart Section */}
        <View className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <Text className="font-bold text-gray-700 text-sm mb-4">Trạng thái đơn hàng</Text>
          <View className="space-y-3">
            <View>
              <View className="flex-row justify-between text-xs mb-1">
                <Text className="font-bold text-gray-600 text-xs">Mới nhận</Text>
                <Text className="font-bold text-xs">3</Text>
              </View>
              <View className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <View className="bg-blue-500 h-full" style={{ width: '12%' }} />
              </View>
            </View>

            <View>
              <View className="flex-row justify-between text-xs mb-1">
                <Text className="font-bold text-gray-600 text-xs">Đang xử lý/Xưởng</Text>
                <Text className="font-bold text-xs">17</Text>
              </View>
              <View className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <View className="bg-yellow-500 h-full" style={{ width: '68%' }} />
              </View>
            </View>

            <View>
              <View className="flex-row justify-between text-xs mb-1">
                <Text className="font-bold text-gray-600 text-xs">Chờ trả khách</Text>
                <Text className="font-bold text-xs">5</Text>
              </View>
              <View className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <View className="bg-green-500 h-full" style={{ width: '20%' }} />
              </View>
            </View>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    </View>
  );
};

