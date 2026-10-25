import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthInput } from './AuthInput';

type LoginMethod = 'phone' | 'email';

interface LoginFormProps {
  onLogin: (username: string, password: string, rememberMe: boolean) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [method, setMethod] = useState<LoginMethod>('phone');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const selectMethod = (next: LoginMethod) => {
    if (next === method) return;
    setMethod(next);
    setUsername('');
  };

  const handleLogin = () => {
    onLogin(username.trim(), password, rememberMe);
  };

  const isPhone = method === 'phone';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đăng nhập</Text>
      <Text style={styles.subtitle}>Quản lý cửa hàng, kho hàng và đơn hàng</Text>

      <View style={styles.methodRow}>
        <TouchableOpacity
          style={[styles.methodBtn, isPhone && styles.methodBtnOn]}
          onPress={() => selectMethod('phone')}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="phone-alt" size={11} color={isPhone ? '#FFFFFF' : '#4B5563'} />
          <Text style={[styles.methodText, isPhone && styles.methodTextOn]}>Số điện thoại</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.methodBtn, !isPhone && styles.methodBtnOn]}
          onPress={() => selectMethod('email')}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="envelope" size={11} color={!isPhone ? '#FFFFFF' : '#4B5563'} />
          <Text style={[styles.methodText, !isPhone && styles.methodTextOn]}>Email</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <AuthInput
          label={isPhone ? 'SỐ ĐIỆN THOẠI' : 'EMAIL'}
          icon={isPhone ? 'phone-alt' : 'envelope'}
          placeholder={isPhone ? '0912 xxx xxx' : 'example@gmail.com'}
          keyboardType={isPhone ? 'phone-pad' : 'email-address'}
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
        />

        <AuthInput
          label="MẬT KHẨU"
          icon="lock"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

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
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Đăng nhập</Text>
        <FontAwesome5 name="arrow-right" size={12} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 18,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  methodBtnOn: {
    backgroundColor: '#2563EB',
  },
  methodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  methodTextOn: {
    color: '#FFFFFF',
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
});
