import { compatAlert } from '@/lib/compatAlert';
import { StoreCustomer, storeService } from '@/services/api/storeService';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  storeId: string;
  onBack?: () => void;
  onSelectCustomer: (customer: StoreCustomer) => void;
  embedded?: boolean;
}

const PAGE_SIZE = 20;

export const CustomerListScreen: React.FC<Props> = ({
  storeId,
  onBack,
  onSelectCustomer,
  embedded = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<StoreCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const pageRef = useRef(0);
  const hasMoreRef = useRef(false);

  const fetchPage = useCallback(
    async (page: number, reset = false) => {
      try {
        if (page === 0) setLoading(true);
        else setLoadingMore(true);

        const res = await storeService.getCustomerOfStore(storeId, {
          page,
          size: PAGE_SIZE,
        });

        const list = res.data || [];
        const total = res.meta?.total ?? 0;
        setTotalCount(total);
        hasMoreRef.current = (page + 1) * PAGE_SIZE < total;
        pageRef.current = page;

        setItems((prev) => (reset || page === 0 ? list : [...prev, ...list]));
      } catch (e: any) {
        compatAlert('Lỗi', e.message || 'Không thể tải danh sách khách hàng');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [storeId]
  );

  useEffect(() => {
    fetchPage(0, true);
  }, [storeId]);

  const handleLoadMore = () => {
    if (hasMoreRef.current && !loadingMore) {
      fetchPage(pageRef.current + 1);
    }
  };

  const resetCreateForm = () => {
    setNewPhone('');
    setNewName('');
    setNewEmail('');
    setShowCreate(false);
  };

  const handleCreateCustomer = async () => {
    const phoneNumber = newPhone.trim();
    if (!phoneNumber) {
      compatAlert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }
    try {
      setCreating(true);
      await storeService.createStaffCustomer({
        phoneNumber,
        fullName: newName.trim() || undefined,
        email: newEmail.trim() || undefined,
      });
      compatAlert(
        'Thành công',
        'Đã tạo khách. Khách chưa đăng nhập được cho đến khi đặt mật khẩu trên app bằng số điện thoại này.'
      );
      resetCreateForm();
      fetchPage(0, true);
    } catch (e: any) {
      compatAlert('Lỗi', e?.message || 'Không thể tạo khách hàng');
    } finally {
      setCreating(false);
    }
  };

  const createPanel = showCreate ? (
    <View style={styles.createCard}>
      <Text style={styles.createTitle}>Tạo khách (chưa có mật khẩu)</Text>
      <TextInput
        style={styles.createInput}
        placeholder="Số điện thoại *"
        placeholderTextColor="#9CA3AF"
        keyboardType="phone-pad"
        value={newPhone}
        onChangeText={setNewPhone}
        editable={!creating}
      />
      <TextInput
        style={styles.createInput}
        placeholder="Họ và tên"
        placeholderTextColor="#9CA3AF"
        value={newName}
        onChangeText={setNewName}
        editable={!creating}
      />
      <TextInput
        style={styles.createInput}
        placeholder="Email (không bắt buộc)"
        placeholderTextColor="#9CA3AF"
        keyboardType="email-address"
        autoCapitalize="none"
        value={newEmail}
        onChangeText={setNewEmail}
        editable={!creating}
      />
      <View style={styles.createActions}>
        <TouchableOpacity onPress={resetCreateForm} disabled={creating} style={styles.createCancel}>
          <Text style={styles.createCancelText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCreateCustomer} disabled={creating} style={styles.createSubmit}>
          {creating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createSubmitText}>Tạo</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  ) : (
    <TouchableOpacity style={styles.createToggle} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
      <FontAwesome5 name="user-plus" size={12} color="#2563EB" />
      <Text style={styles.createToggleText}>Tạo khách</Text>
    </TouchableOpacity>
  );

  const filteredItems = searchQuery.trim()
    ? items.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone_number?.includes(searchQuery) ||
          c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.customer_code?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
    return amount?.toString() ?? '0';
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const avatarColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];
  const getAvatarColor = (id: string) => avatarColors[id.charCodeAt(0) % avatarColors.length];

  const renderItem = ({ item }: { item: StoreCustomer }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onSelectCustomer(item)}
      activeOpacity={0.85}
    >
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.id) }]}>
        <Text style={styles.avatarText}>{getInitials(item.full_name)}</Text>
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.cardRow}>
          <Text style={styles.cardName} numberOfLines={1}>{item.full_name}</Text>
          <Text style={styles.customerCode}>{item.customer_code}</Text>
        </View>
        <View style={styles.cardRow}>
          <FontAwesome5 name="phone" size={10} color="#6B7280" style={{ marginRight: 4 }} />
          <Text style={styles.cardMeta}>{item.phone_number}</Text>
        </View>
        {!!item.email && (
          <View style={styles.cardRow}>
            <FontAwesome5 name="envelope" size={10} color="#6B7280" style={{ marginRight: 4 }} />
            <Text style={styles.cardMeta} numberOfLines={1}>{item.email}</Text>
          </View>
        )}
        <View style={[styles.cardRow, { marginTop: 6 }]}>
          <View style={styles.walletBadge}>
            <FontAwesome5 name="wallet" size={10} color="#2563EB" style={{ marginRight: 4 }} />
            <Text style={styles.walletText}>{formatCurrency(item.wallet_balance)}đ</Text>
          </View>
        </View>
      </View>

      <FontAwesome5 name="chevron-right" size={12} color="#D1D5DB" />
    </TouchableOpacity>
  );

  const listBody = (
    <>
      {createPanel}
      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color="#2563EB" style={{ paddingVertical: 16 }} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <FontAwesome5 name="users" size={36} color="#D1D5DB" />
              <Text style={styles.emptyText}>Không có khách hàng</Text>
            </View>
          }
        />
      )}
    </>
  );

  if (embedded) {
    return (
      <View style={styles.embeddedContainer}>
        <View style={styles.embeddedSearchBar}>
          <FontAwesome5 name="search" size={13} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên, SĐT, email, mã KH..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <FontAwesome5 name="times-circle" size={14} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        {!loading && (
          <Text style={styles.embeddedCount}>{totalCount} khách hàng</Text>
        )}
        {listBody}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1e40af', '#1e40af']} style={styles.header}>
        <View style={styles.headerRow}>
          {onBack ? (
            <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.75}>
              <FontAwesome5 name="arrow-left" size={16} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
          <View style={styles.headerMid}>
            <Text style={styles.headerTitle}>Khách hàng</Text>
            {!loading && (
              <Text style={styles.headerCount}>{totalCount} khách hàng</Text>
            )}
          </View>
          {loading && <ActivityIndicator size="small" color="#fff" />}
        </View>

        <View style={styles.searchBar}>
          <FontAwesome5 name="search" size={13} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên, SĐT, email, mã KH..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <FontAwesome5 name="times-circle" size={14} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {listBody}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMid: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerCount: {
    fontSize: 12,
    color: '#BFDBFE',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  list: {
    padding: 16,
    gap: 10,
    paddingBottom: 80,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  customerCode: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  walletText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 64,
    gap: 12,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  embeddedContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  embeddedSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  embeddedCount: {
    fontSize: 12,
    color: '#6B7280',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  createToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  createToggleText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 13,
  },
  createCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  createTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  createInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  createCancel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  createCancelText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  createSubmit: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  createSubmitText: {
    color: '#fff',
    fontWeight: '700',
  },
});
