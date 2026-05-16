import {
  AddToCartButton,
  PriceSummaryCard,
  QuantitySelector,
  ServiceFeature,
  ServiceFeatureList,
  ServiceOption,
  ServiceOptionCard,
} from '@/components/laundry';
import { Box } from '@/components/ui/box';
import { Text as UIText } from '@/components/ui/text';
import { FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

interface LaundryServiceScreenProps {
  serviceId?: string;
  serviceName?: string;
  onBack?: () => void;
  onAddToCart?: (order: LaundryOrder) => void;
}

export interface LaundryOrder {
  serviceId: string;
  serviceName: string;
  optionId: string;
  quantity: number;
  unit: string;
  totalPrice: number;
}

const DEFAULT_SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: 'wash-dry-regular',
    name: 'Giặt Sấy Thường',
    description: 'Giặt và sấy khô thông thường, phù hợp cho quần áo hàng ngày',
    icon: 'tshirt',
    iconColor: '#2563EB',
    iconBg: '#EFF6FF',
    price: 25000,
    unit: 'kg',
    isRecommended: true,
  },
  {
    id: 'wash-dry-express',
    name: 'Giặt Sấy Nhanh',
    description: 'Giao hàng trong 24h, phù hợp khi cần gấp',
    icon: 'bolt',
    iconColor: '#F59E0B',
    iconBg: '#FEF3C7',
    price: 35000,
    unit: 'kg',
  },
  {
    id: 'wash-only',
    name: 'Chỉ Giặt',
    description: 'Chỉ giặt, không sấy, tiết kiệm chi phí',
    icon: 'water',
    iconColor: '#059669',
    iconBg: '#ECFDF5',
    price: 15000,
    unit: 'kg',
  },
  {
    id: 'dry-clean',
    name: 'Giặt Khô',
    description: 'Dịch vụ giặt khô chuyên nghiệp cho đồ cao cấp',
    icon: 'user-tie',
    iconColor: '#9333EA',
    iconBg: '#F3E8FF',
    price: 50000,
    unit: 'item',
  },
];

const DEFAULT_FEATURES: ServiceFeature[] = [
  {
    id: '1',
    icon: 'check-circle',
    title: 'Giặt sạch 100%',
    description: 'Sử dụng công nghệ giặt hiện đại, đảm bảo quần áo sạch sẽ',
  },
  {
    id: '2',
    icon: 'shield-alt',
    title: 'An toàn vệ sinh',
    description: 'Tuân thủ quy trình vệ sinh nghiêm ngặt, không gây hại da',
  },
  {
    id: '3',
    icon: 'truck',
    title: 'Miễn phí giao nhận',
    description: 'Giao nhận tận nơi miễn phí trong bán kính 5km',
  },
  {
    id: '4',
    icon: 'clock',
    title: 'Giao hàng nhanh',
    description: 'Thời gian giao hàng từ 2-3 ngày làm việc',
  },
];

export const LaundryServiceScreen: React.FC<LaundryServiceScreenProps> = ({
  serviceId = 'wash-dry',
  serviceName = 'Giặt Sấy',
  onBack,
  onAddToCart,
}) => {
  const [selectedOption, setSelectedOption] = useState<string>(
    DEFAULT_SERVICE_OPTIONS[0].id
  );
  const [quantity, setQuantity] = useState<number>(1);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (onBack) {
          onBack();
          return true; // Prevent default behavior (exit app)
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [onBack]);

  const currentOption = DEFAULT_SERVICE_OPTIONS.find(
    (opt) => opt.id === selectedOption
  ) || DEFAULT_SERVICE_OPTIONS[0];

  const calculatePrice = () => {
    return currentOption.price * quantity;
  };

  const calculateDiscount = () => {
    // Example: 10% discount for orders over 5kg/items
    if (quantity >= 5) {
      return Math.floor(calculatePrice() * 0.1);
    }
    return 0;
  };

  const subtotal = calculatePrice();
  const discount = calculateDiscount();
  const total = subtotal - discount;

  const priceBreakdown = [
    {
      label: 'Tạm tính',
      value: subtotal,
      type: 'default' as const,
    },
    ...(discount > 0
      ? [
          {
            label: 'Giảm giá (≥5kg)',
            value: discount,
            type: 'discount' as const,
          },
        ]
      : []),
    {
      label: 'Cần thanh toán',
      value: total,
      type: 'total' as const,
    },
  ];

  const handleAddToCart = () => {
    const order: LaundryOrder = {
      serviceId,
      serviceName,
      optionId: selectedOption,
      quantity,
      unit: currentOption.unit,
      totalPrice: total,
    };

    if (onAddToCart) {
      onAddToCart(order);
    } else {
      Alert.alert('Thành công', 'Đã thêm vào giỏ hàng', [
        { text: 'OK', onPress: onBack },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="arrow-left" size={18} color="#1F2937" />
        </TouchableOpacity>
        <UIText style={styles.headerTitle}>{serviceName}</UIText>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Service Options */}
        <Box style={styles.section}>
          <UIText style={styles.sectionTitle}>Chọn loại dịch vụ</UIText>
          {DEFAULT_SERVICE_OPTIONS.map((option) => (
            <ServiceOptionCard
              key={option.id}
              option={option}
              isSelected={selectedOption === option.id}
              onSelect={setSelectedOption}
            />
          ))}
        </Box>

        {/* Quantity Selector */}
        <Box style={styles.section}>
          <QuantitySelector
            label={`Số lượng (${currentOption.unit})`}
            value={quantity}
            unit={currentOption.unit}
            min={1}
            max={20}
            step={currentOption.unit === 'kg' ? 0.5 : 1}
            onIncrease={() =>
              setQuantity((prev) =>
                currentOption.unit === 'kg'
                  ? Math.min(prev + 0.5, 20)
                  : prev + 1
              )
            }
            onDecrease={() =>
              setQuantity((prev) =>
                currentOption.unit === 'kg'
                  ? Math.max(prev - 0.5, 1)
                  : Math.max(prev - 1, 1)
              )
            }
            icon="weight"
            iconColor={currentOption.iconColor}
            iconBg={currentOption.iconBg}
          />
        </Box>

        {/* Service Features */}
        <Box style={styles.section}>
          <ServiceFeatureList
            features={DEFAULT_FEATURES}
            iconColor={currentOption.iconColor}
          />
        </Box>

        {/* Price Summary */}
        <Box style={styles.section}>
          <PriceSummaryCard
            breakdown={priceBreakdown}
            total={total}
            estimatedDelivery="2-3 ngày làm việc"
          />
        </Box>

        {/* Add to Cart Button */}
        <View style={styles.buttonContainer}>
          <AddToCartButton
            onPress={handleAddToCart}
            text="Thêm vào giỏ hàng"
            variant="primary"
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
});

