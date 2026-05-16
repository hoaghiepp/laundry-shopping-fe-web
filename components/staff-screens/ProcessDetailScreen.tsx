import { FontAwesome5 } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stepper } from "../staff/Stepper";

interface ProcessDetailScreenProps {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerTier?: string;
  customerAddress: string;
  onBack: () => void;
  onShipRetail: () => void;
  onCompleteService: () => void;
}

export const ProcessDetailScreen: React.FC<ProcessDetailScreenProps> = ({
  orderId,
  customerName,
  customerPhone,
  customerTier,
  customerAddress,
  onBack,
  onShipRetail,
  onCompleteService,
}) => {
  const [weight, setWeight] = useState("5.0");
  const [retailShipped, setRetailShipped] = useState(false);

  const handleCall = () => {
    Linking.openURL(`tel:${customerPhone}`);
  };

  const handlePrintTag = () => {
    Alert.alert("In Tem", "Đang gửi lệnh in...");
  };

  const handleShipRetail = () => {
    setRetailShipped(true);
    onShipRetail();
  };

  return (
    <View className="flex-1 bg-white">
      <View className="bg-white border-b border-gray-200 p-4 pt-8 shadow-sm">
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              className="w-8 h-8 items-center justify-center rounded-full hover:bg-gray-100"
              onPress={onBack}
            >
              <FontAwesome5 name="arrow-left" size={16} color="#6B7280" />
            </TouchableOpacity>
            <Text className="font-bold text-gray-800">Đơn {orderId}</Text>
          </View>
          <View className="bg-purple-50 border border-purple-200 px-2 py-1 rounded">
            <Text className="text-purple-700 text-[10px] font-bold">
              <FontAwesome5 name="random" size={9} /> Đơn Tách Chuyến
            </Text>
          </View>
        </View>

        <View className="bg-gray-50 rounded-lg p-3 flex-row justify-between items-start mt-2 border border-gray-100">
          <View className="flex-row gap-3">
            <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center">
              <Text className="text-blue-600 font-bold text-xs">
                {customerName.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View>
              <View className="flex-row items-center gap-1">
                <Text className="text-sm font-bold text-gray-800">
                  {customerName}
                </Text>
                {customerTier && (
                  <View className="bg-yellow-50 border border-yellow-200 px-1 rounded">
                    <Text className="text-[10px] text-yellow-600">
                      {customerTier}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={handleCall}>
                <Text className="text-xs text-gray-600 mt-0.5">
                  <FontAwesome5 name="phone-alt" size={10} color="#9CA3AF" />{" "}
                  <Text className="text-blue-600">{customerPhone}</Text>
                </Text>
              </TouchableOpacity>
              <Text className="text-xs text-gray-600 mt-0.5" numberOfLines={1}>
                <FontAwesome5 name="map-marker-alt" size={10} color="#9CA3AF" />{" "}
                {customerAddress}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            className="w-8 h-8 rounded-full bg-white border border-gray-200 items-center justify-center shadow-sm"
            onPress={handleCall}
          >
            <FontAwesome5 name="phone" size={12} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        <Stepper
          steps={[
            { label: "Tiếp nhận", active: true },
            { label: "Lấy hàng", active: false },
            { label: "Xử lý", active: false },
            { label: "Xác nhận", active: false },
            { label: "Trả", active: false },
          ]}
        />
      </View>

      <ScrollView
        className="flex-1 p-4 bg-gray-50"
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: RETAIL PICKING (GIAO NGAY) */}
        <View className="mb-4 bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-purple-500 border border-gray-200">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center gap-2">
              <View className="bg-purple-100 p-1 rounded">
                <FontAwesome5 name="shipping-fast" size={12} color="#7C3AED" />
              </View>
              <Text className="text-xs font-bold text-purple-700 uppercase">
                Chuyến 1: Giao Ngay
              </Text>
            </View>
            <View
              className={`px-2 py-0.5 rounded ${
                retailShipped ? "bg-green-100" : "bg-gray-100"
              }`}
            >
              <Text
                className={`text-[9px] font-bold ${
                  retailShipped ? "text-green-600" : "text-gray-500"
                }`}
              >
                {retailShipped ? "Đang giao" : "Chưa xử lý"}
              </Text>
            </View>
          </View>

          <View className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-3">
            <View className="flex-row items-center gap-3">
              <View>
                <Text className="text-sm font-bold text-gray-800">
                  Nước giặt Omo Túi 3.6kg
                </Text>
                <Text className="text-xs text-gray-500">
                  SL: 1 •{" "}
                  <Text className="text-purple-600 font-bold">Thu 120k</Text>
                </Text>
              </View>
            </View>
          </View>

          <View className="border-t border-gray-100 pt-3 flex-row justify-between items-center">
            <View>
              <Text className="text-[10px] text-gray-500">
                Thu hộ chuyến này (COD)
              </Text>
              <Text className="font-bold text-blue-600 text-sm">
                135.000đ{" "}
                <Text className="text-[9px] text-gray-400 font-normal">
                  (Gồm 15k ship)
                </Text>
              </Text>
            </View>
            <TouchableOpacity
              className={`${
                retailShipped ? "bg-green-600" : "bg-purple-600"
              } px-3 py-2 rounded-lg shadow flex-row items-center gap-1`}
              onPress={handleShipRetail}
              disabled={retailShipped}
            >
              <FontAwesome5
                name={retailShipped ? "check" : "motorcycle"}
                size={12}
                color="#FFFFFF"
              />
              <Text className="text-white text-xs font-bold">
                {retailShipped ? "Đã gọi Ship" : "Gọi Ship Ngay"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 2: SERVICE PROCESSING (GIAO SAU) */}
        <View className="mb-4 bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-blue-500 border border-gray-200">
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center gap-2">
              <View className="bg-blue-100 p-1 rounded">
                <FontAwesome5 name="tshirt" size={12} color="#3B82F6" />
              </View>
              <Text className="text-xs font-bold text-blue-700 uppercase">
                Chuyến 2: Giặt Là (Trả sau)
              </Text>
            </View>
            <View className="bg-gray-100 px-2 py-0.5 rounded">
              <Text className="text-gray-500 text-[9px] font-bold">
                Chưa xử lý
              </Text>
            </View>
          </View>

          <View className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 mb-3">
            <View className="flex-row justify-between mb-2">
              <Text className="font-bold text-gray-800 text-sm">
                Giặt Chăn Bông
              </Text>
              <View className="bg-blue-100 px-1.5 py-0.5 rounded">
                <Text className="text-blue-700 text-[10px]">Gói 3 lần</Text>
              </View>
            </View>

            <View className="flex-row gap-3 mb-3">
              <View className="flex-1 bg-white p-2 rounded border border-gray-200">
                <Text className="text-[9px] text-gray-400">KHÁCH BÁO</Text>
                <Text className="font-bold text-gray-800">5.0 kg</Text>
              </View>
              <View className="flex-1 bg-white p-2 rounded border border-blue-300">
                <Text className="text-[9px] text-blue-500 font-bold">
                  THỰC TẾ
                </Text>
                <View className="flex-row items-baseline">
                  <TextInput
                    className="flex-1 font-bold text-blue-700 text-lg p-0"
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                  />
                  <Text className="text-xs text-gray-500">kg</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              className="bg-white border border-gray-300 py-2 rounded-lg flex-row items-center justify-center gap-2"
              onPress={handlePrintTag}
            >
              <FontAwesome5 name="print" size={12} color="#374151" />
              <Text className="text-gray-700 text-xs font-bold">
                In Tem (1 cái)
              </Text>
            </TouchableOpacity>
          </View>

          <View className="border-t border-gray-100 pt-3">
            <Text className="text-[10px] text-gray-500 mb-2 italic">
              *COD chuyến này sẽ thu khi trả đồ sạch (nếu có)
            </Text>
            <TouchableOpacity
              className="bg-blue-600 py-3 rounded-lg shadow flex-row justify-center items-center gap-2"
              onPress={onCompleteService}
            >
              <FontAwesome5 name="truck-loading" size={12} color="#FFFFFF" />
              <Text className="text-white text-xs font-bold">
                Hoàn tất & Chờ đi Xưởng
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
