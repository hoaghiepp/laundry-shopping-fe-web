import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface StaffHeaderProps {
  storeName: string;
  onStorePress: () => void;
  onNotificationPress: () => void;
  onPrintPress: () => void;
  hasNotification?: boolean;
}

export const StaffHeader: React.FC<StaffHeaderProps> = ({
  storeName,
  onStorePress,
  onNotificationPress,
  onPrintPress,
  hasNotification = false,
}) => {
  return (
    <View className="bg-blue-800 px-4 py-3 pt-8 flex-row justify-between items-center shadow-md">
      <TouchableOpacity onPress={onStorePress} activeOpacity={0.7}>
        <Text className="text-blue-200 text-[10px] uppercase">ĐIỂM GIAO DỊCH</Text>
        <View className="flex-row items-center">
          <FontAwesome5 name="store" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text className="text-white font-bold text-sm">{storeName}</Text>
          <FontAwesome5 name="caret-down" size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
        </View>
      </TouchableOpacity>
      
      <View className="flex-row gap-3">
        <TouchableOpacity 
          className="bg-blue-700 w-8 h-8 rounded-full items-center justify-center relative"
          onPress={onNotificationPress}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="bell" size={12} color="#FFFFFF" />
          {hasNotification && (
            <View className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-blue-700" />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="bg-blue-700 w-8 h-8 rounded-full items-center justify-center"
          onPress={onPrintPress}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="print" size={12} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

