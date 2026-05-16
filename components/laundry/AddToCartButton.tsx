import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Button , ButtonText } from '@/components/ui/button';

import { Box } from '@/components/ui/box';

interface AddToCartButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  text?: string;
  showIcon?: boolean;
  variant?: 'primary' | 'secondary';
}

export const AddToCartButton: React.FC<AddToCartButtonProps> = ({
  onPress,
  disabled = false,
  loading = false,
  text = 'Thêm vào giỏ hàng',
  showIcon = true,
  variant = 'primary',
}) => {
  const isPrimary = variant === 'primary';

  return (
    <Button
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        isPrimary ? styles.primaryButton : styles.secondaryButton,
        (disabled || loading) && styles.buttonDisabled,
      ]}
      activeOpacity={0.8}
    >
      <Box style={styles.buttonContent}>
        {loading ? (
          <ActivityIndicator
            color={isPrimary ? '#FFFFFF' : '#2563EB'}
            size="small"
          />
        ) : (
          <>
            {showIcon && (
              <FontAwesome5
                name="shopping-cart"
                size={14}
                color={isPrimary ? '#FFFFFF' : '#2563EB'}
                style={styles.icon}
              />
            )}
            <ButtonText
              style={[
                styles.buttonText,
                isPrimary ? styles.primaryText : styles.secondaryText,
              ]}
            >
              {text}
            </ButtonText>
          </>
        )}
      </Box>
    </Button>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: {
    marginRight: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#2563EB',
  },
});

