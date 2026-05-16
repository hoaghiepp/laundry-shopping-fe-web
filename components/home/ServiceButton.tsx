import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

interface Service {
  id: string;
  icon: string;
  label: string;
  bgColor: string;
  iconColor: string;
  borderColor: string;
}

interface ServiceButtonProps {
  service: Service;
  onPress: (id: string) => void;
}

export const ServiceButton: React.FC<ServiceButtonProps> = ({ service, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(service.id)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: service.bgColor,
            borderColor: service.borderColor,
          },
        ]}
      >
        <FontAwesome5 name={service.icon} size={20} color={service.iconColor} />
      </View>
      <Text style={styles.label}>{service.label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
  },
});

