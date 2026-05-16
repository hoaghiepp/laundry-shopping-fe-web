import { AuthInput } from "@/components/auth/AuthInput";
import { compatAlert } from "@/lib/compatAlert";
import { staffService, storeService } from "@/services/api";
import { FontAwesome5 } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface StaffRegistrationScreenProps {
  storeId: string;
  onBack: () => void;
  onSuccess?: () => void;
}

export const StaffRegistrationScreen: React.FC<
  StaffRegistrationScreenProps
> = ({ storeId, onBack, onSuccess }) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [jobTitle, setJobTitle] = useState("STORE_STAFF");
  const [isLoading, setIsLoading] = useState(false);

  const jobTitles = [
    { value: "STORE_STAFF", label: "Nhân viên cửa hàng" },
    { value: "STORE_MANAGER", label: "Quản lý cửa hàng" },
    { value: "CASHIER", label: "Thu ngân" },
    { value: "WAREHOUSE_STAFF", label: "Nhân viên kho" },
  ];

  const validateForm = (): boolean => {
    if (!fullName.trim()) {
      compatAlert("Lỗi", "Vui lòng nhập họ và tên");
      return false;
    }

    if (!email.trim()) {
      compatAlert("Lỗi", "Vui lòng nhập email");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      compatAlert("Lỗi", "Email không hợp lệ");
      return false;
    }

    if (!phoneNumber.trim()) {
      compatAlert("Lỗi", "Vui lòng nhập số điện thoại");
      return false;
    }

    if (phoneNumber.length < 10) {
      compatAlert("Lỗi", "Số điện thoại phải có ít nhất 10 số");
      return false;
    }

    if (!password) {
      compatAlert("Lỗi", "Vui lòng nhập mật khẩu");
      return false;
    }

    if (password.length < 6) {
      compatAlert("Lỗi", "Mật khẩu phải có ít nhất 6 ký tự");
      return false;
    }

    if (password !== confirmPassword) {
      compatAlert("Lỗi", "Mật khẩu xác nhận không khớp");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    let staffId: string | null = null;

    try {
      const data = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim(),
        password,
      };

      console.log("Registering staff with data:", data);

      const staffRegisterResponse = await staffService.registerStaff(data);
      console.log("Staff registered:", staffRegisterResponse);
      staffId = staffRegisterResponse.data.id;
    } catch (error: any) {
      console.log("Error registering staff:", error.message);
      compatAlert(
        "Lỗi",
        error?.message || "Đăng ký nhân viên thất bại. Vui lòng thử lại."
      );
      setIsLoading(false);
      return;
    }

    try {
      
      const data = {
        position: jobTitle,
        staff_id: staffId as string,
        store_id: storeId,
      };
      console.log("Registering store staff with data:", data);
      await storeService.registerStaff(data);

      compatAlert("Thành công", "Đăng ký tài khoản nhân viên thành công!", [
        {
          text: "OK",
          onPress: () => {
            if (onSuccess) {
              onSuccess();
            } else {
              onBack();
            }
          },
        },
      ]);
    } catch (error: any) {
      // TODO: Rollback staff creation if needed
      compatAlert(
        "Lỗi",
        error?.message || "Gán nhân viên vào cửa hàng thất bại. Vui lòng thử lại."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <FontAwesome5 name="arrow-left" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đăng ký nhân viên</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Box */}
        {/* <View style={styles.infoBox}>
          <FontAwesome5
            name="info-circle"
            size={16}
            color="#2563EB"
            style={styles.infoIcon}
          />
          <Text style={styles.infoText}>
            Điền thông tin để tạo tài khoản cho nhân viên mới. Nhân viên sẽ nhận
            được thông tin đăng nhập qua email.
          </Text>
        </View> */}

        {/* Form */}
        <View style={styles.form}>
          <AuthInput
            label="HỌ VÀ TÊN"
            icon="user"
            placeholder="Nguyễn Văn A"
            value={fullName}
            onChangeText={setFullName}
          />

          <AuthInput
            label="EMAIL"
            icon="envelope"
            placeholder="example@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <AuthInput
            label="SỐ ĐIỆN THOẠI"
            icon="phone-alt"
            placeholder="0912345678"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CHỨC VỤ</Text>
            <View style={styles.jobTitleContainer}>
              {jobTitles.map((title) => (
                <TouchableOpacity
                  key={title.value}
                  style={[
                    styles.jobTitleChip,
                    jobTitle === title.value && styles.jobTitleChipSelected,
                  ]}
                  onPress={() => setJobTitle(title.value)}
                >
                  <Text
                    style={[
                      styles.jobTitleText,
                      jobTitle === title.value && styles.jobTitleTextSelected,
                    ]}
                  >
                    {title.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <AuthInput
            label="MẬT KHẨU"
            icon="lock"
            placeholder="Tối thiểu 6 ký tự"
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
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cancelButton, isLoading && styles.buttonDisabled]}
          onPress={onBack}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Hủy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.registerButton, isLoading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          <Text style={styles.registerButtonText}>
            {isLoading ? "Đang xử lý..." : "Đăng ký"}
          </Text>
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
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
    fontWeight: "700",
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
  infoBox: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 20,
  },
  form: {
    marginBottom: 100,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  jobTitleContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  jobTitleChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  jobTitleChipSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  jobTitleText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
  },
  jobTitleTextSelected: {
    color: "#FFFFFF",
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
  registerButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
