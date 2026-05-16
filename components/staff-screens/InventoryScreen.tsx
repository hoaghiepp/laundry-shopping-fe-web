import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { InventoryItem } from '../staff/InventoryItem';

interface InventoryScreenProps {
  onAddStock: (itemId: string) => void;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({ onAddStock }) => {
  const [filterTab, setFilterTab] = useState<'all' | 'low'>('all');

  const inventoryItems = [
    {
      id: '1',
      name: 'Nước giặt Omo 3.6kg',
      sku: 'OMO-360',
      location: 'Kệ A-01',
      quantity: 45,
      unit: 'túi',
      icon: 'bottle-water',
      iconColor: '#9CA3AF',
      iconBg: 'bg-gray-100',
      isLowStock: false,
    },
    {
      id: '2',
      name: 'Giấy thơm Bounce',
      sku: 'BOU-100',
      location: 'Kệ B-02',
      quantity: 3,
      unit: 'hộp',
      icon: 'box-open',
      iconColor: '#EAB308',
      iconBg: 'bg-yellow-50',
      isLowStock: true,
    },
  ];

  const filteredItems = filterTab === 'all' 
    ? inventoryItems 
    : inventoryItems.filter(item => item.isLowStock);

  return (
    <View className="flex-1">
      <View className="bg-white p-4 shadow-sm">
        <Text className="font-bold text-gray-800 text-lg">Kho hàng 123 Tiện ích</Text>
        <View className="flex-row gap-2 mt-2">
          <TouchableOpacity
            className={`px-3 py-1 rounded-full ${
              filterTab === 'all' ? 'bg-gray-800' : 'bg-white border border-gray-300'
            }`}
            onPress={() => setFilterTab('all')}
          >
            <Text
              className={`text-xs font-bold ${
                filterTab === 'all' ? 'text-white' : 'text-gray-500'
              }`}
            >
              Tất cả
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-3 py-1 rounded-full ${
              filterTab === 'low' ? 'bg-gray-800' : 'bg-white border border-gray-300'
            }`}
            onPress={() => setFilterTab('low')}
          >
            <Text
              className={`text-xs font-bold ${
                filterTab === 'low' ? 'text-white' : 'text-gray-500'
              }`}
            >
              Sắp hết
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4 bg-gray-50" showsVerticalScrollIndicator={false}>
        <View className="space-y-3">
          {filteredItems.map((item) => (
            <InventoryItem
              key={item.id}
              name={item.name}
              sku={item.sku}
              location={item.location}
              quantity={item.quantity}
              unit={item.unit}
              icon={item.icon}
              iconColor={item.iconColor}
              iconBg={item.iconBg}
              isLowStock={item.isLowStock}
              onAddStock={() => onAddStock(item.id)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

