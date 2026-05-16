import { orderService } from '@/services/api/orderService';
import { paymentService } from '@/services/api/paymentService';
import { formatCurrencyVND, formatDateTimeVN } from '@/utils/format';
import { FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  ref_type: string;
  ref_id?: string;
  order_code?: string;
  created_date: string;
}

interface TransactionHistoryScreenProps {
  customerId?: string;
  onBack: () => void;
  onOrderPress?: (order: any) => void;
}

export const TransactionHistoryScreen: React.FC<TransactionHistoryScreenProps> = ({
  customerId,
  onBack,
  onOrderPress,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const pageSize = 10;

  const fetchTransactions = async (pageNum: number = 0, append: boolean = false) => {
    if (!customerId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await paymentService.customerSearchTransactions(
        {
          customer_id: customerId,
        },
        { page: pageNum, size: pageSize, sort: 'createdDate,desc' }
      );

      if (response?.data && Array.isArray(response.data)) {
        if (append) {
          setTransactions((prev) => [...prev, ...response.data]);
        } else {
          setTransactions(response.data);
        }

        // Check if there are more transactions
        const total = response?.meta?.total || 0;
        const currentCount = append ? transactions.length + response.data.length : response.data.length;
        setHasMore(currentCount < total);
      } else {
        if (!append) {
          setTransactions([]);
        }
        setHasMore(false);
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      if (!append) {
        setTransactions([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      setPage(0);
      setHasMore(true);
      fetchTransactions(0, false);
    } else {
      setTransactions([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && customerId) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchTransactions(nextPage, true);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    fetchTransactions(0, false);
  };

  const handleScroll = ({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    if (isCloseToBottom && hasMore && !loadingMore) {
      handleLoadMore();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <FontAwesome5 name="arrow-left" size={16} color="#4B5563" />
          </TouchableOpacity>
          <Text style={styles.title}>Lịch sử giao dịch</Text>
        </View>
      </View>

      {loading && transactions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải lịch sử...</Text>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome5 name="history" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
          <Text style={styles.emptySubtext}>
            Các giao dịch của bạn sẽ hiển thị ở đây
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={400}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.transactionsList}>
            {transactions.map((transaction) => {
              const isDeposit = transaction.transaction_type === 'DEPOSIT';
              const isPayment = transaction.transaction_type === 'PAYMENT';
              const amount = Math.abs(transaction.amount);

              // Determine icon and color based on transaction type
              let icon = 'wallet';
              let iconBg = '#EFF6FF';
              let iconColor = '#2563EB';

              if (isDeposit) {
                icon = 'arrow-down';
                iconBg = '#D1FAE5';
                iconColor = '#059669';
              } else if (isPayment) {
                icon = 'arrow-up';
                iconBg = '#FEE2E2';
                iconColor = '#DC2626';
              }

              // Format date
              const formattedDate = formatDateTimeVN(transaction.created_date);

              // Extract order code from description or use order_code/ref_id
              // Try to find order code pattern in description (e.g., "Đơn hàng #DH-1234" or "Order #DH-1234")
              let orderCode = transaction.order_code || transaction.ref_id;
              if (!orderCode && transaction.description) {
                // Try to extract order code from description
                const orderCodeMatch = transaction.description.match(/#?([A-Z]{2,3}-?\d+)/i);
                if (orderCodeMatch) {
                  orderCode = orderCodeMatch[1];
                }
              }

              // Replace order-id in description with order-code if found
              let displayDescription = transaction.description;
              if (orderCode && transaction.description) {
                // Replace any order ID pattern with order code
                displayDescription = transaction.description.replace(
                  /(đơn hàng|order|order-id|order_id)[\s:]*#?[\w-]+/gi,
                  (match) => {
                    const prefix = match.match(/^(đơn hàng|order|order-id|order_id)[\s:]*/i)?.[0] || '';
                    return prefix + (prefix.includes(':') ? ' ' : ' #') + orderCode;
                  }
                );
              }

              // Check if transaction is order-related and can be clicked
              const isOrderRelated = transaction.ref_id && transaction.ref_type && 
                (transaction.ref_type.toUpperCase().includes('ORDER') || 
                 transaction.ref_type.toUpperCase() === 'ORDER');
              const isLoading = loadingOrderId === transaction.id;

              const handleTransactionPress = async () => {
                if (!isOrderRelated || !transaction.ref_id || !onOrderPress) {
                  return;
                }

                try {
                  setLoadingOrderId(transaction.id);
                  const orderResponse = await orderService.getOrderCustomerById(transaction.ref_id);
                  if (orderResponse?.data) {
                    const orderDetail = {
                      ...orderResponse.data,
                      order_items: orderResponse.data.order_items || [],
                      promotion_name: orderResponse.data.promotion_name,
                      promotion_discount: orderResponse.data.promotion_discount,
                    };
                    onOrderPress(orderDetail);
                  } else {
                    Alert.alert('Lỗi', 'Không tìm thấy thông tin đơn hàng');
                  }
                } catch (error: any) {
                  console.error('Error fetching order:', error);
                  Alert.alert('Lỗi', 'Không thể tải thông tin đơn hàng');
                } finally {
                  setLoadingOrderId(null);
                }
              };

              const TransactionCardContent = (
                <>
                  <View style={[styles.transactionIcon, { backgroundColor: iconBg }]}>
                    <FontAwesome5 name={icon} size={18} color={iconColor} />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>
                      {displayDescription}
                    </Text>
                    <Text style={styles.transactionDate}>{formattedDate}</Text>
                    {orderCode && (
                      <Text style={styles.transactionOrderCode}>
                        Mã đơn: {orderCode}
                      </Text>
                    )}
                    {transaction.ref_type && (
                      <Text style={styles.transactionRefType}>
                        Loại: {transaction.ref_type}
                      </Text>
                    )}
                  </View>
                  <View style={styles.transactionAmount}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : (
                      <Text
                        style={[
                          styles.transactionAmountText,
                          isDeposit && styles.transactionAmountPositive,
                          isPayment && styles.transactionAmountNegative,
                        ]}
                      >
                        {isDeposit ? '+' : '-'}
                        {formatCurrencyVND(amount)}
                      </Text>
                    )}
                  </View>
                </>
              );

              return (
                <View key={transaction.id}>
                  {isOrderRelated && onOrderPress ? (
                    <TouchableOpacity
                      style={styles.transactionCard}
                      onPress={handleTransactionPress}
                      activeOpacity={0.7}
                      disabled={isLoading}
                    >
                      {TransactionCardContent}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.transactionCard}>
                      {TransactionCardContent}
                    </View>
                  )}
                </View>
              );
            })}

            {loadingMore && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadMoreText}>Đang tải thêm...</Text>
              </View>
            )}

            {!hasMore && transactions.length > 0 && (
              <View style={styles.noMoreContainer}>
                <Text style={styles.noMoreText}>Đã hiển thị tất cả giao dịch</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
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
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  transactionsList: {
    padding: 16,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  transactionOrderCode: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  transactionRefType: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  transactionAmountPositive: {
    color: '#059669',
  },
  transactionAmountNegative: {
    color: '#DC2626',
  },
  loadMoreContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadMoreText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  noMoreContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMoreText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});

