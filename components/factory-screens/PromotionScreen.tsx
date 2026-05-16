import { DiscountType, PromotionStatus } from '@/constants/enum';
import { compatAlert } from '@/lib/compatAlert';
import { promotionService, SearchPromotionsRequest } from '@/services/api/promotionService';
import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PromotionManagementScreen } from './PromotionManagementScreen';

interface PromotionScreenProps {
  onBack: () => void;
  /** When shown inside a modal dialog (e.g. store home), use tighter top inset. */
  embedded?: boolean;
}

interface Promotion {
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
  status: PromotionStatus;
  created_date?: string;
}

export const PromotionScreen: React.FC<PromotionScreenProps> = ({ onBack, embedded }) => {
  const PAGE_SIZE = 20;
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [showCreateScreen, setShowCreateScreen] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PromotionStatus | 'ALL'>('ALL');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editingStartDate, setEditingStartDate] = useState<Date | null>(null);
  const [editingEndDate, setEditingEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<PromotionStatus | null>(null);

  const pageRef = useRef(0);
  const hasMoreRef = useRef(false);
  const cacheRef = useRef<Record<number, Promotion[]>>({});

  useEffect(() => {
    fetchPromotions(0, true);
  }, [statusFilter]);

  const fetchPromotions = async (page: number, reset: boolean = false) => {
    // Check cache
    if (!reset && cacheRef.current[page]) {
      const cached = cacheRef.current[page];
      setPromotions((prev) => (reset ? cached : [...prev, ...cached]));
      return;
    }

    try {
      if (page === 0) {
        setLoading(true);
        if (reset) {
          setPromotions([]);
          cacheRef.current = {};
        }
      } else {
        setLoadingMore(true);
      }

      const searchParams: SearchPromotionsRequest = {};
      if (searchQuery.trim()) {
        searchParams.name = searchQuery.trim();
      }
      if (statusFilter !== 'ALL') {
        searchParams.status = statusFilter;
      }

      const response = await promotionService.searchPromotions(
        searchParams,
        { page, size: PAGE_SIZE }
      );

      const data: Promotion[] = response.data || [];
      const hasMore = data.length === PAGE_SIZE;

      cacheRef.current[page] = data;
      setPromotions((prev) => {
        if (reset) return data;
        // Dedupe by id
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = data.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });

      hasMoreRef.current = hasMore;
      pageRef.current = page;
    } catch (error: any) {
      console.error('Failed to fetch promotions:', error);
      compatAlert(
        'Lỗi',
        error?.response?.data?.message || 'Không thể tải danh sách khuyến mãi'
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSearch = () => {
    pageRef.current = 0;
    hasMoreRef.current = false;
    fetchPromotions(0, true);
  };

  const handleEndReached = () => {
    if (loadingMore || loading) return;
    if (!hasMoreRef.current) return;
    fetchPromotions(pageRef.current + 1);
  };

  const formatDateToISO = (date: Date): string => {
    const dateAtMidnight = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0, 0, 0, 0
    ));
    return dateAtMidnight.toISOString();
  };

  const handleSave = async () => {
    if (!selectedPromotion || !editingStartDate || !editingEndDate) return;

    // Validate dates
    if (editingEndDate <= editingStartDate) {
      compatAlert('Lỗi', 'Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }

    setUpdatingStatus(true);
    try {
      const updateData: any = {};
      
      // Include status if changed
      if (selectedStatus && selectedStatus !== selectedPromotion.status) {
        updateData.status = selectedStatus;
      }
      
      // Include date updates if dates were changed
      const originalStartDate = new Date(selectedPromotion.start_date).toISOString();
      const originalEndDate = new Date(selectedPromotion.end_date).toISOString();
      const newStartDate = formatDateToISO(editingStartDate);
      const newEndDate = formatDateToISO(editingEndDate);

      if (newStartDate !== originalStartDate) {
        updateData.start_date = newStartDate;
      }
      if (newEndDate !== originalEndDate) {
        updateData.end_date = newEndDate;
      }

      // Only update if there are changes
      if (Object.keys(updateData).length === 0) {
        compatAlert('Thông báo', 'Không có thay đổi nào để lưu');
        setUpdatingStatus(false);
        return;
      }

      console.log("updateData", selectedPromotion.id, updateData);
      await promotionService.updatePromotion(selectedPromotion.id, updateData);

      // Update local state
      setPromotions((prev) =>
        prev.map((p) => {
          if (p.id === selectedPromotion.id) {
            const updated = { ...p };
            if (selectedStatus) {
              updated.status = selectedStatus;
            }
            if (newStartDate !== originalStartDate) {
              updated.start_date = newStartDate;
            }
            if (newEndDate !== originalEndDate) {
              updated.end_date = newEndDate;
            }
            return updated;
          }
          return p;
        })
      );

      // Clear cache to force refresh
      cacheRef.current = {};
      closeModal();
      compatAlert('Thành công', 'Đã cập nhật thông tin khuyến mãi');
    } catch (error: any) {
      console.error('Failed to update promotion:', error);
      compatAlert(
        'Lỗi',
        error?.response?.data?.message || 'Không thể cập nhật thông tin'
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const resetModal = () => {
    if (selectedPromotion) {
      setEditingStartDate(new Date(selectedPromotion.start_date));
      setEditingEndDate(new Date(selectedPromotion.end_date));
      setSelectedStatus(selectedPromotion.status);
    } else {
      setEditingStartDate(null);
      setEditingEndDate(null);
      setSelectedStatus(null);
    }
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
  };

  const closeModal = () => {
    setShowStatusModal(false);
    setSelectedPromotion(null);
    resetModal();
  };

  const openStatusModal = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setEditingStartDate(new Date(promotion.start_date));
    setEditingEndDate(new Date(promotion.end_date));
    setSelectedStatus(promotion.status);
    setShowStartDatePicker(false);
    setShowEndDatePicker(false);
    setShowStatusModal(true);
  };

  const handleDateChange = (
    event: any,
    date: Date | undefined,
    type: 'start' | 'end'
  ) => {
    if (Platform.OS === 'android') {
      if (type === 'start') {
        setShowStartDatePicker(false);
      } else {
        setShowEndDatePicker(false);
      }
      if (event.type === 'dismissed') {
        return;
      }
    }

    if (date) {
      if (type === 'start') {
        setEditingStartDate(date);
        if (Platform.OS === 'ios') {
          setShowStartDatePicker(false);
        }
      } else {
        setEditingEndDate(date);
        if (Platform.OS === 'ios') {
          setShowEndDatePicker(false);
        }
      }
    }
  };

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  const getStatusColor = (status: PromotionStatus): string => {
    switch (status) {
      case PromotionStatus.ACTIVE:
        return '#10B981';
      case PromotionStatus.INACTIVE:
        return '#6B7280';
      case PromotionStatus.EXPIRED:
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status: PromotionStatus): string => {
    switch (status) {
      case PromotionStatus.ACTIVE:
        return 'Đang hoạt động';
      case PromotionStatus.INACTIVE:
        return 'Tạm dừng';
      case PromotionStatus.EXPIRED:
        return 'Hết hạn';
      default:
        return status;
    }
  };

  const getDiscountDisplay = (promotion: Promotion): string => {
    if (promotion.discount_type === DiscountType.PERCENTAGE) {
      return `${promotion.discount_value}%${promotion.max_discount_value ? ` (tối đa ${formatCurrency(promotion.max_discount_value)})` : ''}`;
    } else {
      return formatCurrency(promotion.discount_value);
    }
  };

  const renderPromotionItem = ({ item }: { item: Promotion }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.codeContainer}>
            <FontAwesome5 name="tag" size={14} color="#2563EB" />
            <Text style={styles.codeText}>{item.code}</Text>
          </View>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}
            onPress={() => openStatusModal(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.statusButton}
          onPress={() => openStatusModal(item)}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="edit" size={14} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <Text style={styles.name}>{item.name}</Text>

      {item.description && (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <FontAwesome5 name="percent" size={12} color="#6B7280" />
          <Text style={styles.detailLabel}>Giảm giá: </Text>
          <Text style={styles.detailValue}>{getDiscountDisplay(item)}</Text>
        </View>

        <View style={styles.detailRow}>
          <FontAwesome5 name="shopping-cart" size={12} color="#6B7280" />
          <Text style={styles.detailLabel}>Đơn tối thiểu: </Text>
          <Text style={styles.detailValue}>{formatCurrency(item.min_order_value)}</Text>
        </View>

        <View style={styles.detailRow}>
          <FontAwesome5 name="calendar-alt" size={12} color="#6B7280" />
          <Text style={styles.detailLabel}>Thời gian: </Text>
          <Text style={styles.detailValue}>
            {formatDate(item.start_date)} - {formatDate(item.end_date)}
          </Text>
        </View>
      </View>
    </View>
  );

  if (showCreateScreen) {
    return (
      <PromotionManagementScreen
        onBack={() => {
          setShowCreateScreen(false);
          fetchPromotions(0, true);
        }}
        onSuccess={() => {
          setShowCreateScreen(false);
          fetchPromotions(0, true);
        }}
      />
    );
  }

  return (
    <View style={[styles.container, embedded && styles.containerEmbedded]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <FontAwesome5 name="arrow-left" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Quản lý khuyến mãi</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowCreateScreen(true)}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="plus" size={14} color="#FFFFFF" />
          <Text style={styles.addText}>Tạo mới</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <FontAwesome5 name="search" size={14} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo tên..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              fetchPromotions(0, true);
            }} style={styles.clearButton}>
              <FontAwesome5 name="times" size={12} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterContainer}>
          {(['ALL', PromotionStatus.ACTIVE, PromotionStatus.INACTIVE, PromotionStatus.EXPIRED] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                statusFilter === status && styles.filterButtonActive,
              ]}
              onPress={() => {
                setStatusFilter(status);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  statusFilter === status && styles.filterButtonTextActive,
                ]}
              >
                {status === 'ALL' ? 'Tất cả' : getStatusLabel(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {loading && !promotions.length ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải danh sách...</Text>
        </View>
      ) : (
        <FlatList
          data={promotions}
          keyExtractor={(item) => item.id}
          renderItem={renderPromotionItem}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyBox}>
              <FontAwesome5 name="tag" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Không có khuyến mãi nào</Text>
              <Text style={styles.emptySubtext}>
                Nhấn "Tạo mới" để thêm khuyến mãi
              </Text>
            </View>
          )}
          ListFooterComponent={() =>
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#2563EB" />
              </View>
            ) : null
          }
        />
      )}

      {/* Status Change Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh sửa khuyến mãi</Text>
              <TouchableOpacity
                onPress={closeModal}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="times" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedPromotion && editingStartDate && editingEndDate && (
              <>
                <ScrollView style={styles.modalScrollView} >
                  <View style={styles.modalPromotionInfo}>
                    <Text style={styles.modalPromotionCode}>{selectedPromotion.code}</Text>
                    <Text style={styles.modalPromotionName}>{selectedPromotion.name}</Text>
                  </View>

                  <View style={styles.modalBody}>
                    {/* Date Selection */}
                    <Text style={styles.modalSubtitle}>Thời gian khuyến mãi:</Text>
                    
                    <View style={styles.dateInputContainer}>
                      <Text style={styles.dateLabel}>Ngày bắt đầu:</Text>
                      <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => setShowStartDatePicker(true)}
                        disabled={updatingStatus}
                      >
                        <Text style={styles.dateText}>
                          {formatDateDisplay(editingStartDate)}
                        </Text>
                        <FontAwesome5 name="calendar-alt" size={16} color="#6B7280" />
                      </TouchableOpacity>
                      {showStartDatePicker && (
                        <DateTimePicker
                          value={editingStartDate}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={(event, date) => handleDateChange(event, date, 'start')}
                          minimumDate={new Date()}
                        />
                      )}
                    </View>

                    <View style={styles.dateInputContainer}>
                      <Text style={styles.dateLabel}>Ngày kết thúc:</Text>
                      <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => setShowEndDatePicker(true)}
                        disabled={updatingStatus}
                      >
                        <Text style={styles.dateText}>
                          {formatDateDisplay(editingEndDate)}
                        </Text>
                        <FontAwesome5 name="calendar-alt" size={16} color="#6B7280" />
                      </TouchableOpacity>
                      {showEndDatePicker && (
                        <DateTimePicker
                          value={editingEndDate}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={(event, date) => handleDateChange(event, date, 'end')}
                          minimumDate={editingStartDate}
                        />
                      )}
                    </View>

                    <View style={styles.modalDivider} />

                    {/* Status Selection */}
                    <Text style={styles.modalSubtitle}>Trạng thái:</Text>
                    {[
                      PromotionStatus.ACTIVE,
                      PromotionStatus.INACTIVE,
                      PromotionStatus.EXPIRED,
                    ].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusOption,
                          selectedStatus === status && styles.statusOptionSelected,
                        ]}
                        onPress={() => setSelectedStatus(status)}
                        disabled={updatingStatus}
                        activeOpacity={0.7}
                      >
                        <View style={styles.statusOptionContent}>
                          <View
                            style={[
                              styles.statusOptionDot,
                              { backgroundColor: getStatusColor(status) },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusOptionText,
                              selectedStatus === status && styles.statusOptionTextSelected,
                            ]}
                          >
                            {getStatusLabel(status)}
                          </Text>
                        </View>
                        {selectedStatus === status && (
                          <FontAwesome5 name="check" size={14} color="#2563EB" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {/* Save Button */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.saveButton, updatingStatus && styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={updatingStatus}
                    activeOpacity={0.8}
                  >
                    {updatingStatus ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <FontAwesome5 name="check" size={16} color="#FFFFFF" />
                        <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: 80,
  },
  containerEmbedded: {
    paddingTop: 56,
  },
  header: {
    backgroundColor: '#1e40af',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginHorizontal: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    gap: 6,
  },
  addText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusButton: {
    padding: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  detailsContainer: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  footerLoader: {
    padding: 16,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalScrollView: {
    // maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalPromotionInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalPromotionCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 4,
  },
  modalPromotionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalBody: {
    padding: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  statusOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  statusOptionTextSelected: {
    color: '#2563EB',
    fontWeight: '600',
  },
  dateInputContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 14,
    color: '#1F2937',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

