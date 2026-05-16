// src/services/fcmService.ts (hoặc notificationService.ts)

import { API_BASE_URL } from "@/constants/api";
import { PlatformMobile, SecureStoreKeys } from "@/constants/enum";
import { userAxios } from "@/lib/apiClient";
import * as Device from "expo-device";
import * as SecureStore from "@/lib/secureStorage";

/** Avoid static import: expo-notifications touches localStorage at load time and breaks web SSR. */
async function getNotifications() {
  return await import("expo-notifications");
}


export interface RegisterDeviceTokenRequest {
    platform: PlatformMobile;
    token: string; // ở đây chính là Expo Push Token
}


export const fcmService = {
    /**
     * Đăng ký token (Expo Push Token) với backend
     */
    async registerDeviceToken(
        data: RegisterDeviceTokenRequest
    ): Promise<any> {
        const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        if (!token) {
            throw new Error("Token not found");
        }
        const res = await userAxios.post(
            `${API_BASE_URL}/v1/customer/fcm-token/register`,
            data,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return res.data;
    },

    async unregisterDeviceToken(
    ): Promise<any> {
        const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        if (!token) {
            throw new Error("Token not found");
        }
        const res = await userAxios.post(
            `${API_BASE_URL}/v1/customer/fcm-token/unregister`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return res.data;
    },

    async staffRegisterDeviceToken(data: RegisterDeviceTokenRequest): Promise<any> {
        const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        if (!token) {
            throw new Error("Token not found");
        }
        const res = await userAxios.post(
            `${API_BASE_URL}/v1/staff/fcm-token/register`,
            data,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return res.data;
    },

    async staffUnregisterDeviceToken(): Promise<any> {
        const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        if (!token) {
            throw new Error("Token not found");
        }
        const res = await userAxios.post(
            `${API_BASE_URL}/v1/staff/fcm-token/unregister`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return res.data;
    },

    async requestUserPermission(): Promise<any> {
        try {
            if (!Device.isDevice) {
                console.log("[Permission] Must use physical device.");
                return false;
            }

            const Notifications = await getNotifications();
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== "granted") {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            const granted = finalStatus === "granted";
            console.log("[Permission] Granted:", granted);

            return granted;
        } catch (err) {
            console.error("[Permission] Error:", err);
            return false;
        }
    },

    async getDeviceToken(): Promise<any> {
        const Notifications = await getNotifications();
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        return deviceToken.data;
    }
};
