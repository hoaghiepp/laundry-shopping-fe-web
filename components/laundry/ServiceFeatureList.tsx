import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Box } from '@/components/ui/box';
import { Text as UIText } from '@/components/ui/text';

export interface ServiceFeature {
  id: string;
  icon: string;
  title: string;
  description: string;
}

interface ServiceFeatureListProps {
  features: ServiceFeature[];
  iconColor?: string;
}

export const ServiceFeatureList: React.FC<ServiceFeatureListProps> = ({
  features,
  iconColor = '#2563EB',
}) => {
  return (
    <Box style={styles.container}>
      <UIText style={styles.title}>Dịch vụ bao gồm</UIText>
      <View style={styles.featuresList}>
        {features.map((feature) => (
          <View key={feature.id} style={styles.featureItem}>
            <View style={styles.iconContainer}>
              <FontAwesome5 name={feature.icon} size={14} color={iconColor} />
            </View>
            <View style={styles.featureContent}>
              <UIText style={styles.featureTitle}>{feature.title}</UIText>
              <UIText style={styles.featureDescription}>
                {feature.description}
              </UIText>
            </View>
          </View>
        ))}
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
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
});

