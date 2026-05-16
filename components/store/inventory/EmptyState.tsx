import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface EmptyStateProps {
  loading?: boolean;
  filter?: 'all' | 'low';
  listingTab?: 'active' | 'inactive';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  loading = false,
  filter = 'all',
  listingTab = 'active',
}) => {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Đang tải...</Text>
      </View>
    );
  }

  const title =
    filter === 'low'
      ? 'Không có sản phẩm nào'
      : listingTab === 'inactive'
        ? 'Không có tiện ích ngưng hoạt động'
        : 'Chưa có tiện ích đang hoạt động';

  const subtext =
    filter === 'low'
      ? 'Không có sản phẩm sắp hết'
      : 'Kéo xuống để làm mới';

  return (
    <View style={styles.container}>
      <FontAwesome5 name="box-open" size={48} color="#9CA3AF" />
      <Text style={styles.text}>{title}</Text>
      <Text style={styles.subtext}>{subtext}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  subtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

