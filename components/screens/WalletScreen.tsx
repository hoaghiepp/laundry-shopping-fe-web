import { orderService } from '@/services/api/orderService';
import { packageService } from '@/services/api/packageProductService';
import { paymentService } from '@/services/api/paymentService';
import { cacheManager } from '@/services/cache';
import { formatCurrencyVND, formatDateTimeVN } from '@/utils/format';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Package {
  id: string;
  name: string;
  icon: string;
  expiry: string;
  used: number;
  total: number;
  isActive: boolean;
  iconBg: string;
  iconColor: string;
}

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

interface WalletScreenProps {
  balance: string;
  points: number;
  packages?: Package[];
  customerId?: string;
  onTopUp: () => void;
  onBuyPackage: () => void;
  onHistory: () => void;
  onOrderPress?: (order: any) => void;
}

export const WalletScreen: React.FC<WalletScreenProps> = ({
  balance,
  points,
  packages: initialPackages,
  customerId,
  onTopUp,
  onBuyPackage,
  onHistory,
  onOrderPress,
}) => {
  const navigation = useNavigation<any>();
  const [showTopUpDialog, setShowTopUpDialog] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [packages, setPackages] = useState<Package[]>(initialPackages || []);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isPackagesExpanded, setIsPackagesExpanded] = useState(true);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);

  const validateAmount = (amount: number): string => {
    if (!amount || amount <= 0) {
      return 'Vui lòng nhập số tiền hợp lệ';
    }
    if (amount < 1000) {
      return 'Số tiền nạp tối thiểu là 1000đ';
    }
    if (amount % 1000 !== 0) {
      return 'Số tiền phải là bội số của 1000đ';
    }
    return '';
  };

  const handleTopUpPress = () => {
    setShowTopUpDialog(true);
    setTopUpAmount('');
    setAmountError('');
  };

  const handleConfirmTopUp = async () => {
    const amount = parseFloat(topUpAmount.replace(/[^\d]/g, ''));
    const error = validateAmount(amount);
    if (error) {
      setAmountError(error);
      return;
    }

    try {
      const response = await paymentService.generateQrCode({ amount });
      console.log('response', response);
      const qrLink = response.data.qr_link;
      const content = response.data.content;
      if (!qrLink) {
        Alert.alert('Lỗi', 'Không nhận được link thanh toán');
        return;
      }

      console.log("response data: ", response.data);

      navigation.navigate('QrPayment', {
        url: qrLink,
        content: content,
        amount: amount,
      });
    }
    catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Không thể tạo QR code');
      return;
    }

    onTopUp();
    setShowTopUpDialog(false);
    setTopUpAmount('');
    setAmountError('');
  };

  const handleCloseDialog = () => {
    setShowTopUpDialog(false);
    setTopUpAmount('');
    setAmountError('');
  };

  const formatAmount = (value: string) => {
    // Remove all non-digit characters
    const numbers = value.replace(/[^\d]/g, '');
    if (!numbers) return '';
    // Format with thousand separators
    return parseInt(numbers).toLocaleString('vi-VN');
  };

  const handleAmountChange = (text: string) => {
    const formatted = formatAmount(text);
    setTopUpAmount(formatted);

    // Validate on change
    const amount = parseFloat(formatted.replace(/[^\d]/g, ''));
    if (amount > 0) {
      const error = validateAmount(amount);
      setAmountError(error);
    } else {
      setAmountError('');
    }
  };

  const quickAmounts = [50000, 100000, 200000, 500000];

  // Map API response to Package format
  const mapApiPackageToPackage = (apiPackage: any): Package => {
    const product = apiPackage.product || {};
    const remainingCount = apiPackage.remaining_count || 0;
    const status = apiPackage.status || 'INACTIVE';
    const isActive = status === 'ACTIVE' && remainingCount > 0;

    // Determine icon based on product name or type
    const getIconFromName = (name: string): string => {
      const lowerName = name.toLowerCase();
      if (lowerName.includes('chăn') || lowerName.includes('bed')) return 'bed';
      if (lowerName.includes('giày') || lowerName.includes('shoe')) return 'shoe-prints';
      if (lowerName.includes('khô') || lowerName.includes('dry')) return 'user-tie';
      return 'tshirt'; // default
    };

    // Determine icon colors
    const getIconColors = (icon: string): { bg: string; color: string } => {
      switch (icon) {
        case 'bed':
          return { bg: '#ECFDF5', color: '#059669' };
        case 'shoe-prints':
          return { bg: '#FFF7ED', color: '#EA580C' };
        case 'user-tie':
          return { bg: '#F3E8FF', color: '#9333EA' };
        default:
          return { bg: '#EFF6FF', color: '#2563EB' };
      }
    };

    const icon = getIconFromName(product.name || '');
    const iconColors = getIconColors(icon);

    // Calculate used and total from detailed package data
    // Priority: detailed package data > package_product > fallback
    const originalQuantity = apiPackage.package_product?.quantity
      || apiPackage.quantity
      || (apiPackage.used_count !== undefined && remainingCount !== undefined
        ? apiPackage.used_count + remainingCount
        : null);

    // Get used count from detailed package data if available
    const usedCount = apiPackage.used_count !== undefined
      ? apiPackage.used_count
      : (originalQuantity ? Math.max(0, originalQuantity - remainingCount) : 0);

    // Calculate total: use original quantity if available, otherwise use used + remaining
    const total = originalQuantity
      || (usedCount !== undefined && remainingCount !== undefined
        ? usedCount + remainingCount
        : (remainingCount > 0 ? remainingCount : 1));

    // Calculate used: prefer detailed used_count, otherwise calculate from total - remaining
    const used = usedCount !== undefined
      ? usedCount
      : Math.max(0, total - remainingCount);

    // Format expiry date - if not available, show based on status
    const expiry = apiPackage.expiry_date
      ? new Date(apiPackage.expiry_date).toLocaleDateString('vi-VN')
      : isActive
        ? 'Đang hoạt động'
        : 'Đã hết hạn';

    return {
      id: apiPackage.id,
      name: product.name || 'Gói dịch vụ',
      icon,
      expiry,
      used: Math.max(0, used),
      total: Math.max(1, total),
      isActive,
      iconBg: iconColors.bg,
      iconColor: iconColors.color,
    };
  };

  const fetchCustomerPackages = async () => {
    try {
      setPackagesLoading(true);
      const response = await packageService.customerSearchPackages(
        {},
        { page: 0, size: 100 }
      );

      if (response?.data && Array.isArray(response.data)) {
        const packagesWithDetails = await Promise.all(
          response.data.map(async (apiPackage: any) => {
            try {
              return apiPackage;
            } catch (error) {
              console.error(`Error fetching package product detail for ${apiPackage.id}:`, error);
              return apiPackage;
            }
          })
        );
        const mappedPackages = packagesWithDetails.map(mapApiPackageToPackage);
        setPackages(mappedPackages);
      } else {
        setPackages([]);
      }
    } catch (error: any) {
      console.error('Error fetching customer packages:', error);
      setPackages([]);
    } finally {
      setPackagesLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!customerId) {
      setTransactions([]);
      return;
    }

    try {
      setTransactionsLoading(true);
      const response = await paymentService.customerSearchTransactions(
        {
          customer_id: customerId,
        },
        { page: 0, size: 10, sort: 'createdDate,desc' }
      );

      // console.log("Transactions Response:", response);

      if (response?.data && Array.isArray(response.data)) {
        setTransactions(response.data);
      } else {
        setTransactions([]);
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerPackages();
    fetchTransactions();
  }, []);

  // Refresh when screen comes into focus (e.g., returning from payment)
  useFocusEffect(
    useCallback(() => {
      fetchCustomerPackages();
      fetchTransactions();

      // Cleanup function: invalidate customer cache when navigating away from wallet screen
      return () => {
        cacheManager.invalidate("customer:profile");
      };
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCustomerPackages(),
        fetchTransactions(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563EB', '#4F46E5']} style={styles.header}>
        <Text style={styles.headerTitle}>Tài sản của tôi</Text>
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Tổng tiền trong ví</Text>
          <Text style={styles.balance}>{balance}</Text>
          {/* <View style={styles.assetCards}>
            <View style={styles.assetCard}>
              <Text style={styles.assetLabel}>Ví tiền</Text>
              <Text style={styles.assetValue}>{balance.replace('.000đ', 'k')}</Text>
            </View>
            <View style={styles.assetCard}>
              <Text style={styles.assetLabel}>Điểm</Text>
              <Text style={styles.assetValue}>{points}</Text>
            </View>
          </View> */}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563EB']}
            tintColor="#2563EB"
          />
        }
      >
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionButton} onPress={handleTopUpPress}>
            <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
              <FontAwesome5 name="wallet" size={18} color="#2563EB" />
            </View>
            <Text style={styles.actionLabel}>Nạp tiền</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onBuyPackage}>
            <View style={[styles.actionIcon, { backgroundColor: '#FFF7ED' }]}>
              <FontAwesome5 name="ticket-alt" size={18} color="#EA580C" />
            </View>
            <Text style={styles.actionLabel}>Mua Gói</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              navigation.navigate('TransactionHistory');
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F9FAFB' }]}>
              <FontAwesome5 name="history" size={18} color="#6B7280" />
            </View>
            <Text style={styles.actionLabel}>Lịch sử</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setIsPackagesExpanded(!isPackagesExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>Gói dịch vụ đang có</Text>
          <FontAwesome5
            name={isPackagesExpanded ? "chevron-up" : "chevron-down"}
            size={14}
            color="#6B7280"
          />
        </TouchableOpacity>

        {isPackagesExpanded && (
          <>
            {packagesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingText}>Đang tải gói dịch vụ...</Text>
              </View>
            ) : packages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FontAwesome5 name="ticket-alt" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>Chưa có gói dịch vụ nào</Text>
                <Text style={styles.emptySubtext}>
                  Mua gói dịch vụ để sử dụng ngay
                </Text>
              </View>
            ) : (
              packages.map((pkg) => (
                <View
                  key={pkg.id}
                  style={[
                    styles.packageCard,
                    !pkg.isActive && styles.packageCardInactive,
                  ]}
                >
                  {pkg.isActive && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                  <View style={styles.packageHeader}>
                    <View style={[styles.packageIcon, { backgroundColor: pkg.iconBg }]}>
                      <FontAwesome5 name={pkg.icon} size={20} color={pkg.iconColor} />
                    </View>
                    <View style={styles.packageInfo}>
                      <Text style={[styles.packageName, !pkg.isActive && styles.textInactive]}>
                        {pkg.name}
                      </Text>
                      <Text
                        style={[
                          styles.packageExpiry,
                          !pkg.isActive && styles.expiryExpired,
                        ]}
                      >
                        {pkg.isActive ? `Trạng thái: ${pkg.expiry}` : pkg.expiry}
                      </Text>
                    </View>
                  </View>
                  {pkg.isActive ? (
                    <>
                      {/* <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${((pkg.total - pkg.used) / pkg.total) * 100}%` },
                    ]}
                  />
                </View> */}
                      <View style={styles.packageFooter}>
                        {/* <Text style={styles.packageUsed}>Đã dùng: {pkg.used}</Text> */}
                        <Text style={styles.packageRemaining}>
                          Còn lại: {pkg.total - pkg.used} lượt
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.packageExpiredFooter}>
                      <TouchableOpacity style={styles.rebuyButton}>
                        <Text style={styles.rebuyButtonText}>Mua lại</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        )}

        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setIsHistoryExpanded(!isHistoryExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
          <FontAwesome5
            name={isHistoryExpanded ? "chevron-up" : "chevron-down"}
            size={14}
            color="#6B7280"
          />
        </TouchableOpacity>

        {isHistoryExpanded && (
          <>
            {transactionsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingText}>Đang tải lịch sử...</Text>
              </View>
            ) : transactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FontAwesome5 name="history" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
              </View>
            ) : (
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
                        <FontAwesome5 name={icon} size={16} color={iconColor} />
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionDescription}>
                          {displayDescription}
                        </Text>
                        <Text style={styles.transactionDate}>{formattedDate}</Text>
                        {/* {orderCode && (
                          <Text style={styles.transactionOrderCode}>
                            Mã đơn: {orderCode}
                          </Text>
                        )} */}
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
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Top Up Dialog */}
      <Modal
        visible={showTopUpDialog}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseDialog}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseDialog}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nạp tiền vào ví</Text>
              <TouchableOpacity onPress={handleCloseDialog} activeOpacity={0.7}>
                <FontAwesome5 name="times" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.amountLabel}>Số tiền muốn nạp</Text>
              <View style={[
                styles.amountInputContainer,
                amountError && styles.amountInputContainerError
              ]}>
                <TextInput
                  style={styles.amountInput}
                  value={topUpAmount}
                  onChangeText={handleAmountChange}
                  placeholder="Nhập số tiền"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  autoFocus
                />
                <Text style={styles.currencyText}>đ</Text>
              </View>
              {amountError ? (
                <Text style={styles.errorText}>{amountError}</Text>
              ) : null}

              <Text style={styles.quickAmountLabel}>Chọn nhanh</Text>
              <View style={styles.quickAmountContainer}>
                {quickAmounts.map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.quickAmountButton}
                    onPress={() => {
                      const formatted = amount.toLocaleString('vi-VN');
                      setTopUpAmount(formatted);
                      setAmountError('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickAmountText}>
                      {amount.toLocaleString('vi-VN')}đ
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.minAmountText}>
                Số tiền nạp tối thiểu: 1.000đ (phải là bội số của 1.000đ)
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCloseDialog}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmTopUp}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    paddingBottom: 48,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  balanceSection: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#BFDBFE',
    marginBottom: 4,
  },
  balance: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  assetCards: {
    flexDirection: 'row',
    gap: 16,
  },
  assetCard: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  assetLabel: {
    fontSize: 12,
    color: '#BFDBFE',
  },
  assetValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
    marginTop: -32,
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
    overflow: 'hidden',
  },
  packageCardInactive: {
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },
  activeBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  packageHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  packageIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  textInactive: {
    color: '#6B7280',
  },
  packageExpiry: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  expiryExpired: {
    color: '#DC2626',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 999,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  packageUsed: {
    fontSize: 12,
    color: '#6B7280',
  },
  packageRemaining: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  packageExpiredFooter: {
    alignItems: 'center',
    marginTop: 12,
  },
  rebuyButton: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rebuyButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalBody: {
    padding: 20,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  amountInputContainerError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 16,
    marginTop: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    paddingVertical: 16,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  quickAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  quickAmountContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  quickAmountButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  minAmountText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  transactionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  transactionOrderCode: {
    fontSize: 12,
    color: '#9CA3AF',
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
});

