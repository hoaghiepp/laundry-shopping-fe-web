import { FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface OTPInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onSendOTP: () => Promise<void>;
  phoneNumber?: string;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  label,
  value,
  onChangeText,
  onSendOTP,
  phoneNumber,
}) => {
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000) as unknown as NodeJS.Timeout;
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại hợp lệ');
      return;
    }

    if (countdown > 0) return;

    setIsLoading(true);
    try {
      await onSendOTP();
      setCountdown(60);
      Alert.alert('Thành công', 'Mã OTP của bạn là: 123456');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể gửi mã OTP. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = countdown > 0 || isLoading;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <FontAwesome5 name="shield-alt" size={16} color="#9CA3AF" style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Nhập 6 số"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={6}
            value={value}
            onChangeText={onChangeText}
          />
        </View>
        <TouchableOpacity
          style={[styles.button, isDisabled && styles.buttonDisabled]}
          onPress={handleSendOTP}
          disabled={isDisabled}
          activeOpacity={1}
        >
          <Text style={[styles.buttonText, isDisabled && styles.buttonTextDisabled]}>
            {countdown > 0 ? `Gửi lại (${countdown}s)` : 'Lấy mã'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>Mã sẽ được gửi qua SMS/Zalo.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    letterSpacing: 2,
  },
  button: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  buttonTextDisabled: {
    color: '#9CA3AF',
  },
  hint: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

