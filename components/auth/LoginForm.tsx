import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthInput } from './AuthInput';
import { OTPInput } from './OTPInput';
import { UserRole } from './RoleSelector';

interface LoginFormProps {
  role: UserRole;
  onLogin: (email: string, password: string, rememberMe: boolean) => void;
  onSwitchToRegister: () => void;
  onSwitchToForgot: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  role,
  onLogin,
  onSwitchToRegister,
  onSwitchToForgot,
}) => {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [useOTP, setUseOTP] = useState(false);

  const getTitleByRole = () => {
    switch (role) {
      case UserRole.USER:
        return { title: 'Khách hàng thân mến', subtitle: 'Đặt giặt & Mua sắm tiện lợi' };
      case UserRole.STORE:
        return { title: 'Cổng Nhân viên Tiệm', subtitle: 'Quản lý Hub & Điểm nhận trả' };
      case UserRole.FACTORY:
        return { title: 'Cổng Nhân viên Xưởng', subtitle: 'Kiểm soát quy trình giặt là' };
      default:
        return { title: 'Khách hàng thân mến', subtitle: 'Đặt giặt & Mua sắm tiện lợi' };
    }
  };

  const getPhoneLabel = () => {
    switch (role) {
      case UserRole.USER:
        return 'EMAIL';
        // return 'SỐ ĐIỆN THOẠI';
      case UserRole.STORE:
        return 'EMAIL';
        // return 'MÃ NHÂN VIÊN / SĐT';
      case UserRole.FACTORY:
        return 'EMAIL';
        // return 'MÃ NHÂN VIÊN';
      default:
        return 'EMAIL';
    }
  };

  const handleLogin = () => {
    // if (!phone) {
    //   Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
    //   return;
    // }

    // if (useOTP && !otp) {
    //   Alert.alert('Lỗi', 'Vui lòng nhập mã OTP');
    //   return;
    // }

    // if (!useOTP && !password) {
    //   Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');
    //   return;
    // }

    onLogin(email, password, rememberMe);
  };

  const handleSendOTP = async () => {
    // Mock API call
    return new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 1000);
    });
  };

  const { title, subtitle } = getTitleByRole();
  const showOTPToggle = role === 'user';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.form}>
        {/* <AuthInput
          label={getPhoneLabel()}
          icon="phone-alt"
          placeholder="0912 xxx xxx"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        /> */}
        <AuthInput
          label={getPhoneLabel()}
          icon="envelope"
          placeholder="example@gmail.com"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        {!useOTP ? (
          <AuthInput
            label="MẬT KHẨU"
            icon="lock"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        ) : (
          <OTPInput
            label="MÃ XÁC THỰC (OTP)"
            value={otp}
            onChangeText={setOtp}
            onSendOTP={handleSendOTP}
            phoneNumber={phone}
          />
        )}

        {!useOTP && (
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={1}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <FontAwesome5 name="check" size={10} color="#FFFFFF" />}
              </View>
              <Text style={styles.checkboxLabel}>Ghi nhớ đăng nhập</Text>
            </TouchableOpacity>

            {/* <TouchableOpacity onPress={onSwitchToForgot} activeOpacity={1}>
              <Text style={styles.linkText}>Quên mật khẩu?</Text>
            </TouchableOpacity> */}
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Đăng nhập</Text>
        <FontAwesome5 name="arrow-right" size={12} color="#FFFFFF" />
      </TouchableOpacity>

      {/* {showOTPToggle && (
        <TouchableOpacity
          style={styles.switchMethod}
          onPress={() => setUseOTP(!useOTP)}
          activeOpacity={1}
        >
          <Text style={styles.switchMethodText}>
            {useOTP
              ? 'Đăng nhập bằng Mật khẩu'
              : 'Đăng nhập bằng OTP (Không cần mật khẩu)'}
          </Text>
        </TouchableOpacity>
      )} */}

      {role === UserRole.USER && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={onSwitchToRegister} activeOpacity={1}>
            <Text style={styles.linkText}>Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
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
  switchMethod: {
    marginTop: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  switchMethodText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

