import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export type StaffTabType = 'orders' | 'inventory' | 'logistics' | 'report';

interface StaffBottomNavProps {
  activeTab: StaffTabType;
  onTabChange: (tab: StaffTabType) => void;
  onQRScan?: () => void;
}

export const StaffBottomNav: React.FC<StaffBottomNavProps> = ({
  activeTab,
  onTabChange,
  onQRScan,
}) => {
  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 pb-5 flex-row justify-between items-center z-50">
      <TouchableOpacity
        className="flex-col items-center"
        onPress={() => onTabChange('orders')}
        activeOpacity={0.7}
      >
        <FontAwesome5 
          name="clipboard-list" 
          size={18} 
          color={activeTab === 'orders' ? '#2563EB' : '#9CA3AF'} 
          style={{ marginBottom: 4 }}
        />
        <Text className={`text-[10px] font-bold ${activeTab === 'orders' ? 'text-blue-600' : 'text-gray-400'}`}>
          Đơn hàng
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        className="flex-col items-center"
        onPress={() => onTabChange('inventory')}
        activeOpacity={0.7}
      >
        <FontAwesome5 
          name="boxes" 
          size={18} 
          color={activeTab === 'inventory' ? '#2563EB' : '#9CA3AF'} 
          style={{ marginBottom: 4 }}
        />
        <Text className={`text-[10px] font-bold ${activeTab === 'inventory' ? 'text-blue-600' : 'text-gray-400'}`}>
          Kho
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        className="bg-blue-600 w-12 h-12 rounded-full -mt-6 shadow-lg items-center justify-center border-4 border-gray-100"
        onPress={onQRScan}
        activeOpacity={0.8}
      >
        <FontAwesome5 name="qrcode" size={20} color="#FFFFFF" />
      </TouchableOpacity>
      
      <TouchableOpacity
        className="flex-col items-center"
        onPress={() => onTabChange('logistics')}
        activeOpacity={0.7}
      >
        <FontAwesome5 
          name="truck-moving" 
          size={18} 
          color={activeTab === 'logistics' ? '#2563EB' : '#9CA3AF'} 
          style={{ marginBottom: 4 }}
        />
        <Text className={`text-[10px] font-bold ${activeTab === 'logistics' ? 'text-blue-600' : 'text-gray-400'}`}>
          Giao nhận
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        className="flex-col items-center"
        onPress={() => onTabChange('report')}
        activeOpacity={0.7}
      >
        <FontAwesome5 
          name="chart-pie" 
          size={18} 
          color={activeTab === 'report' ? '#2563EB' : '#9CA3AF'} 
          style={{ marginBottom: 4 }}
        />
        <Text className={`text-[10px] font-bold ${activeTab === 'report' ? 'text-blue-600' : 'text-gray-400'}`}>
          Báo cáo
        </Text>
      </TouchableOpacity>
    </View>
  );
};

