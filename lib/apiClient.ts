import { API_BASE_URL } from "@/constants/api";
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { handleSessionExpired } from "./logoutHandler";
import {
  getAccessToken,
  getRefreshToken,
  storeTokens,
  getCustomerOrderAccessToken,
  getCustomerOrderRefreshToken,
  storeCustomerOrderTokens,
} from "./tokenStore";

/** Full URL string for 401 skip checks (axios may set `url` relative to baseURL or absolute). */
function requestUrlFor401Skip(config: InternalAxiosRequestConfig | undefined): string {
  if (!config) return "";
  if (config.url && /^https?:\/\//i.test(config.url)) return config.url;
  return `${config.baseURL ?? ""}${config.url ?? ""}`;
}

/**
 * plainAxios: never run refresh+retry on these — wrong password/login 401 is not "session expired",
 * and /v1/public/refresh 401 while `isRefreshing` is true would queue forever (deadlock with login 401).
 */
function shouldPlainAxiosSkip401Refresh(config: InternalAxiosRequestConfig | undefined): boolean {
  const u = requestUrlFor401Skip(config);
  return (
    u.includes("/v1/public/login") ||
    u.includes("/v1/public/refresh") ||
    u.includes("/v1/public/customers/register")
  );
}

/**
 * Axios "trần" chỉ dùng cho refresh/login/register để tránh recursion.
 */
const plainAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

async function refreshAccessToken(): Promise<string> {
  console.log("refreshAccessToken");
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    await handleSessionExpired();
    throw new Error("No refresh token available");
  }

  try {
    console.log("refreshAccessToken try");
    const res = await plainAxios.post("/v1/public/refresh", {
      refresh_token: refreshToken,
    });
    console.log("refreshAccessToken res", res.data);

    const newAccessToken = res.data?.data?.access_token;
    const newRefreshToken = res.data?.data?.refresh_token;


    if (!newAccessToken) throw new Error("Invalid refresh response");

    await storeTokens(newAccessToken, newRefreshToken);
    return newAccessToken;
  } catch (error: any) {
    console.log("refreshAccessToken error", error);
    await handleSessionExpired();
    throw new Error("Session expired");
  }
}

export const userAxios: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Request: gắn Bearer token.
 */
userAxios.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

function processQueue(err: any, token?: string) {
  failedQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
  failedQueue = [];
}

/**
 * Response: nếu 401 thì refresh và retry.
 */
userAxios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // Trường hợp không có response => network/CORS/timeout... không phải 401 backend
    if (!error.response) return Promise.reject(error);

    if (error.response.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      // Nếu đang refresh, queue request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers = originalRequest.headers ?? {};
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(userAxios(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        processQueue(null, newToken);

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return userAxios(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

plainAxios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // Trường hợp không có response => network/CORS/timeout... không phải 401 backend
    if (!error.response) return Promise.reject(error);

    if (error.response.status === 401 && !originalRequest?._retry) {
      if (shouldPlainAxiosSkip401Refresh(originalRequest)) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // Nếu đang refresh, queue request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers = originalRequest.headers ?? {};
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(plainAxios(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        processQueue(null, newToken);

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return plainAxios(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Customer Order Axios ────────────────────────────────────────────────────
// Separate axios instance that uses the customer order account tokens.
// Has its own refresh track so it never interferes with the main user tokens.

let isRefreshingCustomerOrder = false;
let failedCustomerOrderQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

function processCustomerOrderQueue(err: any, token?: string) {
  failedCustomerOrderQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
  failedCustomerOrderQueue = [];
}

async function refreshCustomerOrderToken(): Promise<string> {
  const refreshToken = await getCustomerOrderRefreshToken();
  if (!refreshToken) throw new Error("No customer order refresh token available");

  const res = await plainAxios.post("/v1/public/refresh", {
    refresh_token: refreshToken,
  });

  const newAccessToken = res.data?.data?.access_token;
  const newRefreshToken = res.data?.data?.refresh_token;
  if (!newAccessToken) throw new Error("Invalid customer order refresh response");

  await storeCustomerOrderTokens(newAccessToken, newRefreshToken);
  return newAccessToken;
}

export const customerOrderAxios: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

customerOrderAxios.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getCustomerOrderAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

customerOrderAxios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest: any = error.config;
    if (!error.response) return Promise.reject(error);

    if (error.response.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      if (isRefreshingCustomerOrder) {
        return new Promise((resolve, reject) => {
          failedCustomerOrderQueue.push({
            resolve: (token: string) => {
              originalRequest.headers = originalRequest.headers ?? {};
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(customerOrderAxios(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshingCustomerOrder = true;

      try {
        const newToken = await refreshCustomerOrderToken();
        processCustomerOrderQueue(null, newToken);
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return customerOrderAxios(originalRequest);
      } catch (refreshErr) {
        processCustomerOrderQueue(refreshErr);
        return Promise.reject(refreshErr);
      } finally {
        isRefreshingCustomerOrder = false;
      }
    }

    return Promise.reject(error);
  }
);

export { plainAxios };

