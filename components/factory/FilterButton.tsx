import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface FilterButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export const FilterButton: React.FC<FilterButtonProps> = ({ label, active, onPress }) => {
  return (
    <Pressable
      style={[styles.button, active ? styles.buttonActive : styles.buttonInactive]}
      onPress={onPress}
    >
      <Text style={[styles.text, active ? styles.textActive : styles.textInactive]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  buttonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  buttonInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  text: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  textActive: {
    color: '#FFFFFF',
  },
  textInactive: {
    color: '#6B7280',
  },
});
