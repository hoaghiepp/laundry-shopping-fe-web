import { SecureStoreKeys } from "@/constants/enum";
import { authService, extractLoginTokens } from "@/services/api/authService";
import { isJwtExpired, jwtDecoder } from "@/utils/jwtDecoder";
import * as SecureStore from "@/lib/secureStorage";
import {
  getAccessToken,
  getCustomerOrderAccessToken,
  getCustomerOrderRefreshToken,
  storeCustomerOrderTokens,
} from "./tokenStore";

/** Backend pairs staff hub login with a synthetic customer account for cart/order APIs. */
export function customerOrderEmailFromStaffEmail(staffEmail: string): string {
  const trimmed = staffEmail.trim();
  if (trimmed.toLowerCase().startsWith("customer")) return trimmed;
  return `customer${trimmed}`;
}

/**
 * Login as the linked customer-order account and persist CUSTOMER_ORDER_* tokens.
 */
export async function loginAndStoreCustomerOrderTokens(
  staffEmail: string,
  password: string
): Promise<boolean> {
  try {
    const customerOrderEmail = customerOrderEmailFromStaffEmail(staffEmail);
    const res = await authService.login({
      email: customerOrderEmail,
      password,
    });
    const tokens = extractLoginTokens(res);
    if (!tokens.access_token) return false;
    await storeCustomerOrderTokens(tokens.access_token, tokens.refresh_token);
    return true;
  } catch (err) {
    console.warn("Customer order account login failed:", err);
    return false;
  }
}

async function refreshCustomerOrderTokensFromStorage(): Promise<boolean> {
  const refresh = await getCustomerOrderRefreshToken();
  if (!refresh || isJwtExpired(refresh)) return false;

  try {
    const body = await authService.refreshWithRefreshToken(refresh);
    const tokens = extractLoginTokens(body);
    if (!tokens.access_token) return false;
    await storeCustomerOrderTokens(tokens.access_token, tokens.refresh_token);
    return true;
  } catch (err) {
    console.warn("Customer order token refresh failed:", err);
    return false;
  }
}

async function resolveStaffCredentials(): Promise<{ email: string; password: string } | null> {
  const rememberEmail = await SecureStore.getItemAsync(SecureStoreKeys.REMEMBER_ME_EMAIL);
  const rememberPassword = await SecureStore.getItemAsync(SecureStoreKeys.REMEMBER_ME_PASSWORD);
  if (rememberEmail && rememberPassword) {
    return { email: rememberEmail, password: rememberPassword };
  }

  const access = await getAccessToken();
  if (!access || !rememberPassword) return null;

  try {
    const decoded = jwtDecoder(access);
    const email = decoded.email?.trim();
    if (email) return { email, password: rememberPassword };
  } catch {
    /* ignore */
  }
  return null;
}

let ensureInFlight: Promise<boolean> | null = null;

/**
 * Ensures CUSTOMER_ORDER_* tokens exist for staffOrderService / customerOrderAxios.
 * Call after main session is valid (login, reload, store-home mount).
 */
export function ensureCustomerOrderTokensFromStorage(): Promise<boolean> {
  if (!ensureInFlight) {
    ensureInFlight = runEnsureCustomerOrderTokens().finally(() => {
      ensureInFlight = null;
    });
  }
  return ensureInFlight;
}

async function runEnsureCustomerOrderTokens(): Promise<boolean> {
  const access = await getCustomerOrderAccessToken();
  if (access && !isJwtExpired(access)) {
    return true;
  }

  if (await refreshCustomerOrderTokensFromStorage()) {
    return true;
  }

  const creds = await resolveStaffCredentials();
  if (!creds) {
    return false;
  }

  return loginAndStoreCustomerOrderTokens(creds.email, creds.password);
}
