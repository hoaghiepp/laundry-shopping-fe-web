import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export interface OrderItem {
  icon: string;
  text: string;
  iconColor: string;
}

interface OrderCardProps {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerTier?: string;
  items: OrderItem[];
  status: {
    text: string;
    bgColor: string;
    textColor: string;
  };
  borderColor: string;
  badge?: {
    text: string;
    icon: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
  };
  actionButton?: {
    text: string;
    onPress: () => void;
  };
  footerNote?: string;
  onPress?: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  orderId,
  customerName,
  customerPhone,
  customerTier,
  items,
  status,
  borderColor,
  badge,
  actionButton,
  footerNote,
  onPress,
}) => {
  return (
    <TouchableOpacity
      className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${borderColor} border border-gray-100 active:scale-95`}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={!onPress}
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="font-bold text-gray-800 text-sm">{orderId}</Text>
        <View className="flex-row gap-1">
          {badge && (
            <View className={`${badge.bgColor} px-2 py-0.5 rounded border ${badge.borderColor}`}>
              <Text className={`${badge.textColor} text-[9px] font-bold`}>
                <FontAwesome5 name={badge.icon} size={9} /> {badge.text}
              </Text>
            </View>
          )}
          <View className={`${status.bgColor} px-2 py-0.5 rounded`}>
            <Text className={`${status.textColor} text-[9px] font-bold`}>{status.text}</Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center gap-3 mb-3">
        <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
          <Text className="text-blue-600 font-bold text-xs">{customerName.substring(0, 2).toUpperCase()}</Text>
        </View>
        <View>
          <Text className="text-xs font-bold text-gray-700">{customerName}</Text>
          <Text className="text-[10px] text-gray-500">
            {customerPhone}
          </Text>
        </View>
      </View>

      {items.length > 0 && (
        <View className="bg-gray-50 p-2 rounded-lg mb-3 border border-gray-100">
          {items.map((item, index) => (
            <View key={index} className="flex-row items-center gap-2 mb-1">
              <FontAwesome5 name={item.icon} size={12} color={item.iconColor} style={{ width: 16 }} />
              <Text className="text-xs text-gray-600 flex-1">{item.text}</Text>
            </View>
          ))}
        </View>
      )}

      <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
        {footerNote && <Text className="text-[10px] text-gray-400">{footerNote}</Text>}
        {actionButton && (
          <TouchableOpacity
            className="bg-blue-600 px-3 py-1.5 rounded-lg shadow"
            onPress={actionButton.onPress}
            activeOpacity={0.8}
          >
            <Text className="text-white text-xs font-bold">{actionButton.text}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

