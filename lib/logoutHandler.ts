import { SecureStoreKeys } from "@/constants/enum";
import { fcmService } from "@/services/api/fcmService";
import { clearGlobalUserRole, getGlobalUserRole } from "@/utils/globalState";
import { resetOrientationToPortrait } from "@/utils/orientation";
import { router } from "expo-router";
import * as SecureStore from "@/lib/secureStorage";
import { clearTokens } from "./tokenStore";

/**
 * Handle session expiration - show notification and logout
 */
export async function handleSessionExpired() {
  try {
    // Unregister device token before clearing tokens
    try {
      const roles = getGlobalUserRole();
      const isStaff = roles && Array.isArray(roles) 
        ? roles.some(role => role.toLowerCase().includes('staff') || role === 'STAFF' || role === 'ROLE_STAFF')
        : false;
      
      if (isStaff) {
        await fcmService.staffUnregisterDeviceToken();
      } else {
        await fcmService.unregisterDeviceToken();
      }
    } catch (error) {
      console.error("Error unregistering device token:", error);
      // Continue with logout even if unregister fails
    }

    // Clear all tokens and user data
    await clearTokens();

    // Clear "Remember Me" settings
    await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_ENABLED);
    await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_EMAIL);
    await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_PASSWORD);
    await SecureStore.deleteItemAsync(SecureStoreKeys.REMEMBER_ME_ROLE);

    // Clear customer profile if exists
    try {
      await SecureStore.deleteItemAsync(SecureStoreKeys.CUSTOMER_PROFILE);
    } catch (e) {
      // Ignore if doesn't exist
    }

    // Clear global user role
    clearGlobalUserRole();

    // Reset orientation to portrait on logout
    await resetOrientationToPortrait();

    router.replace("/login");

    // Show notification about session ending
    // Alert.alert(
    //   "Phiên đăng nhập đã hết hạn",
    //   "Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.",
    //   [
    //     {
    //       text: "Đăng nhập lại",
    //       onPress: () => {
    //         router.replace("/login");
    //       },
    //     },
    //   ],
    //   { cancelable: false }
    // );
  } catch (error) {
    console.error("Error during session expiration handling:", error);
    // Still navigate to login even if clearing fails
    router.replace("/login");
  }
}

