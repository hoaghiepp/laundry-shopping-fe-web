import { compatAlert } from "@/lib/compatAlert";
import { storeService } from "@/services/api";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  storeId: string;
  onBack: () => void;
  onAddStaffClick: (storeId: string) => void;
  /** When shown inside a modal dialog (e.g. store home), use tighter top inset. */
  embedded?: boolean;
}

export const StaffListScreen: React.FC<Props> = ({
  storeId,
  onBack,
  onAddStaffClick,
  embedded,
}) => {
  const PAGE_SIZE = 10;
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const pageRef = useRef(0);
  const hasMoreRef = useRef(false);

  // In-memory cache across mounts during app session
  const cacheRef = useRef<Record<
    string,
    { pages: Record<number, any[]>; merged: any[]; hasMore: boolean }
  >>({});

  useEffect(() => {
    // reset paging when storeId changes
    pageRef.current = 0;
    hasMoreRef.current = false;
    fetchPage(0);
  }, [storeId]);

  const fetchPage = async (page: number) => {
    const cacheKey = `staff:${storeId ?? 'all'}`;
    const cache = cacheRef.current[cacheKey];

    // if page cached, use it
    if (cache && cache.pages[page]) {
      // use merged cached list
      setItems(cache.merged);
      hasMoreRef.current = cache.hasMore;
      return;
    }

    try {
      if (page === 0) setLoading(true);
      else setLoadingMore(true);

      console.log("Fetching staff list page", page, PAGE_SIZE);
      const res: any = await storeService.searchStaff(
        { store_id: storeId, deleted: false },
        { page, size: PAGE_SIZE }
      );

      console.log("Staff list page", page, "response:", res);

      const list: any[] = res.data || [];
      const total = res?.meta?.total;
      const hasMore = list.length === res?.meta?.size;

      // merge into cache
      if (!cacheRef.current[cacheKey]) {
        cacheRef.current[cacheKey] = { pages: {}, merged: [], hasMore };
      }
      cacheRef.current[cacheKey].pages[page] = list;
      // rebuild merged as concatenation of pages in order
      const pagesObj = cacheRef.current[cacheKey].pages;
      const merged: any[] = [];
      Object.keys(pagesObj)
        .map((k) => Number(k))
        .sort((a, b) => a - b)
        .forEach((p) => merged.push(...pagesObj[p]));

      // dedupe by id
      const seen = new Set<string>();
      const deduped = merged.filter((s) => {
        if (!s.id) return false;
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });

      cacheRef.current[cacheKey].merged = deduped;
      cacheRef.current[cacheKey].hasMore = hasMore;

      setItems(deduped);
      hasMoreRef.current = hasMore;
      pageRef.current = page;
    } catch (err) {
      console.warn("Failed to load staff list", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleEndReached = () => {
    if (loadingMore || loading) return;
    if (hasMoreRef.current === false) return;
    const next = pageRef.current + 1;
    console.log("End reached", next);
    fetchPage(next);
  };

  const handleDeleteStaff = (staffId: string, staffName: string) => {
    compatAlert(
      "Xác nhận xóa",
      `Bạn có chắc chắn muốn xóa nhân viên "${staffName}"?`,
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await storeService.deleteStaff(storeId, staffId);
              
              // Clear cache and refresh
              const cacheKey = `staff:${storeId ?? 'all'}`;
              delete cacheRef.current[cacheKey];
              
              // Remove from current items
              setItems((prevItems) => prevItems.filter((item) => item.id !== staffId));
              
              compatAlert("Thành công", "Đã xóa nhân viên thành công");
            } catch (error: any) {
              console.log("Delete staff error", error);
              compatAlert(
                "Lỗi",
                error.message || "Xóa nhân viên thất bại. Vui lòng thử lại."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, embedded && styles.containerEmbedded]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <FontAwesome5 name="arrow-left" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Danh sách nhân viên</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => onAddStaffClick(storeId)}
          activeOpacity={0.7}
        >
          <FontAwesome5 name="plus" size={14} color="#FFFFFF" />
          <Text style={styles.addText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && !items.length ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Đang tải danh sách...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <FontAwesome5 name="user" size={20} color="#2563EB" />
                </View>
                <View style={styles.infoContainer}>
                  <Text style={styles.name}>{item.full_name || '—'}</Text>
                  {item.job_title && (
                    <View style={styles.metaRow}>
                      <FontAwesome5 name="briefcase" size={12} color="#6B7280" />
                      <Text style={styles.meta}>{item.job_title}</Text>
                    </View>
                  )}
                  {item.phone_number && (
                    <View style={styles.metaRow}>
                      <FontAwesome5 name="phone" size={12} color="#6B7280" />
                      <Text style={styles.meta}>{item.phone_number}</Text>
                    </View>
                  )}
                  {item.staff_code && (
                    <View style={styles.metaRow}>
                      <FontAwesome5 name="hashtag" size={12} color="#6B7280" />
                      <Text style={styles.small}>Mã: {item.staff_code}</Text>
                    </View>
                  )}
                  {item.email && (
                    <View style={styles.metaRow}>
                      <FontAwesome5 name="envelope" size={12} color="#6B7280" />
                      <Text style={styles.small}>{item.email}</Text>
                    </View>
                  )}
                  {item.created_date && (
                    <View style={styles.metaRow}>
                      <FontAwesome5 name="calendar-alt" size={12} color="#6B7280" />
                      <Text style={styles.small}>
                        {new Date(item.created_date).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteStaff(item.id, item.full_name || 'Nhân viên')}
                  activeOpacity={0.7}
                >
                  <FontAwesome5 name="trash" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyBox}>
              <FontAwesome5 name="user-slash" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>Không có nhân viên để hiển thị</Text>
              <Text style={styles.emptySubtext}>
                Nhấn "Thêm" để thêm nhân viên mới
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    paddingTop: 80,
  },
  containerEmbedded: {
    paddingTop: 56,
  },
  header: {
    backgroundColor: "#1e40af",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginHorizontal: 12,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    gap: 6,
  },
  addText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  meta: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },
  small: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyBox: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  footerLoader: {
    padding: 16,
    alignItems: "center",
  },
});

export default StaffListScreen;
