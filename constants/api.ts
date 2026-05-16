/**
 * API Configuration Constants
 * Centralized location for API-related configuration
 */

import { Platform } from "react-native";

// const REMOTE_API_ORIGIN = "https://laundrypro.io.vn";
const REMOTE_API_ORIGIN = "https://test.dhhcloud.io.vn";

const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

/**
 * - Native: always calls the remote API (no browser CORS).
 * - Web + __DEV__: use same-origin `/v1/...` so requests hit the Expo dev server,
 *   which proxies to the real API via `app/v1/[...segments]+api.ts` (avoids CORS).
 * - Web production: calls REMOTE_API_ORIGIN; the API must return proper CORS headers,
 *   or set EXPO_PUBLIC_API_BASE_URL to a same-origin reverse-proxy URL.
 * - Override anytime with EXPO_PUBLIC_API_BASE_URL (full origin, no trailing slash).
 */
export const API_BASE_URL =
  fromEnv !== undefined && fromEnv !== ""
    ? fromEnv.replace(/\/$/, "")
    : Platform.OS === "web" && typeof __DEV__ !== "undefined" && __DEV__
      ? ""
      : REMOTE_API_ORIGIN;



export const GOSHIP_CLIENT_ID = '222';
export const GOSHIP_CLIENT_SECRET = 'h4rMbHls6JLYJ6zInz4yCA0gtGty0CdH2X6ZtNt9';
export const GOSHIP_BASE_URL = 'https://sandbox.goship.io/api/v2';
export const GOSHIP_USERNAME = 'hiepdang0312@gmail.com'
export const GOSHIP_PASSWORD = 'Hiep_0312!'

export const QR_API_BASE_URL = 'https://api.qrserver.com';

export const VIETQR_TEST_BASE_URL = 'https://dev.vietqr.org/vqr';