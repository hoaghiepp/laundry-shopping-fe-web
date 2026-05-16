import { API_BASE_URL } from "@/constants/api";
import { SecureStoreKeys } from "@/constants/enum";
import { userAxios } from "@/lib/apiClient";
import * as SecureStore from "@/lib/secureStorage";
import { extractApiErrorMessage } from "./apiUtils";

export interface RegisterStaffRequest {
  email: string;
  full_name: string;
  password: string;
  phone_number: string;
}

export interface ChangeOrderItemStatusItem {
  order_item_id: string;
  status: string;
  note?: string;
}

export interface TrackingBatchItem {
  barcode: string;
  current_store_id: string;
  order_id: string;
}

export type ChangeOrderItemStatusRequest = ChangeOrderItemStatusItem[];

export type TrackingBatchRequest = TrackingBatchItem[];

const getStoreToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
  } catch (error) {
    return null;
  }
};

export const staffService = {
  registerStaff: async (data: RegisterStaffRequest): Promise<any> => {

    const token = await getStoreToken();
    if (!token) {
      throw new Error("Admin token not found");
    }
    const response = await userAxios.post<any>(`${API_BASE_URL}/v1/admin/staffs/register`,
      data, { headers: { Authorization: `Bearer ${token}` } });
    return response.data;

  },

  getAllStores: async (): Promise<any> => {
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Store token not found");
      }
      const response = await userAxios.get(`${API_BASE_URL}/v1/staff/stores`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(
        extractApiErrorMessage(error, "Failed to get all stores")
      );
    }
  },

  getStaffProfile: async (): Promise<any> => {
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Store token not found");
      }
      const response = await userAxios.get(
        `${API_BASE_URL}/v1/staff/staffs/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        extractApiErrorMessage(error, "Failed to get staff profile")
      );
    }
  },

  getAdminProfile: async (): Promise<any> => {
    const token = await getStoreToken();
    if (!token) {
      throw new Error("Store token not found");
    }
    const response = await userAxios.get(`${API_BASE_URL}/v1/admin/admins/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  changeOrderItemStatus: async (
    orderId: string,
    data: ChangeOrderItemStatusRequest
  ): Promise<any> => {
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Store token not found");
      }
      const response = await userAxios.put(
        `${API_BASE_URL}/v1/staff/orders/${orderId}/order-items/status/batch`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        extractApiErrorMessage(error, "Failed to change order item status")
      );
    }
  },

  createBatch: async (data: TrackingBatchRequest): Promise<any> => {
    try {
      const token = await getStoreToken();
      if (!token) {
        throw new Error("Store token not found");
      }

      const response = await userAxios.post(
        `${API_BASE_URL}/v1/staff/item-tracking/batch`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Failed to create batch"));
    }
  },
};
