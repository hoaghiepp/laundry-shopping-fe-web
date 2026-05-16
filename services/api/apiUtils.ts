import { SecureStoreKeys } from "@/constants/enum";
import axios from "axios";
import * as SecureStore from "@/lib/secureStorage";

export function extractApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.meta?.message || fallback;
  }
  return fallback;
}

export const getStoreToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
  } catch (error) {
    return null;
  }
};