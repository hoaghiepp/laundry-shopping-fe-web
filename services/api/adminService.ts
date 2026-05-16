import { API_BASE_URL } from "@/constants/api";
import { SecureStoreKeys } from "@/constants/enum";
import { userAxios } from "@/lib/apiClient";
import * as SecureStore from "@/lib/secureStorage";


export const adminService = {
    getAdminProfile: async (): Promise<any> => {
        const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        if (!token) {
            throw new Error("Token not found");
        }
        const response = await userAxios.get(`${API_BASE_URL}/v1/admin/admins/profile`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    },

}