import { API_BASE_URL } from "@/constants/api";
import { ImportExportType, IncidentStatus, IncidentType, SecureStoreKeys, StoreType } from "@/constants/enum";
import { userAxios } from "@/lib/apiClient";
import { PaginationParams } from "@/utils/pagination";
import * as SecureStore from "@/lib/secureStorage";
import { extractApiErrorMessage } from "./apiUtils";

export interface SearchStoreRequest {
  name?: string;
  type?: string;
  status?: string;
  staff_id?: string;
  deleted?: boolean;
}

export interface StoreAddress {
  id: string;
  entity_id: string;
  entity_type: string;
  address_detail: string;
  ward: string;
  ward_id: number;
  district: string;
  district_id: number;
  province: string;
  province_id: number;
  deleted: boolean;
  created_by: string;
  last_modified_by: string;
  created_date: string;
  last_modified_date: string;
}

export interface StoreInfo {
  id: string;
  name: string;
  address?: string | StoreAddress;
  phone_contact?: string;
  phone_number?: string;
  type: string;
  is_active?: boolean;
  deleted?: boolean;
  created_date?: string;
  last_modified_date?: string;
}

export interface StoreListItem {
  id: string;
  name: string;
  phone_number: string;
  type: string;
  deleted: boolean;
  address?: StoreAddress;
}

export interface StoreSearchResponse {
  meta: {
    code: string;
    page: number;
    size: number;
    total: number;
  };
  data: StoreListItem[];
}

export interface StoreProfileResponse {
  meta: {
    code: string;
    message?: string;
  };
  data: StoreInfo;
}

export interface SearchStaffRequest {
  store_id: string;
  staff_code?: string;
  full_name?: string;
  deleted?: boolean;
}

export interface SearchStaffResponse {
  meta: {
    code: string;
    page: number;
    size: number;
    total: number;
  };
  data: any[];
}

export interface RegisterStaffRequest {
  position: string;
  staff_id: string;
  store_id: string;
}

export interface UpdateStoreRequest {
  name?: string;
  phone_number?: string;
  type?: StoreType;
  status?: boolean;
}

export interface CreateAddressRequest {
  address_detail: string;
  ward: string;
  ward_id: number;
  district: string;
  district_id: number;
  province: string;
  province_id: number;
}

export interface AdminAccount {
  email: string;
  full_name: string;
  password: string;
  phone_number: string;
}

export interface AddStoreRequest {
  admin: AdminAccount;
  name: string;
  type: StoreType;
  phone_number: string;
}

export interface ImportProductRequest {
  products: ImportProductItem[];
}

export interface ImportProductItem {
  product_id: string;
  quantity: number;
}

export interface StoreCustomer {
  id: string;
  account_id: string;
  full_name: string;
  phone_number: string;
  email: string;
  customer_code: string;
  wallet_balance: number;
  referral_code: string;
  deleted: boolean;
  created_date: string;
  last_modified_date: string;
}

export interface StoreCustomerListResponse {
  meta: { code: string; page: number; size: number; total: number };
  data: StoreCustomer[];
}

export interface SearchIncidentsRequest {
  order_id?: string;
  tracking_id?: string;
  customer_id?: string;
  type?: IncidentType;
  status?: IncidentStatus;
  created_from?: string;
  created_to?: string;
  resolved_from?: string;
  resolved_to?: string;
}

export interface StatisticsRequest {
  store_id: string;
  product_ids: string[];
  from_time: string;
  to_time: string;
  type?: ImportExportType;
}

export interface ProductStatsByType {
  total_quantity_by_type: { IMPORT: number; EXPORT: number };
  total_records_by_type: { IMPORT: number; EXPORT: number };
}

export interface StatisticsResponse {
  meta: { code: string };
  data: {
    by_product_id: Record<string, ProductStatsByType>;
  };
}

// Helper function to get store token
const getStoreToken = async (): Promise<string> => {
  const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
  if (!token) {
    throw new Error("Store token not found");
  }
  return token;
};

export const storeService = {
  searchStore: async (
    data?: SearchStoreRequest,
    pagination?: PaginationParams
  ): Promise<StoreSearchResponse> => {
    try {
      const response = await userAxios.post<StoreSearchResponse>(
        `${API_BASE_URL}/v1/public/stores/search`,
        data,
        {
          params: pagination,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Search store failed"));
    }
  },

  /**
   * Get store information/profile
   */
  getStoreProfile: async (id: string): Promise<StoreProfileResponse> => {
    try {
      const response = await userAxios.get<StoreProfileResponse>(
        `${API_BASE_URL}/v1/public/stores/${id}`
      );

      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Get store profile failed"));
    }
  },

  

  // getStoreProfile: withCache(
  //   async (id: string): Promise<StoreProfileResponse> => {
  //     try {
  //       const response = await axios.get<StoreProfileResponse>(
  //         `${API_BASE_URL}/v1/public/stores/${id}`
  //       );
  //       return response.data;
  //     } catch (error) {
  //       if (axios.isAxiosError(error)) {
  //         throw new Error(
  //           error.response?.data?.meta?.message || "Get store profile failed"
  //         );
  //       }
  //       throw error;
  //     }
  //   },
  //   (id: string) => ({ key: `storeProfile_${id}`, ttl: 300 })
  // ),

  searchStaff: async (
    data: SearchStaffRequest,
    pagination: PaginationParams
  ): Promise<SearchStaffResponse> => {
    try {
      const token = await getStoreToken();
      const response = await userAxios.post<SearchStaffResponse>(
        `${API_BASE_URL}/v1/staff/staffs/search`,
        data,
        {
          params: pagination,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Search staff failed"));
    }
  },

  registerStaff: async (data: RegisterStaffRequest): Promise<any> => {
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Admin token not found");
      }
      const response = await userAxios.post<any>(
        `${API_BASE_URL}/v1/admin/stores/staffs`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Register staff failed"));
    }
  },

  deleteStaff: async (storeId: string, staffId: string): Promise<any> => {
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Store token not found");
      }
      const response = await userAxios.delete<any>(
        `${API_BASE_URL}/v1/admin/stores/${storeId}/staffs/${staffId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Delete staff failed"));
    }
  },

  createStore: async (data: AddStoreRequest): Promise<any> => {
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Admin token not found");
      }
      const response = await userAxios.post<any>(
        `${API_BASE_URL}/v1/admin/stores`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Create store failed"));
    }
  },

  createAddress: async (storeId: string, data: CreateAddressRequest): Promise<any> => {
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Staff token not found");
      }
      const response = await userAxios.post<any>(
        `${API_BASE_URL}/v1/staff/stores/${storeId}/addresses`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Create address failed"));
    }
  },

  updateAddress: async (storeId: string, addressId: string, data: CreateAddressRequest): Promise<any> => {
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Staff token not found");
      }
      const response = await userAxios.patch<any>(
        `${API_BASE_URL}/v1/staff/stores/${storeId}/addresses`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/merge-patch+json",
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Update address failed"));
    }
  },

  updateStore: async (storeId: string, data: UpdateStoreRequest): Promise<any> => {
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Staff token not found");
      }
      const response = await userAxios.patch<any>(
        `${API_BASE_URL}/v1/admin/stores/${storeId}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/merge-patch+json",
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Update store failed"));
    }
  },

  deleteStore: async (id: string): Promise<any> => {
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Admin token not found");
      }
      const response = await userAxios.delete<any>(
        `${API_BASE_URL}/v1/admin/stores/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Delete store failed"));
    }
  },

  importProducts: async (storeId: string, data: ImportProductRequest): Promise<any> => {
    console.log('importProducts', storeId, data);
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Staff token not found");
      }
      const response = await userAxios.post<any>(
        `${API_BASE_URL}/v1/staff/stores/${storeId}/products/import`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    }
    catch (error) {
      throw new Error(extractApiErrorMessage(error, "Import product failed"));
    }
  },

  staticstics: async (data: StatisticsRequest): Promise<StatisticsResponse> => {
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Staff token not found");
      }
      const response = await userAxios.post<StatisticsResponse>(
        `${API_BASE_URL}/v1/staff/stores/import-export/statistic-by-product`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    }
    catch (error) {
      throw new Error(extractApiErrorMessage(error, "Get statistics failed"));
    }
  },

  getCustomerOfStore: async (storeId: string, pagination: PaginationParams): Promise<StoreCustomerListResponse> => {
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Staff token not found");
      }
      const response = await userAxios.get<any>(
        `${API_BASE_URL}/v1/admin/stores/${storeId}/customers`,
        {
          params: pagination,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    }
    catch (error) {
      throw new Error(extractApiErrorMessage(error, "Get customers of store failed"));
    }
  },

  searchIncidents: async (data: SearchIncidentsRequest, pagination: PaginationParams): Promise<any> => {
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Staff token not found");
      }
      const response = await userAxios.post<any>(
        `${API_BASE_URL}/v1/staff/incidents/search`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: pagination,
        }
      );
      return response.data;
    }
    catch (error) {
      throw new Error(extractApiErrorMessage(error, "Search incidents failed"));
    }
  },

  confirmIncident: async (incidentId: string): Promise<any> => {
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Staff token not found");
      }
      const response = await userAxios.put<any>(
        `${API_BASE_URL}/v1/staff/incidents/${incidentId}/confirm`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Confirm incident failed"));
    }
  },

  rejectIncident: async (incidentId: string): Promise<any> => {
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Staff token not found");
      }
      const response = await userAxios.put<any>(
        `${API_BASE_URL}/v1/staff/incidents/${incidentId}/reject`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Reject incident failed"));
    }
  },
};
