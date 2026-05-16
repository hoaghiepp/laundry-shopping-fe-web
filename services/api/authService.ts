import { API_BASE_URL } from "@/constants/api";
import { SecureStoreKeys } from "@/constants/enum";
import axios from "axios";
import { plainAxios, userAxios } from "@/lib/apiClient";
import { clearTokens } from "@/lib/tokenStore";
import * as SecureStore from "@/lib/secureStorage";

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
  gender?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

/** Normalize login API body whether shape is `{ meta, data: { access_token } }` or `{ access_token }` or JSON string. */
export function extractLoginTokens(result: unknown): {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
} {
  if (result == null || result === "") {
    throw new Error("Đăng nhập: phản hồi trống.");
  }
  let body: any = result;
  if (typeof body === "string") {
    body = JSON.parse(body);
  }
  if (body?.data?.access_token != null) {
    return body.data;
  }
  if (body?.access_token != null) {
    return body;
  }
  throw new Error("Đăng nhập: phản hồi không chứa access_token.");
}

/** User-facing message after `authService.login` fails (e.g. 401 = wrong credentials, no refresh involved). */
export function getLoginFailureMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    return "Đăng nhập thất bại. Email hoặc mật khẩu không đúng.";
  }
  if (axios.isAxiosError(error)) {
    const d = error.response?.data as Record<string, unknown> | undefined;
    const m =
      (typeof d?.message === "string" && d.message) ||
      (typeof d?.error_description === "string" && d.error_description) ||
      (typeof d?.error === "string" && d.error);
    if (m?.trim()) return m.trim();
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Đăng nhập thất bại. Vui lòng thử lại.";
}

export const authService = {
  register: async (data: RegisterRequest) => {
    const res = await plainAxios.post(`${API_BASE_URL}/v1/public/customers/register`, data);
    return res.data;
  },

  refreshWithRefreshToken: async (refresh_token: string) => {
    const res = await plainAxios.post(`${API_BASE_URL}/v1/public/refresh`, {
      refresh_token,
    });
    return res.data;
  },

  login: async (data: LoginRequest) => {
    const res = await plainAxios.post(`${API_BASE_URL}/v1/public/login`, data);
    // console.log("login res", data);
    // console.log("login url", `${API_BASE_URL}/v1/public/login`);
    // Nếu backend trả token ở res.data.data:
    // const access = res.data?.data?.access_token;
    // const refresh = res.data?.data?.refresh_token;
    // if (access) await storeTokens(access, refresh);
    return res.data;
  },

  logout: async () => {
    await clearTokens();
  },

  changePassword: async (data: ChangePasswordRequest) => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("Token not found");
    }
    const res = await userAxios.post(`${API_BASE_URL}/v1/public/change-password`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
};
