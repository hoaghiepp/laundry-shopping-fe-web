/**
 * Web: expo-secure-store native bridge is unavailable — AsyncStorage is used instead.
 * iOS/Android: delegates to expo-secure-store.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const WEB_KEY_PREFIX = "@lp_auth:";

function webKey(key: string): string {
  return `${WEB_KEY_PREFIX}${key}`;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(webKey(key), value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(webKey(key));
  }
  return SecureStore.getItemAsync(key);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(webKey(key));
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
