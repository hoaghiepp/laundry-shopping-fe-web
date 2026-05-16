import { SecureStoreKeys } from "@/constants/enum";
import * as SecureStore from "@/lib/secureStorage";

export type TokenPair = {
  accessToken: string;
  refreshToken?: string;
};

export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
  } catch {
    return null;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SecureStoreKeys.REFRESH_TOKEN);
  } catch {
    return null;
  }
}

export async function storeTokens(accessToken: string, refreshToken?: string) {
  await SecureStore.setItemAsync(SecureStoreKeys.LOGIN_TOKEN, accessToken);
  if (refreshToken) {
    await SecureStore.setItemAsync(SecureStoreKeys.REFRESH_TOKEN, refreshToken);
  }
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(SecureStoreKeys.LOGIN_TOKEN);
  await SecureStore.deleteItemAsync(SecureStoreKeys.REFRESH_TOKEN);
}

export async function getCustomerOrderAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SecureStoreKeys.CUSTOMER_ORDER_ACCESS_TOKEN);
  } catch {
    return null;
  }
}

export async function getCustomerOrderRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SecureStoreKeys.CUSTOMER_ORDER_REFRESH_TOKEN);
  } catch {
    return null;
  }
}

export async function storeCustomerOrderTokens(accessToken: string, refreshToken?: string) {
  await SecureStore.setItemAsync(SecureStoreKeys.CUSTOMER_ORDER_ACCESS_TOKEN, accessToken);
  if (refreshToken) {
    await SecureStore.setItemAsync(SecureStoreKeys.CUSTOMER_ORDER_REFRESH_TOKEN, refreshToken);
  }
}

export async function clearCustomerOrderTokens() {
  await SecureStore.deleteItemAsync(SecureStoreKeys.CUSTOMER_ORDER_ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(SecureStoreKeys.CUSTOMER_ORDER_REFRESH_TOKEN);
}
