import { DiscountType } from '@/constants/enum';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ApiPromotion {
  id: string;
  code: string;
  name: string;
  description?: string;
  discount_type: DiscountType;
  discount_value: number;
  max_discount_value?: number;
  min_order_value: number;
  start_date: string;
  end_date: string;
  status: string;
}

interface PromotionBannerProps {
  promotions: ApiPromotion[];
  savedPromotionCodes?: Set<string>;
  onPromotionPress: (id: string) => void;
  onSavePress?: (id: string) => void;
  onSeeAllPress: () => void;
}

// Color schemes - more than 5 variations
const COLOR_SCHEMES = [
  {
    colors: ['#2563EB', '#3B82F6'],
    buttonColor: '#FFFFFF',
    buttonTextColor: '#2563EB',
    icon: 'tag',
  },
  {
    colors: ['#10B981', '#34D399'],
    buttonColor: '#FFFFFF',
    buttonTextColor: '#10B981',
    icon: 'gift',
  },
  {
    colors: ['#F59E0B', '#FBBF24'],
    buttonColor: '#FFFFFF',
    buttonTextColor: '#F59E0B',
    icon: 'fire',
  },
  {
    colors: ['#EF4444', '#F87171'],
    buttonColor: '#FFFFFF',
    buttonTextColor: '#EF4444',
    icon: 'heart',
  },
  {
    colors: ['#8B5CF6', '#A78BFA'],
    buttonColor: '#FFFFFF',
    buttonTextColor: '#8B5CF6',
    icon: 'star',
  },
  {
    colors: ['#06B6D4', '#22D3EE'],
    buttonColor: '#FFFFFF',
    buttonTextColor: '#06B6D4',
    icon: 'gem',
  },
  {
    colors: ['#EC4899', '#F472B6'],
    buttonColor: '#FFFFFF',
    buttonTextColor: '#EC4899',
    icon: 'sparkles',
  },
  {
    colors: ['#14B8A6', '#5EEAD4'],
    buttonColor: '#FFFFFF',
    buttonTextColor: '#14B8A6',
    icon: 'shopping-bag',
  },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
};

const formatDiscount = (promotion: ApiPromotion): string => {
  if (promotion.discount_type === DiscountType.PERCENTAGE) {
    return `${promotion.discount_value}%`;
  } else {
    return formatCurrency(promotion.discount_value);
  }
};

const formatSubtitle = (promotion: ApiPromotion): string => {
  const parts: string[] = [];
  
  if (promotion.min_order_value > 0) {
    parts.push(`Đơn tối thiểu ${formatCurrency(promotion.min_order_value)}`);
  }
  
  if (promotion.max_discount_value && promotion.discount_type === DiscountType.PERCENTAGE) {
    parts.push(`Tối đa ${formatCurrency(promotion.max_discount_value)}`);
  }
  
  if (promotion.description) {
    return promotion.description.length > 50 
      ? promotion.description.substring(0, 50) + '...'
      : promotion.description;
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'Áp dụng ngay';
};

export const PromotionBanner: React.FC<PromotionBannerProps> = ({
  promotions,
  savedPromotionCodes = new Set(),
  onPromotionPress,
  onSavePress,
  onSeeAllPress,
}) => {
  console.log("Promotions:", savedPromotionCodes);

  const transformedPromotions = useMemo(() => {
    return promotions.map((promo, index) => {
      const colorScheme = COLOR_SCHEMES[index % COLOR_SCHEMES.length];
      const discountText = formatDiscount(promo);
      
      return {
        id: promo.id,
        code: promo.code,
        badge: promo.code || 'KHUYẾN MÃI',
        title: promo.name || `Giảm ${discountText}`,
        subtitle: formatSubtitle(promo),
        buttonText: `Giảm ${discountText}`,
        icon: colorScheme.icon,
        colors: colorScheme.colors,
        buttonColor: colorScheme.buttonColor,
        buttonTextColor: colorScheme.buttonTextColor,
      };
    });
  }, [promotions]);

  if (transformedPromotions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ưu đãi dành cho bạn</Text>
        <TouchableOpacity onPress={onSeeAllPress} activeOpacity={0.7}>
          <Text style={styles.seeAll}>Xem tất cả</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {transformedPromotions.map((promo) => {
          const isSaved = savedPromotionCodes.has(promo.code);
          return (
            <TouchableOpacity
              key={promo.id}
              style={styles.card}
              onPress={() => onPromotionPress(promo.id)}
              activeOpacity={0.9}
            >
              <LinearGradient colors={promo.colors as any} style={styles.gradient}>
                {!isSaved && onSavePress && (
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      onSavePress(promo.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <FontAwesome5 name="bookmark" size={16} color="#FFFFFF" solid={false} />
                  </TouchableOpacity>
                )}
                {isSaved && (
                  <View style={styles.savedBadge}>
                    <FontAwesome5 name="bookmark" size={14} color="#FFFFFF" solid={true} />
                    <Text style={styles.savedText}>Đã lưu</Text>
                  </View>
                )}
                <View style={styles.content}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{promo.badge}</Text>
                  </View>
                  <Text style={styles.promoTitle}>{promo.title}</Text>
                  <Text style={styles.promoSubtitle}>{promo.subtitle}</Text>
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: promo.buttonColor }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.buttonText, { color: promo.buttonTextColor }]}>
                      {promo.buttonText}
                    </Text>
                  </TouchableOpacity>
                </View>
                <FontAwesome5
                  name={promo.icon}
                  size={72}
                  color="rgba(255,255,255,0.2)"
                  style={styles.icon}
                />
                <View style={styles.circle} />
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2563EB',
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  card: {
    width: 280,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    zIndex: 10,
    flex: 1,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  promoSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    marginBottom: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  icon: {
    position: 'absolute',
    right: -8,
    bottom: -24,
    transform: [{ rotate: '12deg' }],
  },
  circle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 40,
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  savedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  savedText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});

