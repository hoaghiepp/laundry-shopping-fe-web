import React from 'react';
import { StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';

type BadgeVariant = 'red' | 'yellow' | 'green' | 'blue' | 'gray';

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
  animated?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, variant, animated }) => {
  const badgeStyle = [styles.badge, styles[`badge${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof styles] as ViewStyle];
  const textStyle = [styles.text, styles[`text${variant.charAt(0).toUpperCase() + variant.slice(1)}` as keyof typeof styles] as TextStyle];

  return <Text style={[badgeStyle, textStyle]}>{label}</Text>;
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    borderWidth: 1,
  },
  badgeRed: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  badgeYellow: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  badgeGreen: {
    backgroundColor: '#d1fae5',
    borderColor: '#a7f3d0',
  },
  badgeBlue: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  badgeGray: {
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  textRed: {
    color: '#b91c1c',
  },
  textYellow: {
    color: '#a16207',
  },
  textGreen: {
    color: '#047857',
  },
  textBlue: {
    color: '#1d4ed8',
  },
  textGray: {
    color: '#374151',
  },
});
