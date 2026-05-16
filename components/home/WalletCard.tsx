import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WalletCardProps {
  balance: string;
  membershipTier?: string;
  packageRemaining: number;
  onTopUpPress: () => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  balance,
  membershipTier,
  packageRemaining,
  onTopUpPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.info}>
          <Text style={styles.label}>Số dư khả dụng</Text>
          <Text style={styles.balance}>{balance}</Text>
          <View style={styles.badges}>
            {membershipTier && (
              <View style={styles.goldBadge}>
                <FontAwesome5 name="crown" size={8} color="#D97706" />
                <Text style={styles.goldText}>{membershipTier}</Text>
              </View>
            )}
            <View style={styles.packageBadge}>
              <Text style={styles.packageText}>Gói Giặt: Còn {packageRemaining}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.topUpButton} onPress={onTopUpPress} activeOpacity={1}>
          <FontAwesome5 name="plus" size={12} color="#2563EB" />
          <Text style={styles.topUpText}>Nạp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: -48,
    position: 'relative',
    zIndex: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    color: '#6B7280',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  balance: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 4,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  goldBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goldText: {
    fontSize: 10,
    color: '#D97706',
  },
  packageBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  packageText: {
    fontSize: 10,
    color: '#059669',
  },
  topUpButton: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topUpText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
});

