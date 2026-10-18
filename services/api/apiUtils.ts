import { SecureStoreKeys } from "@/constants/enum";
import axios from "axios";
import * as SecureStore from "@/lib/secureStorage";

export function extractApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const meta = error.response?.data?.meta;
    const code = String(meta?.code ?? "");
    if (!meta?.message && (code === "400040" || code === "400041")) {
      return code === "400040"
        ? "Chỉ dịch vụ mới có món chi tiết"
        : "Số lượng dịch vụ phải bằng tổng số lượng từng món";
    }
    return meta?.message || fallback;
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