import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthInput } from './AuthInput';
import { UserRole } from './RoleSelector';

interface RegisterFormProps {
  role: UserRole;
  onRegister: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    otp?: string;
    employeeCode?: string;
  }) => void;
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  role,
  onRegister,
  onSwitchToLogin,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');

  const getTitleByRole = () => {
    switch (role) {
      case 'user':
        return { title: 'Đăng ký Khách hàng', subtitle: 'Tận hưởng ưu đãi thành viên mới' };
      case 'store':
        return {
          title: 'Kích hoạt TK Nhân viên Tiệm',
          subtitle: 'Cần mã định danh từ Quản lý',
        };
      case 'factory':
        return {
          title: 'Kích hoạt TK Nhân viên Xưởng',
          subtitle: 'Xác thực nhân sự nhà máy',
        };
    }
  };

  const handleRegister = () => {
    if (!name) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên');
      return;
    }

    if (!phone) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }

    if (!email) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return;
    }

    // if (role === 'user' && !otp) {
    //   Alert.alert('Lỗi', 'Vui lòng nhập mã OTP');
    //   return;
    // }

    if (role !== 'user' && !employeeCode) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã định danh');
      return;
    }

    if (!password) {
      Alert.alert('Lỗi', 'Vui lòng tạo mật khẩu');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu không khớp!');
      return;
    }

    onRegister({ name, email, phone, password, otp, employeeCode });
  };

  const handleSendOTP = async () => {
    return new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 1000);
    });
  };

  // const { title, subtitle } = getTitleByRole();
  const showEmployeeCode = role !== 'user';
  const showOTP = role === 'user';

  return (
    <View style={styles.container}>
      {/* <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text> */}

      <View style={styles.form}>
        {showEmployeeCode && (
          <View style={styles.employeeCodeContainer}>
            <Text style={styles.employeeCodeLabel}>
              MÃ ĐỊNH DANH / MÃ KÍCH HOẠT <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.employeeCodeInputContainer}>
              <FontAwesome5 name="id-badge" size={16} color="#D97706" style={styles.icon} />
              <TextInput
                style={styles.employeeCodeInput}
                placeholder="Nhập mã do Admin cấp"
                placeholderTextColor="#D97706"
                value={employeeCode}
                onChangeText={setEmployeeCode}
              />
            </View>
            <Text style={styles.employeeCodeHint}>Liên hệ quản lý để lấy mã này.</Text>
          </View>
        )}

        <AuthInput
          label="HỌ VÀ TÊN"
          icon="user"
          placeholder="Nguyễn Văn A"
          value={name}
          onChangeText={setName}
        />

        <AuthInput
          label="SỐ ĐIỆN THOẠI"
          icon="phone-alt"
          placeholder="0912 xxx xxx"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <AuthInput
          label="EMAIL"
          icon="envelope"
          placeholder="example@gmail.com"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        {/* {showOTP && (
          <OTPInput
            label="XÁC THỰC OTP *"
            value={otp}
            onChangeText={setOtp}
            onSendOTP={handleSendOTP}
            phoneNumber={phone}
          />
        )} */}

        <AuthInput
          label="TẠO MẬT KHẨU MỚI"
          icon="lock"
          placeholder="Tạo mật khẩu"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <AuthInput
          label="XÁC NHẬN MẬT KHẨU"
          icon="lock"
          placeholder="Nhập lại mật khẩu"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {password !== confirmPassword && (
          <Text style={styles.errorText}>Mật khẩu không khớp!</Text>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleRegister} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Đăng ký tài khoản</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Đã có tài khoản? </Text>
        <TouchableOpacity onPress={onSwitchToLogin} activeOpacity={0.7}>
          <Text style={styles.linkText}>Đăng nhập</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '700',
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
  employeeCodeContainer: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  employeeCodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  required: {
    color: '#EF4444',
  },
  employeeCodeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  icon: {
    marginRight: 12,
  },
  employeeCodeInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  employeeCodeHint: {
    fontSize: 9,
    color: '#D97706',
    marginTop: 4,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#16A34A',
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
});

