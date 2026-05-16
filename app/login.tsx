import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { RoleSelector, UserRole } from "@/components/auth/RoleSelector";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { PlatformMobile, SecureStoreKeys } from "@/constants/enum";
import { clearCustomerOrderTokens, clearTokens, storeCustomerOrderTokens } from "@/lib/tokenStore";
import { compatAlert } from "@/lib/compatAlert";
import { authService, extractLoginTokens, getLoginFailureMessage } from "@/services/api/authService";
import { customerService } from "@/services/api/customerService";
import { fcmService } from "@/services/api/fcmService";
import { clearGlobalUserRole, setGlobalUserRole } from "@/utils/globalState";
import { isJwtExpired, jwtDecoder } from "@/utils/jwtDecoder";
import { setOrientationByRole } from "@/utils/orientation";
import { Href, router } from "expo-router";
import * as SecureStore from "@/lib/secureStorage";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

enum AuthMode {
  LOGIN = "login",
  REGISTER = "register",
  FORGOT = "forgot"
}

export default function LoginScreen() {
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [authMode, setAuthMode] = useState<AuthMode>(AuthMode.LOGIN);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(true);
  const hasCheckedAutoLogin = useRef(false);

  useEffect(() => {
    // Only check auto-login on initial mount (app start), not on navigation
    if (!hasCheckedAutoLogin.current) {
      hasCheckedAutoLogin.current = true;
      checkAutoLogin();
    } else {
      // If already checked, skip auto-login (e.g., coming from logout)
      setIsAutoLoggingIn(false);
    }
  }, []);

  const getHomeRoute = (role: UserRole): string => {
    switch (role) {
      case UserRole.USER:
        return "/home";
      case UserRole.STORE:
        return "/store-home";
      case UserRole.FACTORY:
        return "/factory-home";
      default:
        return "/home";
    }
  };

  const clearRememberMe = async () => {
    try {
      await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_ENABLED);
      await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_EMAIL);
      await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_PASSWORD);
      await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_ROLE);
    } catch (error) {
      console.error("Error clearing remember me:", error);
    }
  };

  /** Web build: only staff or admin may use the app; everyone else is signed out. */
  function isWebStoreStaffOrAdmin(roles: string[]): boolean {
    const staff = roles.some(
      (r) =>
        r === "ROLE_STAFF" ||
        r === "STAFF" ||
        r.toLowerCase().includes("staff")
    );
    const admin = roles.some(
      (r) =>
        r === "ROLE_ADMIN" ||
        r === "ROLE_SUPER_ADMIN" ||
        r.toLowerCase().includes("admin")
    );
    return staff || admin;
  }

  function inferLoginRoleFromRoles(roles: string[]): UserRole {
    const isStore = roles.some(
      (role) =>
        role.toLowerCase().includes("store") ||
        role === "STORE" ||
        role === "ROLE_STORE"
    );
    const isFactory = roles.some(
      (role) =>
        role.toLowerCase().includes("factory") ||
        role === "FACTORY" ||
        role === "ROLE_FACTORY"
    );
    if (isFactory) return UserRole.FACTORY;
    if (isStore) return UserRole.STORE;
    return UserRole.USER;
  }

  function resolveLoginRoleForSession(
    roles: string[],
    savedRole: UserRole | null
  ): UserRole {
    const inferred = inferLoginRoleFromRoles(roles);
    if (
      savedRole == null ||
      (savedRole !== UserRole.USER &&
        savedRole !== UserRole.STORE &&
        savedRole !== UserRole.FACTORY)
    ) {
      return inferred;
    }
    const isStaff = roles.some((role) => role === "ROLE_STAFF");
    const isStore = roles.some(
      (role) =>
        role.toLowerCase().includes("store") ||
        role === "STORE" ||
        role === "ROLE_STORE"
    );
    const isFactory = roles.some(
      (role) =>
        role.toLowerCase().includes("factory") ||
        role === "FACTORY" ||
        role === "ROLE_FACTORY"
    );
    const isAdmin = roles.some(
      (role) => role === "ROLE_ADMIN" || role.toLowerCase().includes("admin")
    );
    if (!isStaff && !isAdmin && (savedRole === UserRole.STORE || savedRole === UserRole.FACTORY)) {
      return inferred;
    }
    if (isStore && !isAdmin && savedRole !== UserRole.STORE) return inferred;
    if (isFactory && !isAdmin && savedRole !== UserRole.FACTORY) return inferred;
    return savedRole;
  }

  const runPostAuthNavigation = async (
    accessToken: string,
    loginRole: UserRole,
    options: {
      showSuccessAlert: boolean;
      email: string;
      password: string;
    }
  ) => {
    const { showSuccessAlert, email, password } = options;

    let roles: string[] = [];
    try {
      const decodedToken = jwtDecoder(accessToken);
      roles = decodedToken.realm_access?.roles || [];
      if (roles.length) {
        setGlobalUserRole(roles);
      }
    } catch (error) {
      console.error("Error decoding token:", error);
    }

    if (Platform.OS === "web") {
      if (!isWebStoreStaffOrAdmin(roles)) {
        try {
          await clearTokens();
          await clearCustomerOrderTokens();
        } catch {
          /* ignore */
        }
        await clearRememberMe();
        clearGlobalUserRole();
        try {
          await SecureStore.deleteItemAsync(SecureStoreKeys.CUSTOMER_PROFILE);
        } catch {
          /* ignore */
        }
        setIsLoading(false);
        setIsAutoLoggingIn(false);
        compatAlert(
          "Lỗi",
          "Phiên bản web chỉ dành cho quản trị hoặc nhân viên tiệm. Vui lòng đăng nhập bằng tài khoản hợp lệ.",
          [{ text: "OK" }]
        );
        router.replace("/login");
        return;
      }
    }

    let routeRole = loginRole;
    if (Platform.OS === "web") {
      routeRole = UserRole.STORE;
    }

    const isStaff = roles.some((role) => role === "ROLE_STAFF");

    const isStore = roles.some(
      (role) =>
        role.toLowerCase().includes("store") ||
        role === "STORE" ||
        role === "ROLE_STORE"
    );

    const isFactory = roles.some(
      (role) =>
        role.toLowerCase().includes("factory") ||
        role === "FACTORY" ||
        role === "ROLE_FACTORY"
    );

    const isAdmin = roles.some(
      (role) => role === "ROLE_ADMIN" || role.toLowerCase().includes("admin")
    );

    if (Platform.OS !== "web") {
      if (!isStaff && !isAdmin && (loginRole === UserRole.STORE || loginRole === UserRole.FACTORY)) {
        await SecureStore.deleteItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        await SecureStore.deleteItemAsync(SecureStoreKeys.REFRESH_TOKEN);
        await clearRememberMe();
        clearGlobalUserRole();
        setIsLoading(false);
        setIsAutoLoggingIn(false);
        compatAlert(
          "Lỗi",
          "Tài khoản khách hàng không thể đăng nhập với vai trò này. Vui lòng chọn vai trò Khách hàng.",
          [{ text: "OK" }]
        );
        return;
      }

      if (isStore && !isAdmin && loginRole !== UserRole.STORE) {
        await SecureStore.deleteItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        await SecureStore.deleteItemAsync(SecureStoreKeys.REFRESH_TOKEN);
        await clearRememberMe();
        clearGlobalUserRole();
        setIsLoading(false);
        setIsAutoLoggingIn(false);
        compatAlert(
          "Lỗi",
          "Tài khoản tiệm không thể đăng nhập với vai trò này. Vui lòng chọn vai trò Tiệm.",
          [{ text: "OK" }]
        );
        return;
      }

      if (isFactory && !isAdmin && loginRole !== UserRole.FACTORY) {
        await SecureStore.deleteItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        await SecureStore.deleteItemAsync(SecureStoreKeys.REFRESH_TOKEN);
        await clearRememberMe();
        clearGlobalUserRole();
        setIsLoading(false);
        setIsAutoLoggingIn(false);
        compatAlert(
          "Lỗi",
          "Tài khoản xưởng không thể đăng nhập với vai trò này. Vui lòng chọn vai trò Xưởng.",
          [{ text: "OK" }]
        );
        return;
      }
    }

    if (Platform.OS !== "web") {
      try {
        await fcmService.requestUserPermission();

        const deviceToken = await fcmService.getDeviceToken();
        console.log("Device FCM Token:", deviceToken);

        const isStaffForFcm = roles.some(
          (role) =>
            role.toLowerCase().includes("staff") ||
            role === "STAFF" ||
            role === "ROLE_STAFF"
        );

        if (isStaffForFcm) {
          await fcmService.staffRegisterDeviceToken({
            platform: PlatformMobile.ANDROID,
            token: deviceToken,
          });
        } else {
          await fcmService.registerDeviceToken({
            platform: PlatformMobile.ANDROID,
            token: deviceToken,
          });
        }
      } catch (error) {
        console.error("Error registering device token:", error);
      }
    }

    const isPureAdmin =
      roles.includes("ROLE_ADMIN") && !roles.includes("ROLE_SUPER_ADMIN");
    if (isPureAdmin && routeRole === UserRole.STORE && email && password) {
      try {
        const customerOrderEmail = `customer${email}`;
        const customerOrderRes: any = await authService.login({
          email: customerOrderEmail,
          password,
        });
        const coTokens = extractLoginTokens(customerOrderRes);
        const coAccess = coTokens.access_token;
        const coRefresh = coTokens.refresh_token;
        if (coAccess) {
          await storeCustomerOrderTokens(coAccess, coRefresh);
        }
      } catch (err) {
        console.warn("Customer order account login failed:", err);
      }
    }

    if (routeRole === UserRole.USER) {
      try {
        const profileResponse = await customerService.getCustomerProfile();
        if (profileResponse?.data) {
          await SecureStore.setItemAsync(
            SecureStoreKeys.CUSTOMER_PROFILE,
            JSON.stringify(profileResponse.data)
          );
        }
      } catch (profileError) {
        console.error("Error fetching customer profile:", profileError);
      }
    }

    await setOrientationByRole(routeRole);

    const homeRoute = getHomeRoute(routeRole);

    if (showSuccessAlert) {
      const roleMessages: Record<UserRole, string> = {
        user: "Đăng nhập KHÁCH HÀNG thành công! Chuyển hướng...",
        store: "Đăng nhập TIỆM thành công! Chuyển hướng...",
        factory: "Đăng nhập XƯỞNG thành công! Chuyển hướng...",
      };

      compatAlert("Thành công", roleMessages[routeRole] || "Đăng nhập thành công!", [
        {
          text: "OK",
          onPress: () => router.replace(homeRoute as Href),
        },
      ]);
    } else {
      router.replace(homeRoute as Href);
    }
  };

  const performLogin = async (
    email: string,
    password: string,
    loginRole: UserRole,
    showSuccessAlert: boolean = true
  ) => {
    setIsLoading(true);
    try {
      const response: any = await authService.login({
        email,
        password,
      });

      const tokens = extractLoginTokens(response);

      await SecureStore.setItemAsync(SecureStoreKeys.LOGIN_TOKEN, tokens.access_token);

      if (tokens.refresh_token) {
        await SecureStore.setItemAsync(SecureStoreKeys.REFRESH_TOKEN, tokens.refresh_token);
      }

      console.log("Login successful:", response);

      await runPostAuthNavigation(tokens.access_token, loginRole, {
        showSuccessAlert,
        email,
        password,
      });
    } catch (error: unknown) {
      console.log("Error login:", error);

      if (isAutoLoggingIn) {
        await clearRememberMe();
      }
      compatAlert("Lỗi", getLoginFailureMessage(error));
    } finally {
      setIsLoading(false);
      setIsAutoLoggingIn(false);
    }
  };

  const checkAutoLogin = async () => {
    try {
      const accessToken = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
      const refreshToken = await SecureStore.getItemAsync(SecureStoreKeys.REFRESH_TOKEN);
      const savedRole = (await SecureStore.getItemAsync(
        SecureStoreKeys.REMEMBER_ME_ROLE
      )) as UserRole | null;
      const savedEmail = await SecureStore.getItemAsync(SecureStoreKeys.REMEMBER_ME_EMAIL);
      const savedPassword = await SecureStore.getItemAsync(SecureStoreKeys.REMEMBER_ME_PASSWORD);

      const resumeWithAccess = async (token: string) => {
        setIsAutoLoggingIn(true);
        setIsLoading(true);
        try {
          let roles: string[] = [];
          let emailFromToken = "";
          try {
            const decoded = jwtDecoder(token);
            roles = decoded.realm_access?.roles || [];
            emailFromToken = decoded.email || "";
          } catch {
            roles = [];
          }
          const loginRole = resolveLoginRoleForSession(roles, savedRole);
          const emailForSession = savedEmail || emailFromToken;
          const passwordForSession = savedPassword || "";
          await runPostAuthNavigation(token, loginRole, {
            showSuccessAlert: false,
            email: emailForSession,
            password: passwordForSession,
          });
        } catch (e) {
          console.warn("resume session failed:", e);
        } finally {
          setIsLoading(false);
          setIsAutoLoggingIn(false);
        }
      };

      // 1) Access token still valid — go home without calling refresh
      if (accessToken && !isJwtExpired(accessToken)) {
        await resumeWithAccess(accessToken);
        return;
      }

      // 2) Access missing/expired but refresh still valid — rotate tokens then go home
      if (refreshToken && !isJwtExpired(refreshToken)) {
        setIsAutoLoggingIn(true);
        setIsLoading(true);
        try {
          const refreshBody = await authService.refreshWithRefreshToken(refreshToken);
          const tokens = extractLoginTokens(refreshBody);
          await SecureStore.setItemAsync(SecureStoreKeys.LOGIN_TOKEN, tokens.access_token);
          if (tokens.refresh_token) {
            await SecureStore.setItemAsync(SecureStoreKeys.REFRESH_TOKEN, tokens.refresh_token);
          }
          let rolesNew: string[] = [];
          let emailFromAccess = "";
          try {
            const decodedAccess = jwtDecoder(tokens.access_token);
            rolesNew = decodedAccess.realm_access?.roles || [];
            emailFromAccess = decodedAccess.email || "";
          } catch {
            rolesNew = [];
          }
          const loginRoleAfterRefresh = resolveLoginRoleForSession(rolesNew, savedRole);
          await runPostAuthNavigation(tokens.access_token, loginRoleAfterRefresh, {
            showSuccessAlert: false,
            email: savedEmail || emailFromAccess,
            password: savedPassword || "",
          });
        } catch (e) {
          console.warn("Silent refresh failed:", e);
          try {
            await clearTokens();
          } catch {
            /* ignore */
          }
        } finally {
          setIsLoading(false);
          setIsAutoLoggingIn(false);
        }
        return;
      }

      // 3) Remember-me password login (legacy)
      if (!accessToken) {
        setIsAutoLoggingIn(false);
        return;
      }

      const rememberMeEnabled = await SecureStore.getItemAsync(
        SecureStoreKeys.REMEMBER_ME_ENABLED
      );

      if (rememberMeEnabled === "true" && savedEmail && savedPassword && savedRole) {
        setIsAutoLoggingIn(true);
        await performLogin(savedEmail, savedPassword, savedRole, false);
      } else {
        setIsAutoLoggingIn(false);
      }
    } catch (error) {
      console.error("Error checking auto-login:", error);
      setIsAutoLoggingIn(false);
    }
  };

  const handleLogin = async (email: string, password: string, rememberMe: boolean) => {
    if (rememberMe) {
      try {
        await SecureStore.setItemAsync(SecureStoreKeys.REMEMBER_ME_ENABLED, "true");
        await SecureStore.setItemAsync(SecureStoreKeys.REMEMBER_ME_EMAIL, email);
        await SecureStore.setItemAsync(SecureStoreKeys.REMEMBER_ME_PASSWORD, password);
        await SecureStore.setItemAsync(SecureStoreKeys.REMEMBER_ME_ROLE, role);
      } catch (error) {
        console.error("Error saving remember me:", error);
      }
    } else {
      await clearRememberMe();
    }

    await performLogin(email, password, role, true);
  };

  const handleRegister = async (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    otp?: string;
    employeeCode?: string;
  }) => {
    if (role === UserRole.USER) {
      try {
        const nameParts = data.name.trim().split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || nameParts[0];
        console.log(firstName, lastName, data.email, data.password);
        const response = await authService.register({
          full_name: data.name,
          phone_number: data.phone,
          email: data.email,
          password: data.password,
        });
        console.log(response);
        compatAlert(
          "Thành công",
          "Đăng ký KHÁCH HÀNG thành công! Vui lòng đăng nhập.",
          [
            {
              text: "OK",
              onPress: () => setAuthMode(AuthMode.LOGIN),
            },
          ]
        );
      } catch (error: any) {
        compatAlert(
          "Lỗi",
          error.message || "Đăng ký thất bại. Vui lòng thử lại."
        );
        console.log(error);
      }
    } else {
      compatAlert(
        "Thành công",
        `Gửi yêu cầu kích hoạt (${role}) thành công! Chờ Admin duyệt.`
      );
    }
  };

  const handleForgotPassword = (
    phone: string,
    otp: string,
    newPassword: string
  ) => {
    compatAlert(
      "Thành công",
      "Đổi mật khẩu thành công! Vui lòng đăng nhập lại.",
      [
        {
          text: "OK",
          onPress: () => setAuthMode(AuthMode.LOGIN),
        },
      ]
    );
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setAuthMode(AuthMode.LOGIN);
  };

  if (isAutoLoggingIn) {
    return <LoadingScreen message="Đang đăng nhập tự động..." />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {isLoading && <LoadingScreen message="Đang đăng nhập..." fullScreen={false} />}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Branding */}
          <View style={styles.branding}>
            <View style={styles.iconContainer}>
              <View style={styles.icon}>
                <View style={styles.iconInner}>
                  {/* Simple T-shirt representation */}
                  <View style={styles.tshirt} />
                </View>
              </View>
            </View>
            <Text style={styles.brandTitle}>Laundry Pro</Text>
          </View>

          {/* Role Selector - Hidden for Forgot Password */}
          {authMode !== AuthMode.FORGOT && (
            <RoleSelector selectedRole={role} onRoleChange={handleRoleChange} />
          )}

          {/* Auth Forms */}
          <View style={styles.formContainer}>
            {authMode === AuthMode.LOGIN && (
              <LoginForm
                role={role}
                onLogin={handleLogin}
                onSwitchToRegister={() => setAuthMode(AuthMode.REGISTER)}
                onSwitchToForgot={() => setAuthMode(AuthMode.FORGOT)}
              />
            )}

            {authMode === AuthMode.REGISTER && (
              <RegisterForm
                role={role}
                onRegister={handleRegister}
                onSwitchToLogin={() => setAuthMode(AuthMode.LOGIN)}
              />
            )}

            {authMode === AuthMode.FORGOT && (
              <ForgotPasswordForm
                onSubmit={handleForgotPassword}
                onBack={() => setAuthMode(AuthMode.LOGIN)}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 40,
  },
  branding: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  iconContainer: {
    marginBottom: 12,
  },
  icon: {
    width: 64,
    height: 64,
    backgroundColor: "#2563EB",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ rotate: "3deg" }],
  },
  iconInner: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  tshirt: {
    width: 24,
    height: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  formContainer: {
    width: "100%",
  },
});
