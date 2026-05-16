import { API_BASE_URL } from "@/constants/api";
import {
  FactoryBatchMachineType,
  FactoryBatchStatus,
  IncidentStatus,
  IncidentType,
  SecureStoreKeys,
} from "@/constants/enum";
import { userAxios } from "@/lib/apiClient";
import { PaginationParams } from "@/utils/pagination";
import * as SecureStore from "@/lib/secureStorage";

export interface ReportIncidentRequest {
  customer_id: string;
  tracking_id: string;
  type: IncidentType;
  image_urls: string[];
  description: string;
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

export interface CreateFactoryBatchRequest {
  factory_id: string;
  machine_type: FactoryBatchMachineType;
  service_item_tracking_id: string;
}

export interface SearchFactoryBatchesRequest {
  batch_code?: string;
  factory_id?: string;
  service_item_tracking_id?: string;
  machine_type?: FactoryBatchMachineType;
  status?: FactoryBatchStatus;
  started_from?: string;
  started_to?: string;
  ended_from?: string;
  ended_to?: string;
}

export interface UpdateFactoryBatchRequest {
  status: FactoryBatchStatus;
}

export const factoryService = {
  reportIncident: async (data: ReportIncidentRequest): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("Staff token not found");
    }
    const response = await userAxios.post(
      `${API_BASE_URL}/v1/staff/incidents`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
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
      `${API_BASE_URL}/v1/staff/incidents/search`,
      data,
      {
        params: {
          page: pagination.page,
          size: pagination.size,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  createFactoryBatch: async (data: CreateFactoryBatchRequest): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    const response = await userAxios.post(
      `${API_BASE_URL}/v1/staff/factory-batches`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  searchFactoryBatches: async (
    data: SearchFactoryBatchesRequest,
    pagination: PaginationParams
  ): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    const response = await userAxios.post(
      `${API_BASE_URL}/v1/staff/factory-batches/search`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: pagination,
      }
    );

    return response.data;
  },

  udpateFactoryBatchStatus: async (
    batch_id: string,
    data: UpdateFactoryBatchRequest
  ): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    const response = await userAxios.put(
      `${API_BASE_URL}/v1/staff/factory-batches/${batch_id}/status`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  getFactoryBatchInfo: async (batch_id: string): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    const response = await userAxios.get(
      `${API_BASE_URL}/v1/staff/factory-batches/${batch_id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },
};
