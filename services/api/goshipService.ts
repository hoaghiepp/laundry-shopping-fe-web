import {
  GOSHIP_BASE_URL,
  GOSHIP_CLIENT_ID,
  GOSHIP_CLIENT_SECRET,
  GOSHIP_PASSWORD,
  GOSHIP_USERNAME,
} from "@/constants/api";
import { SecureStoreKeys } from "@/constants/enum";
import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "@/lib/secureStorage";

export interface LoginRequest {
  username: string;
  password: string;
  client_id: string;
  client_secret: string;
}

export interface TokenResponse {
  code: number;
  status: string;
  data: any[];
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

export interface PaginationLinks {
  next: string | null;
  previous: string | null;
}

export interface PaginationMeta {
  pagination: {
    count: number;
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    links: PaginationLinks;
  };
}

export interface PaginatedResponse<T = any> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationOptions {
  page?: number;
  per_page?: number;
}

export interface AddressLocation {
  district: string | number;
  city: string | number;
  ward?: string | number;
}

export interface ShipmentAddress {
  name: string;
  phone: string;
  street: string;
  ward: string | number;
  district: string | number;
  city: string | number;
}

export interface Parcel {
  cod: number;
  amount: number;
  width: number;
  height: number;
  length: number;
  weight: number;
}

export interface ShipmentParcel {
  cod: number;
  amount: number;
  weight: string;
  width: string;
  height: string;
  length: string;
  metadata?: string;
}

export interface RateRequest {
  shipment: {
    address_from: AddressLocation;
    address_to: AddressLocation;
    parcel: Parcel;
  };
}

export interface RateResponse {
  code?: number;
  status?: string;
  data?: any;
  meta?: {
    message?: string;
  };
}

export interface ShipmentRequest {
  shipment: {
    rate: string;
    payer: 0 | 1;
    order_id: string;
    address_from: ShipmentAddress;
    address_to: ShipmentAddress;
    parcel: ShipmentParcel;
  };
}

export interface ShipmentResponse {
  id: string;
  shipment_status: number;
  shipment_status_txt: string;
  cod: number;
  fee: number;
  tracking_number: string;
  carrier: string;
  carrier_short_name: string;
  sorting_code: string;
  return_sorting_code: string;
  amount_return_shop: number;
  created_at: string;
  carrier_error?: string;
}

export interface DeleteShipmentResponse {
  code: number;
  status: string;
  data?: string;
  message?: string;
}

// Token management functions
const getStoredToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(SecureStoreKeys.GOSHIP_ACCESS_TOKEN);
  } catch (error) {
    return null;
  }
};

const getStoredRefreshToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(SecureStoreKeys.GOSHIP_REFRESH_TOKEN);
  } catch (error) {
    return null;
  }
};

const getTokenExpiresAt = async (): Promise<number | null> => {
  try {
    const expiresAt = await SecureStore.getItemAsync(
      SecureStoreKeys.GOSHIP_TOKEN_EXPIRES_AT
    );
    return expiresAt ? parseInt(expiresAt, 10) : null;
  } catch (error) {
    return null;
  }
};

const storeTokens = async (response: TokenResponse): Promise<void> => {
  try {
    const expiresAt = Date.now() + response.expires_in * 1000;
    await SecureStore.setItemAsync(
      SecureStoreKeys.GOSHIP_ACCESS_TOKEN,
      response.access_token
    );
    await SecureStore.setItemAsync(
      SecureStoreKeys.GOSHIP_REFRESH_TOKEN,
      response.refresh_token
    );
    await SecureStore.setItemAsync(
      SecureStoreKeys.GOSHIP_TOKEN_EXPIRES_AT,
      expiresAt.toString()
    );
  } catch (error) {
    console.error("Failed to store tokens:", error);
  }
};

const clearTokens = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(SecureStoreKeys.GOSHIP_ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(SecureStoreKeys.GOSHIP_REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(SecureStoreKeys.GOSHIP_TOKEN_EXPIRES_AT);
  } catch (error) {
    console.error("Failed to clear tokens:", error);
  }
};

const isTokenExpired = async (): Promise<boolean> => {
  const expiresAt = await getTokenExpiresAt();
  if (!expiresAt) return true;
  // Refresh token 5 minutes before expiry
  return Date.now() >= expiresAt - 5 * 60 * 1000;
};

// Auto-login function
const autoLogin = async (): Promise<string> => {
  try {
    const response = await axios.post<TokenResponse>(
      `${GOSHIP_BASE_URL}/login`,
      {
        username: GOSHIP_USERNAME,
        password: GOSHIP_PASSWORD,
        client_id: GOSHIP_CLIENT_ID,
        client_secret: GOSHIP_CLIENT_SECRET,
      }
    );

    await storeTokens(response.data);
    return response.data.access_token;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.meta?.message || "Auto-login failed"
      );
    }
    throw error;
  }
};

// Refresh token function (fallback to login if refresh endpoint doesn't exist)
const refreshToken = async (): Promise<string> => {
  const refreshTokenValue = await getStoredRefreshToken();

  if (!refreshTokenValue) {
    // No refresh token, perform auto-login
    return await autoLogin();
  }

  try {
    // Try to use refresh token endpoint if available
    // If the API doesn't have a refresh endpoint, this will fail and fall back to login
    const response = await axios.post<TokenResponse>(
      `${GOSHIP_BASE_URL}/refresh`,
      {
        refresh_token: refreshTokenValue,
      }
    );

    await storeTokens(response.data);
    return response.data.access_token;
  } catch (error) {
    // If refresh fails, try auto-login
    console.warn("Refresh token failed, attempting auto-login:", error);
    return await autoLogin();
  }
};

// Get valid token (refresh if needed)
const getValidToken = async (): Promise<string> => {
  const token = await getStoredToken();
  const expired = await isTokenExpired();

  if (!token || expired) {
    // Token expired or doesn't exist, refresh it
    return await refreshToken();
  }

  return token;
};

// Create axios instance with interceptor
const goshipAxios: AxiosInstance = axios.create({
  baseURL: GOSHIP_BASE_URL,
});

// Request interceptor to add token
goshipAxios.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getValidToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

goshipAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return goshipAxios(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshToken();
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return goshipAxios(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await clearTokens();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const goshipService = {
  login: async (data?: LoginRequest): Promise<TokenResponse> => {
    try {
      const loginData = data || {
        username: GOSHIP_USERNAME,
        password: GOSHIP_PASSWORD,
        client_id: GOSHIP_CLIENT_ID,
        client_secret: GOSHIP_CLIENT_SECRET,
      };

      const response = await axios.post<TokenResponse>(
        `${GOSHIP_BASE_URL}/login`,
        loginData
      );
      await storeTokens(response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.meta?.message || "Login failed");
      }
      throw error;
    }
  },

  // Get current token (automatically refreshes if needed)
  getToken: async (): Promise<string> => {
    return await getValidToken();
  },

  // Manual refresh token
  refreshToken: async (): Promise<string> => {
    return await refreshToken();
  },

  // Clear stored tokens
  logout: async (): Promise<void> => {
    await clearTokens();
  },

  // Get axios instance with automatic token management
  getAxiosInstance: (): AxiosInstance => {
    return goshipAxios;
  },

  getCities: async (options?: PaginationOptions): Promise<PaginatedResponse> => {
    try {
      const response = await goshipAxios.get<PaginatedResponse>("/cities", {
        params: {
          page: options?.page || 1,
          per_page: options?.per_page || 25,
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.meta?.message || "Get cities failed"
        );
      }
      throw error;
    }
  },

  getDistricts: async (
    options?: PaginationOptions
  ): Promise<PaginatedResponse> => {
    try {
      const response = await goshipAxios.get<PaginatedResponse>(
        "/districts",
        {
          params: {
            page: options?.page,
            per_page: options?.per_page,
          },
        }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.meta?.message || "Get districts failed"
        );
      }
      throw error;
    }
  },

  getWards: async (
    district_id: string | number | null = null,
    options?: PaginationOptions
  ): Promise<PaginatedResponse> => {
    try {
      const endpoint = district_id
        ? `/districts/${district_id}/wards`
        : "/wards";
      const response = await goshipAxios.get<PaginatedResponse>(endpoint, {
        params: {
          page: options?.page || 1,
          per_page: options?.per_page || 25,
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.meta?.message || "Get wards failed"
        );
      }
      throw error;
    }
  },

  createShipment: async (request: ShipmentRequest): Promise<ShipmentResponse> => {
    try {
      const response = await goshipAxios.post<ShipmentResponse>(
        "/shipments",
        request
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.meta?.message || "Create shipment failed"
        );
      }
      throw error;
    }
  },

  deleteShipment: async (shipmentId: string): Promise<DeleteShipmentResponse> => {
    try {
      const response = await goshipAxios.delete<DeleteShipmentResponse>(
        `/shipments/${shipmentId}`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.message || 
          error.response?.data?.meta?.message || 
          "Delete shipment failed"
        );
      }
      throw error;
    }
  },

  // Helper method to fetch all pages and combine results
  getAllDistricts: async (): Promise<any[]> => {
    try {
      let allDistricts: any[] = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await goshipService.getDistricts({
          page: currentPage,
          per_page: 25,
        });

        allDistricts = [...allDistricts, ...response.data];

        const pagination = response.meta?.pagination;
        if (pagination && pagination.current_page < pagination.total_pages) {
          currentPage++;
        } else {
          hasMore = false;
        }
      }

      return allDistricts;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.meta?.message || "Get all districts failed"
        );
      }
      throw error;
    }
  },

  // Helper method to fetch all wards and combine results
  getAllWards: async (
    district_id: string | number | null = null
  ): Promise<any[]> => {
    try {
      let allWards: any[] = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await goshipService.getWards(district_id, {
          page: currentPage,
          per_page: 25,
        });

        allWards = [...allWards, ...response.data];

        const pagination = response.meta?.pagination;
        if (pagination && pagination.current_page < pagination.total_pages) {
          currentPage++;
        } else {
          hasMore = false;
        }
      }

      return allWards;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          error.response?.data?.meta?.message || "Get all wards failed"
        );
      }
      throw error;
    }
  },

  getRates: async (request: RateRequest): Promise<RateResponse> => {
    const response = await goshipAxios.post<RateResponse>(
      "/rates",
      request
    );
    return response.data;

  }
};
