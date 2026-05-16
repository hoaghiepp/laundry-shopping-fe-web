import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SectionHeaderProps {
  icon: string;
  iconColor: string;
  title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  iconColor,
  title,
}) => {
  return (
    <View style={styles.container}>
      <FontAwesome5 name={icon as any} size={14} color={iconColor} />
      <Text style={styles.text}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // marginBottom: 12,
    // marginTop: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

