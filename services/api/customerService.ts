import { API_BASE_URL } from "@/constants/api";
import { AddressType, Gender, SecureStoreKeys } from "@/constants/enum";
import { userAxios } from "@/lib/apiClient";
import { cacheManager, withCache } from "@/services/cache";
import { PaginationParams } from "@/utils/pagination";
import * as SecureStore from "@/lib/secureStorage";
import { extractApiErrorMessage } from "./apiUtils";
import { SearchIncidentsRequest } from "./factoryService";

export interface CustomerProfile {
  id: string;
  account_id: string;
  full_name: string;
  phone_number: string;
  email: string;
  customer_code: string;
  gender: Gender;
  avatar_url: string | null;
  wallet_balance: number;
  referral_code: string;
  deleted: boolean;
  last_modified_by: string;
  last_modified_date: string;
}

export interface UpdateCustomerProfileRequest {
  full_name?: string;
  phone_number?: string;
  gender?: Gender;
  avatar_url?: string;
  birth_date?: string;
}

export interface CustomerProfileResponse {
  meta: {
    code: string;
  };
  data: CustomerProfile;
}

export interface ConfirmSurchargeRequest {
  wallet_payment_amount?: number;
  customer_package_ids?: string[];
  customer_promotion_id?: string;
}

export interface CreateCustomerAddressRequest {
  full_name: string;
  phone_number: string;
  type: AddressType;
  is_default: boolean;
  address_detail: string;
  province: string;
  province_id: number;
  district: string;
  district_id: number;
  ward: string;
  ward_id: number;
}

export interface UpdateCustomerAddressRequest {
  full_name?: string;
  phone_number?: string;
  type?: AddressType;
  is_default?: boolean;
  address_detail?: string;
  province?: string;
  district?: string;
  ward?: string;
  province_id?: number;
  district_id?: number;
  ward_id?: number;
}

export interface SearchPromotionsRequest {
  customer_id?: string;
  is_used?: boolean;
  is_expired?: boolean;
}

const getCustomerProfileImpl = async (): Promise<CustomerProfileResponse> => {
  try {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("Token not found");
    }
    const response = await userAxios.get<CustomerProfileResponse>(
      `${API_BASE_URL}/v1/customer/customers/profile`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(extractApiErrorMessage(error, "Get profile failed"));
  }
};

export const customerService = {
  getCustomerProfile: withCache(getCustomerProfileImpl, {
    key: "customer:profile",
    ttl: 10 * 60 * 1000,
  }),

  updateCustomerProfile: async (
    data: UpdateCustomerProfileRequest
  ): Promise<any> => {
    try {
      const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
      if (!token) {
        throw new Error("Token not found");
      }
      const response = await userAxios.patch(
        `${API_BASE_URL}/v1/customer/customers/profile`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/merge-patch+json",
          },
        }
      );
      cacheManager.invalidate("customer:profile");
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Update profile failed"));
    }
  },

  confirmSurcharge: async (
    orderId: string,
    data: ConfirmSurchargeRequest
  ): Promise<any> => {
    try {
      const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
      if (!token) {
        throw new Error("Token not found");
      }
      const response = await userAxios.put(
        `${API_BASE_URL}/v1/customer/orders/${orderId}/confirm-surcharge`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        extractApiErrorMessage(error, "Confirm surcharge failed")
      );
    }
  },

  rejectSurcharge: async (orderId: string): Promise<any> => {
    try {
      const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
      if (!token) {
        throw new Error("Token not found");
      }
      const response = await userAxios.put(
        `${API_BASE_URL}/v1/customer/orders/${orderId}/reject-surcharge`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Reject surcharge failed"));
    }
  },
};

const getCustomerAddressesImpl = async (
  id: string | null = null
): Promise<any> => {
  const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
  if (!token) {
    throw new Error("Token not found");
  }

  try {
    const response = await userAxios.get(
      `${API_BASE_URL}/v1/customer/shipping-addresses${id ? `/${id}` : ""}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(extractApiErrorMessage(error, "Get addresses failed"));
  }
};

export const customerAddressService = {
  getCustomerAddresses: withCache(getCustomerAddressesImpl, {
    key: "customer:addresses",
    ttl: 10 * 60 * 1000,
  }),

  createCustomerAddress: async (
    data: CreateCustomerAddressRequest
  ): Promise<any> => {
    try {
      const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
      if (!token) {
        throw new Error("Token not found");
      }
      const response = await userAxios.post(
        `${API_BASE_URL}/v1/customer/shipping-addresses`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      cacheManager.invalidate("customer:addresses");
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Create address failed"));
    }
  },

  updateCustomerAddress: async (
    id: string,
    data: UpdateCustomerAddressRequest
  ): Promise<any> => {
    try {
      const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
      if (!token) {
        throw new Error("Token not found");
      }
      const response = await userAxios.put(
        `${API_BASE_URL}/v1/customer/shipping-addresses/${id}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      cacheManager.invalidate("customer:addresses");
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Update address failed"));
    }
  },

  deleteCustomerAddress: async (id: string): Promise<any> => {
    try {
      const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
      if (!token) {
        throw new Error("Token not found");
      }
      const response = await userAxios.delete(
        `${API_BASE_URL}/v1/customer/shipping-addresses/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      cacheManager.invalidate("customer:addresses");
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Delete address failed"));
    }
  },

  searchIncidents: async (
    data: SearchIncidentsRequest,
    pagination: PaginationParams
  ): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    const response = await userAxios.post(
      `${API_BASE_URL}/v1/customer/incidents/search`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: pagination,
      }
    );
    return response.data;
  },

  confirmIncident: async (incidentId: string): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    const response = await userAxios.put(
      `${API_BASE_URL}/v1/customer/incidents/${incidentId}/confirm`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  rejectIncident: async (incidentId: string): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    const response = await userAxios.put(
      `${API_BASE_URL}/v1/customer/incidents/${incidentId}/reject`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  searchPromotionsSaved: async (data: SearchPromotionsRequest, pagination: PaginationParams): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    const response = await userAxios.post(
      `${API_BASE_URL}/v1/customer/promotions/search`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: pagination,
      }
    );
    return response.data;
  },
};
