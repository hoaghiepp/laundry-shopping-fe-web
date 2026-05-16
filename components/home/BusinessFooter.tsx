import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface BusinessFooterProps {
  onStoresPress: () => void;
  storeCount?: number;
}

export const BusinessFooter: React.FC<BusinessFooterProps> = ({ onStoresPress, storeCount = 0 }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brandTitle}>LAUNDRY PRO</Text>
        <Text style={styles.brandSubtitle}>Hệ thống giặt là & Chăm sóc quần áo 4.0</Text>
      </View>

      {/* <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <View style={styles.iconCircle}>
            <FontAwesome5 name="phone-alt" size={10} color="#2563EB" />
          </View>
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>HOTLINE HỖ TRỢ</Text>
            <Text style={styles.infoValue}>1900 6868</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.iconCircle}>
            <FontAwesome5 name="clock" size={10} color="#2563EB" />
          </View>
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>GIỜ LÀM VIỆC</Text>
            <Text style={styles.infoValue}>07:00 - 22:00 (Hàng ngày)</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.storeButton} onPress={onStoresPress} activeOpacity={0.7}>
          <Text style={styles.storeButtonText}>
            Xem danh sách {storeCount} cửa hàng <FontAwesome5 name="arrow-right" size={10} />
          </Text>
        </TouchableOpacity>
      </View> */}

      <View style={styles.socialIcons}>
        <FontAwesome5 name="facebook" size={20} color="#D1D5DB" style={styles.socialIcon} />
        <FontAwesome5 name="instagram" size={20} color="#D1D5DB" style={styles.socialIcon} />
        <FontAwesome5 name="globe" size={20} color="#D1D5DB" style={styles.socialIcon} />
      </View>

      {/* <Text style={styles.copyright}>© 2024 Laundry Pro Inc.</Text> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 32,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoSection: {
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  storeButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  storeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  socialIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 24,
  },
  socialIcon: {
    marginHorizontal: 8,
  },
  copyright: {
    fontSize: 10,
    color: '#D1D5DB',
    textAlign: 'center',
    marginTop: 16,
  },
});

