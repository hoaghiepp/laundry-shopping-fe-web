import { SecureStoreKeys } from '@/constants/enum';
import * as SecureStore from "@/lib/secureStorage";

export const authUtils = {
  async hasUserToken(): Promise<boolean> {
    try {
      const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
      return !!token;
    } catch {
      return false;
    }
  },

  async getUserToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    } catch {
      return null;
    }
  },
};

