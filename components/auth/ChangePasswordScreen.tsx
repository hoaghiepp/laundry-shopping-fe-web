import { AuthInput } from "./AuthInput";
import { compatAlert } from "@/lib/compatAlert";
import { authService } from "@/services/api";
import { staffOrderService } from "@/services/api/staffOrderService";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface ChangePasswordScreenProps {
  onBack: () => void;
  onSuccess?: () => void;
  alsoSyncStaffOrderPassword?: boolean;
}

function getErrorMessage(error: unknown): string {
  const e = error as { message?: string; response?: { data?: { message?: string; meta?: { message?: string } } } };
  return (
    e?.response?.data?.message ||
    e?.response?.data?.meta?.message ||
    e?.message ||
    "Không thể đổi mật khẩu. Vui lòng thử lại."
  );
}

export const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({
  onBack,
  onSuccess,
  alsoSyncStaffOrderPassword,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const confirmMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  const validate = (): boolean => {
    if (!currentPassword) {
      compatAlert("Lỗi", "Vui lòng nhập mật khẩu hiện tại");
      return false;
    }
    if (!newPassword) {
      compatAlert("Lỗi", "Vui lòng nhập mật khẩu mới");
      return false;
    }
    if (newPassword.length < 6) {
      compatAlert("Lỗi", "Mật khẩu mới phải có ít nhất 6 ký tự");
      return false;
    }
    if (newPassword !== confirmPassword) {
      compatAlert("Lỗi", "Mật khẩu xác nhận không khớp");
      return false;
    }
    if (newPassword === currentPassword) {
      compatAlert("Lỗi", "Mật khẩu mới phải khác mật khẩu hiện tại");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    const payload = {
      current_password: currentPassword,
      new_password: newPassword,
    };
    try {
      await authService.changePassword(payload);
      if (alsoSyncStaffOrderPassword) {
        await staffOrderService.changePassword(payload);
      }
      compatAlert("Thành công", "Đã đổi mật khẩu", [
        {
          text: "OK",
          onPress: () => {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            onSuccess?.();
            onBack();
          },
        },
      ]);
    } catch (error: unknown) {
      compatAlert("Lỗi", getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} disabled={isLoading}>
          <FontAwesome5 name="arrow-left" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <AuthInput
            label="MẬT KHẨU HIỆN TẠI"
            icon="lock"
            placeholder="Nhập mật khẩu hiện tại"
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
            editable={!isLoading}
          />
          <AuthInput
            label="MẬT KHẨU MỚI"
            icon="key"
            placeholder="Tối thiểu 6 ký tự"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            editable={!isLoading}
          />
          <AuthInput
            label="XÁC NHẬN MẬT KHẨU MỚI"
            icon="lock"
            placeholder="Nhập lại mật khẩu mới"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!isLoading}
            error={confirmMismatch ? "Mật khẩu xác nhận không khớp" : undefined}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cancelButton, isLoading && styles.buttonDisabled]}
          onPress={onBack}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Hủy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (isLoading || confirmMismatch) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isLoading || confirmMismatch}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Lưu</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  form: {
    marginBottom: 100,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B7280",
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
