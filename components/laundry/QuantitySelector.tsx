import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Box } from '@/components/ui/box';
import { Text as UIText } from '@/components/ui/text';

interface QuantitySelectorProps {
  label: string;
  value: number;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onValueChange?: (value: number) => void;
  icon?: string;
  iconColor?: string;
  iconBg?: string;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  label,
  value,
  unit,
  min = 0,
  max,
  step = 1,
  onIncrease,
  onDecrease,
  icon,
  iconColor = '#2563EB',
  iconBg = '#EFF6FF',
}) => {
  const handleIncrease = () => {
    if (max === undefined || value + step <= max) {
      onIncrease();
    }
  };

  const handleDecrease = () => {
    if (value - step >= min) {
      onDecrease();
    }
  };

  return (
    <Box style={styles.container}>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
            <FontAwesome5 name={icon} size={16} color={iconColor} />
          </View>
        )}
        <UIText style={styles.label}>{label}</UIText>
      </View>
      <View style={styles.selector}>
        <TouchableOpacity
          style={[styles.button, value <= min && styles.buttonDisabled]}
          onPress={handleDecrease}
          disabled={value <= min}
          activeOpacity={0.7}
        >
          <FontAwesome5
            name="minus"
            size={12}
            color={value <= min ? '#D1D5DB' : '#2563EB'}
          />
        </TouchableOpacity>
        <View style={styles.valueContainer}>
          <UIText style={styles.value}>
            {value % 1 === 0 ? value : value.toFixed(1)}
          </UIText>
          <UIText style={styles.unit}>{unit}</UIText>
        </View>
        <TouchableOpacity
          style={[
            styles.button,
            max !== undefined && value >= max && styles.buttonDisabled,
          ]}
          onPress={handleIncrease}
          disabled={max !== undefined && value >= max}
          activeOpacity={0.7}
        >
          <FontAwesome5
            name="plus"
            size={12}
            color={max !== undefined && value >= max ? '#D1D5DB' : '#2563EB'}
          />
        </TouchableOpacity>
      </View>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  buttonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    minWidth: 80,
    justifyContent: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  unit: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
});

