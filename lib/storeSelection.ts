import { SecureStoreKeys } from "@/constants/enum";
import * as SecureStore from "@/lib/secureStorage";

/**
 * Save the last selected store ID
 */
export async function saveLastSelectedStoreId(storeId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(SecureStoreKeys.LAST_SELECTED_STORE_ID, storeId);
  } catch (error) {
    console.error("Failed to save last selected store ID:", error);
  }
}

/**
 * Get the last selected store ID
 */
export async function getLastSelectedStoreId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SecureStoreKeys.LAST_SELECTED_STORE_ID);
  } catch (error) {
    console.error("Failed to get last selected store ID:", error);
    return null;
  }
}

/**
 * Save the last selected factory ID
 */
export async function saveLastSelectedFactoryId(factoryId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(SecureStoreKeys.LAST_SELECTED_FACTORY_ID, factoryId);
  } catch (error) {
    console.error("Failed to save last selected factory ID:", error);
  }
}

/**
 * Get the last selected factory ID
 */
export async function getLastSelectedFactoryId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SecureStoreKeys.LAST_SELECTED_FACTORY_ID);
  } catch (error) {
    console.error("Failed to get last selected factory ID:", error);
    return null;
  }
}

