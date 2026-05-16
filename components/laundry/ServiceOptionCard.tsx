import { Box } from '@/components/ui/box';
import { Text as UIText } from '@/components/ui/text';
import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface ServiceOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  price: number;
  unit: string; // 'kg' | 'item' | 'piece'
  isRecommended?: boolean;
}

interface ServiceOptionCardProps {
  option: ServiceOption;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export const ServiceOptionCard: React.FC<ServiceOptionCardProps> = ({
  option,
  isSelected,
  onSelect,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.selectedContainer,
        option.isRecommended && styles.recommendedContainer,
      ]}
      onPress={() => onSelect(option.id)}
      activeOpacity={0.7}
    >
      {option.isRecommended && (
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedText}>Khuyên dùng</Text>
        </View>
      )}
      <Box style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: option.iconBg },
            isSelected && styles.selectedIconContainer,
          ]}
        >
          <FontAwesome5 name={option.icon} size={24} color={option.iconColor} />
        </View>
        <View style={styles.info}>
          <UIText style={styles.name}>{option.name}</UIText>
          <UIText style={styles.description}>{option.description}</UIText>
          <View style={styles.priceRow}>
            <UIText style={styles.price}>
              {option.price.toLocaleString()}đ/{option.unit}
            </UIText>
            {isSelected && (
              <View style={styles.checkIcon}>
                <FontAwesome5 name="check-circle" size={16} color="#2563EB" />
              </View>
            )}
          </View>
        </View>
      </Box>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedContainer: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    shadowColor: '#2563EB',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  recommendedContainer: {
    borderColor: '#10B981',
  },
  recommendedBadge: {
    backgroundColor: '#10B981',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    borderBottomRightRadius: 8,
  },
  recommendedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  content: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIconContainer: {
    backgroundColor: '#DBEAFE',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  checkIcon: {
    marginLeft: 8,
  },
});

