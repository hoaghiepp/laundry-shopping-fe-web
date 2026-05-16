import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export enum UserRole {
  USER = 'user',
  STORE = 'store',
  FACTORY = 'factory',
}

interface RoleSelectorProps {
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole, onRoleChange }) => {
  const roles = [
    {
      id: UserRole.USER,
      icon: 'user',
      label: 'Khách hàng',
    },
    {
      id: UserRole.STORE,
      icon: 'store',
      label: 'Tiệm',
    },
    {
      id: UserRole.FACTORY,
      icon: 'industry',
      label: 'Xưởng',
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CHỌN VAI TRÒ</Text>
      <View style={styles.buttonContainer}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            style={[
              styles.roleButton,
              selectedRole === role.id ? styles.activeButton : styles.inactiveButton,
            ]}
            onPress={() => onRoleChange(role.id)}
            activeOpacity={1}
          >
            <FontAwesome5
              name={role.icon}
              size={14}
              color={selectedRole === role.id ? '#FFFFFF' : '#4B5563'}
            />
            <Text
              style={[
                styles.roleLabel,
                selectedRole === role.id ? styles.activeLabel : styles.inactiveLabel,
              ]}
            >
              {role.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeButton: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  inactiveButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  roleLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  activeLabel: {
    color: '#FFFFFF',
  },
  inactiveLabel: {
    color: '#4B5563',
  },
});

