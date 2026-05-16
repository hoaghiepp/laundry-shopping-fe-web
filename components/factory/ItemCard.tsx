import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ItemCardProps {
  id: string;
  title: string;
  subtitle: string;
  additionalInfo?: string;
  statusLabel: string;
  statusVariant: 'red' | 'yellow' | 'green' | 'blue' | 'gray' | 'orange';
  icon: string;
  borderColor: string;
  progress?: number;
  showProgress?: boolean;
  opacity?: number;
  actionButton?: {
    label: string;
    onPress: () => void;
  };
  extraInfo?: string;
  iconBg?: string;
  iconColor?: string;
  onPress?: () => void;
}

const STATUS_PALETTE = {
  red:    { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
  yellow: { bg: '#FFFBEB', text: '#D97706', dot: '#F59E0B' },
  green:  { bg: '#ECFDF5', text: '#059669', dot: '#10B981' },
  blue:   { bg: '#EFF6FF', text: '#2563EB', dot: '#3B82F6' }, 
  gray:   { bg: '#F9FAFB', text: '#6B7280', dot: '#9CA3AF' },
  orange: { bg: '#FFFBEB', text: '#D97706', dot: '#F59E0B' },
};

const PROGRESS_STEPS = [
  { label: 'Giặt',      threshold: 0 },
  { label: 'Sấy',       threshold: 0.49 },
  { label: 'Xong',      threshold: 0.99 },
];

export const ItemCard: React.FC<ItemCardProps> = ({
  id,
  title,
  subtitle,
  additionalInfo,
  statusLabel,
  statusVariant,
  icon,
  borderColor,
  progress = 0,
  showProgress,
  opacity = 1,
  actionButton,
  extraInfo,
  iconBg = '#F3F4F6',
  iconColor = '#9CA3AF',
  onPress,
}) => {
  const palette = STATUS_PALETTE[statusVariant];

  return (
    <Pressable
      style={styles.pressable}
      onPress={onPress}
    >
      <View style={[styles.card, { opacity, borderColor }]}>
        {/* Left accent bar */}
        {/* <View style={[styles.accentBar, { backgroundColor: borderColor }]} /> */}

        <View style={styles.body}>
            {/* Top row: order code + status badge */}
            <View style={styles.topRow}>
              <Text style={styles.orderCode} numberOfLines={1}>{id}</Text>
              <View style={[styles.statusBadge, { backgroundColor: palette.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: palette.dot }]} />
                <Text style={[styles.statusLabel, { color: palette.text }]}>{statusLabel}</Text>
              </View>
            </View>

            {/* Content row: icon + info */}
            <View style={styles.contentRow}>
              <View style={[styles.iconBox, { backgroundColor: iconBg, borderColor: iconColor + '33' }]}>
                <FontAwesome5 name={icon} size={20} color={iconColor} />
              </View>
              <View style={styles.infoBlock}>
                <Text style={styles.title} numberOfLines={2}>{title}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
                {additionalInfo && (
                  <View style={styles.additionalChip}>
                    <Text style={styles.additionalChipText}>{additionalInfo}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Issue / extra info alert */}
            {extraInfo && (
              <View style={styles.alertRow}>
                <FontAwesome5 name="exclamation-circle" size={12} color="#DC2626" />
                <Text style={styles.alertText}>{extraInfo}</Text>
              </View>
            )}

            {/* Progress */}
            {showProgress && (
              <View style={styles.progressSection}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
                  {PROGRESS_STEPS.map((step, i) => {
                    const active = progress > step.threshold;
                    const pos = i === 0 ? 0 : i === 1 ? 50 : 100;
                    return (
                      <View
                        key={step.label}
                        style={[
                          styles.progressDot,
                          { left: `${pos}%` as any },
                          active ? styles.progressDotActive : styles.progressDotInactive,
                        ]}
                      />
                    );
                  })}
                </View>
                <View style={styles.progressLabels}>
                  {PROGRESS_STEPS.map((step) => {
                    const active = progress > step.threshold;
                    return (
                      <Text
                        key={step.label}
                        style={[styles.progressLabel, active && styles.progressLabelActive]}
                      >
                        {step.label}
                      </Text>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Action button */}
            {actionButton && (
              <Pressable
                style={({ pressed: buttonPressed }) => [styles.actionButton, buttonPressed && styles.actionButtonPressed]}
                onPress={actionButton.onPress}
              >
                <Text style={styles.actionButtonText}>{actionButton.label}</Text>
              </Pressable>
            )}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'stretch',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardPressed: {
    backgroundColor: '#F0F7FF',
  },
  accentBar: {
    width: 4,
    borderTopLeftRadius: 80,
    borderBottomLeftRadius: 80,
  },
  body: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  orderCode: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    flexShrink: 0,
  },
  infoBlock: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  additionalChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 2,
  },
  additionalChipText: {
    fontSize: 10,
    color: '#6B7280',
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#F43F5E',
  },
  alertText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  progressSection: {
    marginTop: 2,
    gap: 6,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'visible',
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  progressDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    top: -2,
    marginLeft: -5,
  },
  progressDotActive: {
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2,
  },
  progressDotInactive: {
    backgroundColor: '#D1D5DB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressLabelActive: {
    color: '#2563EB',
  },
  actionButton: {
    marginTop: 2,
    backgroundColor: '#DC2626',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
