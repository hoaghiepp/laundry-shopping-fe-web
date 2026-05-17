import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { LoginForm } from "@/components/auth/LoginForm";
import { UserRole } from "@/components/auth/RoleSelector";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { PlatformMobile, SecureStoreKeys } from "@/constants/enum";
import { loginAndStoreCustomerOrderTokens } from "@/lib/customerOrderSession";
import { clearCustomerOrderTokens, clearTokens } from "@/lib/tokenStore";
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
  useWindowDimensions,
  View,
} from "react-native";

enum AuthMode {
  LOGIN = "login",
  REGISTER = "register",
  FORGOT = "forgot"
}

export default function LoginScreen() {
  /** Web app: staff / store portal only (no customer or factory login). */
  const staffLoginRole = UserRole.STORE;
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

    if (routeRole === UserRole.STORE && email && password) {
      await loginAndStoreCustomerOrderTokens(email, password);
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
          const loginRole =
            Platform.OS === "web"
              ? UserRole.STORE
              : resolveLoginRoleForSession(roles, savedRole);
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
          const loginRoleAfterRefresh =
            Platform.OS === "web"
              ? UserRole.STORE
              : resolveLoginRoleForSession(rolesNew, savedRole);
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

      if (rememberMeEnabled === "true" && savedEmail && savedPassword) {
        setIsAutoLoggingIn(true);
        await performLogin(savedEmail, savedPassword, staffLoginRole, false);
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
        await SecureStore.setItemAsync(SecureStoreKeys.REMEMBER_ME_ROLE, staffLoginRole);
      } catch (error) {
        console.error("Error saving remember me:", error);
      }
    } else {
      await clearRememberMe();
    }

    await performLogin(email, password, staffLoginRole, true);
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

  const { height: windowHeight } = useWindowDimensions();

  if (isAutoLoggingIn) {
    return <LoadingScreen message="Đang đăng nhập tự động..." />;
  }

  return (
    <View style={styles.page}>
      <StatusBar barStyle="dark-content" backgroundColor="#E8EEF7" />

      {isLoading && <LoadingScreen message="Đang đăng nhập..." fullScreen={false} />}

      <View style={styles.pageAccentTop} pointerEvents="none" />
      <View style={styles.pageAccentBottom} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { minHeight: Math.max(windowHeight, 520) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.logo}>
                <View style={styles.logoMark} />
              </View>
              <Text style={styles.brandTitle}>Laundry Pro</Text>
              <Text style={styles.brandSubtitle}>Cổng quản lý cửa hàng</Text>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardBody}>
              {authMode === AuthMode.LOGIN && (
                <LoginForm onLogin={handleLogin} />
              )}

              {authMode === AuthMode.FORGOT && (
                <ForgotPasswordForm
                  onSubmit={handleForgotPassword}
                  onBack={() => setAuthMode(AuthMode.LOGIN)}
                />
              )}
            </View>
          </View>

          <Text style={styles.pageFooter}>© Laundry Pro · Phiên bản nhân viên</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const CARD_MAX_WIDTH = 440;

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#E8EEF7",
  },
  pageAccentTop: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(37, 99, 235, 0.08)",
  },
  pageAccentBottom: {
    position: "absolute",
    bottom: -100,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(99, 102, 241, 0.06)",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  card: {
    width: "100%",
    maxWidth: CARD_MAX_WIDTH,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 32,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: Platform.OS === "web" ? 0.08 : 0.12,
    shadowRadius: 24,
    elevation: 8,
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)" } as object)
      : {}),
  },
  cardHeader: {
    alignItems: "center",
    marginBottom: 4,
  },
  logo: {
    width: 56,
    height: 56,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoMark: {
    width: 22,
    height: 22,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 20,
  },
  cardBody: {
    width: "100%",
  },
  pageFooter: {
    marginTop: 20,
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
