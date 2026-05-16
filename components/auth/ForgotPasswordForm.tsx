import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { AuthInput } from './AuthInput';
import { OTPInput } from './OTPInput';

interface ForgotPasswordFormProps {
  onSubmit: (phone: string, otp: string, newPassword: string) => void;
  onBack: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onSubmit, onBack }) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = () => {
    if (!phone) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }

    if (!otp) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã OTP');
      return;
    }

    if (!newPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu mới');
      return;
    }

    onSubmit(phone, otp, newPassword);
  };

  const handleSendOTP = async () => {
    return new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 1000);
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
        <FontAwesome5 name="arrow-left" size={14} color="#6B7280" />
        <Text style={styles.backText}>Quay lại</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Quên mật khẩu? 🔒</Text>
      <Text style={styles.subtitle}>Đừng lo, chúng tôi sẽ giúp bạn lấy lại ngay.</Text>

      <View style={styles.form}>
        <AuthInput
          label="NHẬP SỐ ĐIỆN THOẠI ĐÃ ĐĂNG KÝ"
          icon="phone-alt"
          placeholder="0912 xxx xxx"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <OTPInput
          label="MÃ XÁC THỰC (OTP)"
          value={otp}
          onChangeText={setOtp}
          onSendOTP={handleSendOTP}
          phoneNumber={phone}
        />

        <AuthInput
          label="ĐẶT MẬT KHẨU MỚI"
          icon="key"
          placeholder="Nhập mật khẩu mới"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubmit} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Xác nhận đổi mật khẩu</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 24,
  },
  form: {
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

