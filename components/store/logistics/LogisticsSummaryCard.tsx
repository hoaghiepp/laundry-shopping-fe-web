import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface LogisticsSummaryCardProps {
  variant: 'outbound' | 'inbound';
  label: string;
  value: string;
  stats?: Array<{ icon: string; text: string }>;
  details?: string[];
  buttonText?: string;
  buttonIcon?: string;
  onButtonPress?: () => void;
}

export const LogisticsSummaryCard: React.FC<LogisticsSummaryCardProps> = ({
  variant,
  label,
  value,
  stats,
  details,
  buttonText,
  buttonIcon,
  onButtonPress,
}) => {
  const isInbound = variant === 'inbound';

  return (
    <View style={[styles.summaryCard, isInbound && styles.inboundCard]}>
      <Text style={[styles.summaryLabel, isInbound && styles.inboundLabel]}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, isInbound && styles.inboundValue]}>
        {value}
      </Text>

      {stats && stats.length > 0 && (
        <View style={styles.summaryStats}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <FontAwesome5 name={stat.icon as any} size={10} color="#6B7280" />
              <Text style={styles.statText}>{stat.text}</Text>
            </View>
          ))}
        </View>
      )}

      {details && details.length > 0 && (
        <View style={styles.inboundDetails}>
          {details.map((detail, index) => (
            <Text key={index} style={styles.inboundDetailText}>
              {detail}
            </Text>
          ))}
        </View>
      )}

      {/* {buttonText && buttonIcon && onButtonPress && (
        <TouchableOpacity
          style={[styles.primaryButton, isInbound && styles.inboundButton]}
          onPress={onButtonPress}
          activeOpacity={0.8}
        >
          <FontAwesome5
            name={buttonIcon as any}
            size={14}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.primaryButtonText}>{buttonText}</Text>
        </TouchableOpacity>
      )} */}
    </View>
  );
};

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  inboundCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2563EB',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  inboundLabel: {
    color: '#059669',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  inboundValue: {
    color: '#065F46',
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  inboundDetails: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  inboundDetailText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  inboundButton: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

