import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface InventoryItemProps {
  name: string;
  sku: string;
  location: string;
  quantity: number;
  unit: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  isLowStock?: boolean;
  onAddStock: () => void;
}

export const InventoryItem: React.FC<InventoryItemProps> = ({
  name,
  sku,
  location,
  quantity,
  unit,
  icon,
  iconColor,
  iconBg,
  isLowStock = false,
  onAddStock,
}) => {
  return (
    <View
      className={`bg-white p-3 rounded-xl shadow-sm border ${
        isLowStock ? 'border-l-4 border-l-yellow-400 border-gray-200' : 'border-gray-200'
      } flex-row gap-3`}
    >
      <View className={`w-14 h-14 ${iconBg} rounded-lg items-center justify-center`}>
        <FontAwesome5 name={icon} size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="font-bold text-sm text-gray-800">{name}</Text>
        <Text className="text-[10px] text-gray-500">
          {location} • SKU: {sku}
        </Text>
        <View className="flex-row justify-between items-end mt-1">
          <Text className={`text-sm font-bold ${isLowStock ? 'text-yellow-600' : 'text-green-600'}`}>
            {quantity}{' '}
            <Text className="text-[10px] font-normal text-gray-400">{unit}</Text>
          </Text>
          <TouchableOpacity
            className={`${
              isLowStock ? 'bg-yellow-100 border-yellow-200' : 'bg-blue-50 border-blue-100'
            } px-3 py-1 rounded-lg border`}
            onPress={onAddStock}
            activeOpacity={0.7}
          >
            <Text className={`text-[10px] font-bold ${isLowStock ? 'text-yellow-700' : 'text-blue-600'}`}>
              <FontAwesome5 name="plus" size={9} /> {isLowStock ? 'Nhập thêm' : 'Nhập'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

