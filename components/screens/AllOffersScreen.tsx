import { DiscountType, PromotionStatus } from '@/constants/enum';
import { promotionService } from '@/services/api/promotionService';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

interface AllOffersScreenProps {
  onBack: () => void;
  onOfferPress: (id: string) => void;
}

const COLOR_SCHEMES = [
  { colors: ['#2563EB', '#3B82F6'], icon: 'tag' },
  { colors: ['#10B981', '#34D399'], icon: 'gift' },
  { colors: ['#F59E0B', '#FBBF24'], icon: 'fire' },
  { colors: ['#EF4444', '#F87171'], icon: 'heart' },
  { colors: ['#8B5CF6', '#A78BFA'], icon: 'star' },
  { colors: ['#06B6D4', '#22D3EE'], icon: 'gem' },
  { colors: ['#EC4899', '#F472B6'], icon: 'sparkles' },
  { colors: ['#14B8A6', '#5EEAD4'], icon: 'shopping-bag' },
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

const formatDescription = (promotion: ApiPromotion): string => {
  const parts: string[] = [];
  
  if (promotion.min_order_value > 0) {
    parts.push(`Đơn tối thiểu ${formatCurrency(promotion.min_order_value)}`);
  }
  
  if (promotion.max_discount_value && promotion.discount_type === DiscountType.PERCENTAGE) {
    parts.push(`Tối đa ${formatCurrency(promotion.max_discount_value)}`);
  }
  
  if (promotion.description) {
    return promotion.description;
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'Áp dụng ngay để nhận ưu đãi';
};

const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
};

export const AllOffersScreen: React.FC<AllOffersScreenProps> = ({ onBack, onOfferPress }) => {
  const [promotions, setPromotions] = useState<ApiPromotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;

  const fetchPromotions = useCallback(async (pageNum: number, isRefresh: boolean = false) => {
    if (loading || (!hasMore && !isRefresh)) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await promotionService.searchPromotions(
        { status: PromotionStatus.ACTIVE },
        { page: pageNum, size: PAGE_SIZE }
      );

      if (response?.data) {
        const newPromotions = response.data;
        
        if (isRefresh) {
          setPromotions(newPromotions);
          setPage(0);
        } else {
          setPromotions(prev => [...prev, ...newPromotions]);
        }

        setHasMore(newPromotions.length === PAGE_SIZE);
      }
    } catch (error) {
      console.error('Failed to fetch promotions:', error);
      Alert.alert('Lỗi', 'Không thể tải khuyến mãi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading, hasMore]);

  useEffect(() => {
    fetchPromotions(0, true);
  }, []);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPromotions(nextPage);
    }
  };

  const handleRefresh = () => {
    setHasMore(true);
    fetchPromotions(0, true);
  };

  const renderPromotionCard = ({ item, index }: { item: ApiPromotion; index: number }) => {
    const colorScheme = COLOR_SCHEMES[index % COLOR_SCHEMES.length];
    const discountText = formatDiscount(item);
    const description = formatDescription(item);
    const dateRange = formatDateRange(item.start_date, item.end_date);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onOfferPress(item.id)}
        activeOpacity={0.9}
      >
        <LinearGradient colors={colorScheme.colors as any} style={styles.gradient}>
          <View style={styles.cardContent}>
            <View style={styles.cardLeft}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.code}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardDescription} numberOfLines={2}>{description}</Text>
              <Text style={styles.cardDate}>{dateRange}</Text>
            </View>
            <View style={styles.cardRight}>
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{discountText}</Text>
              </View>
              <FontAwesome5
                name={colorScheme.icon}
                size={48}
                color="rgba(255,255,255,0.3)"
                style={styles.icon}
              />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#2563EB" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome5 name="gift" size={48} color="#D1D5DB" />
        <Text style={styles.emptyText}>Chưa có khuyến mãi nào</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <FontAwesome5 name="arrow-left" size={16} color="#4B5563" />
        </TouchableOpacity>
        <Text style={styles.title}>Tất cả Ưu đãi</Text>
      </View>

      <FlatList
        data={promotions}
        renderItem={renderPromotionCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
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
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    padding: 16,
    minHeight: 140,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flex: 1,
  },
  cardLeft: {
    flex: 1,
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  cardRight: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 6,
  },
  cardDescription: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  cardDate: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
  discountBadge: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  discountText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  icon: {
    marginTop: 8,
    transform: [{ rotate: '15deg' }],
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});

