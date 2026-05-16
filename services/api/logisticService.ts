import { API_BASE_URL } from "@/constants/api";
import { LogisticTripItemType, LogisticTripStatus, SecureStoreKeys } from "@/constants/enum";
import { userAxios } from "@/lib/apiClient";
import { PaginationParams } from "@/utils/pagination";
import * as SecureStore from "@/lib/secureStorage";

export interface TrackingItem {
  barcode: string;
  order_id: string;
  current_store_id: string;
}

export interface SearchTrackingItemsRequest {
  barcode?: string;
  order_id?: string;
  status?: string;
  current_store_id?: string;
  current_container_id?: string;
  current_batch_id?: string;
  factory_id?: string;
}

export interface CreateBatchRequest extends Array<TrackingItem> {}

export interface LogisticsTripItem {
  type: LogisticTripItemType;
  service_item_tracking_id: string;
}

export interface CreateTripsRequest {
  source_store_id: string;
  destination_store_id: string;
  driver_staff_id?: string;
  logistic_trip_items: LogisticsTripItem[];
}

export interface SearchTripsRequest {
  trip_code?: string;
  driver_staff_id?: string;
  source_store_id?: string;
  destination_store_id?: string;
  status?: string;
  departed_from?: string;
  departed_to?: string;
  arrived_from?: string;
  arrived_to?: string;
}

export const logisticService = {
  createTrackingItemBatch: async (data: TrackingItem[]): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("Token not found");
    }
    const response = await userAxios.post(
      `${API_BASE_URL}/v1/staff/item-tracking/batch`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  searchTrackingItems: async (
    data: SearchTrackingItemsRequest,
    pagination: PaginationParams
  ): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("Token not found");
    }
    const response = await userAxios.post(
      `${API_BASE_URL}/v1/staff/item-tracking/search`,
      data,
      {
        params: pagination,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  getTrackingItem: async (tracking_item_id: string): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("Token not found");
    }
    const response = await userAxios.get(
      `${API_BASE_URL}/v1/staff/item-tracking/${tracking_item_id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  createTrips: async (data: CreateTripsRequest): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("Token not found");
    }
    const response = await userAxios.post(
      `${API_BASE_URL}/v1/staff/logistic-trips`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  searchTrips: async (
    data: SearchTripsRequest,
    pagination: PaginationParams
  ): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("Token not found");
    }
    const response = await userAxios.post(
      `${API_BASE_URL}/v1/staff/logistic-trips/search`,
      data,
      {
        params: pagination,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  getTripDetails: async (trip_id: string): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("Token not found");
    }
    const response = await userAxios.get(
      `${API_BASE_URL}/v1/staff/logistic-trips/${trip_id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  updateStatusTrips: async (
    trip_id: string,
    status: LogisticTripStatus
  ): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("Token not found");
    }
    const response = await userAxios.put(
      `${API_BASE_URL}/v1/staff/logistic-trips/${trip_id}/status`,
      {
        status: status,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },
};
