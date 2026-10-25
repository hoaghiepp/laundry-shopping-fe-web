import { API_BASE_URL } from "@/constants/api";
import { LogisticTripItemType, SecureStoreKeys } from "@/constants/enum";
import { userAxios } from "@/lib/apiClient";
import * as SecureStore from "@/lib/secureStorage";
import { PaginationParams } from "@/utils/pagination";

export interface TrackingItem {
  barcode: string;
  order_id: string;
  order_code?: string;
  order_item_id?: string;
  current_store_id?: string;
}

export interface SearchTrackingItemsRequest {
  barcode?: string;
  order_id?: string;
  order_code?: string;
  trip_id?: string;
  status?: string;
  current_store_id?: string;
  current_container_id?: string;
  current_batch_id?: string;
  factory_id?: string;
  item_condition?: string;
  trip_code?: string;
  store_type?: string;
  current_store_ids?: string[];
  stalled_before?: string;
}

export interface ScanTrackingItemRequest {
  barcode: string;
  status: string;
  note?: string;
}

export interface LogisticsTripItem {
  service_item_tracking_id: string;
  container_code?: string;
  type?: LogisticTripItemType;
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

export interface TripReceiveScan {
  barcode: string;
  condition?: "NORMAL" | "DAMAGED";
  note?: string;
}

export interface TripCompleteRequest {
  missing_barcodes?: string[];
  note?: string;
}

export interface TripPatchRequest {
  driver_staff_id?: string;
  source_store_id?: string;
  destination_store_id?: string;
}

const STAFF = `${API_BASE_URL}/v1/staff`;

async function authHeaders() {
  const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
  if (!token) {
    throw new Error("Token not found");
  }
  return { Authorization: `Bearer ${token}` };
}

export const logisticService = {
  createTrackingItemBatch: async (data: TrackingItem[]): Promise<any> => {
    const response = await userAxios.post(`${STAFF}/item-tracking/batch`, data, {
      headers: await authHeaders(),
    });
    return response.data;
  },

  searchTrackingItems: async (
    data: SearchTrackingItemsRequest,
    pagination: PaginationParams
  ): Promise<any> => {
    const response = await userAxios.post(`${STAFF}/item-tracking/search`, data, {
      params: pagination,
      headers: await authHeaders(),
    });
    return response.data;
  },

  scanTrackingItem: async (data: ScanTrackingItemRequest): Promise<any> => {
    const response = await userAxios.post(`${STAFF}/item-tracking/scan`, data, {
      headers: await authHeaders(),
    });
    return response.data;
  },

  getTrackingItem: async (trackingItemId: string): Promise<any> => {
    const response = await userAxios.get(`${STAFF}/item-tracking/${trackingItemId}`, {
      headers: await authHeaders(),
    });
    return response.data;
  },

  getPassportByBarcode: async (barcode: string): Promise<any> => {
    const response = await userAxios.get(`${STAFF}/item-tracking/passport`, {
      params: { barcode },
      headers: await authHeaders(),
    });
    return response.data;
  },

  getPassport: async (trackingId: string): Promise<any> => {
    const response = await userAxios.get(`${STAFF}/item-tracking/${trackingId}/passport`, {
      headers: await authHeaders(),
    });
    return response.data;
  },

  getTimeline: async (trackingId: string, pagination: PaginationParams): Promise<any> => {
    const response = await userAxios.get(`${STAFF}/item-tracking/${trackingId}/timeline`, {
      params: pagination,
      headers: await authHeaders(),
    });
    return response.data;
  },

  createTrips: async (data: CreateTripsRequest): Promise<any> => {
    const response = await userAxios.post(`${STAFF}/logistic-trips`, data, {
      headers: await authHeaders(),
    });
    return response.data;
  },

  searchTrips: async (data: SearchTripsRequest, pagination: PaginationParams): Promise<any> => {
    const response = await userAxios.post(`${STAFF}/logistic-trips/search`, data, {
      params: pagination,
      headers: await authHeaders(),
    });
    return response.data;
  },

  getTripDetails: async (tripId: string): Promise<any> => {
    const response = await userAxios.get(`${STAFF}/logistic-trips/${tripId}`, {
      headers: await authHeaders(),
    });
    return response.data;
  },

  patchTrip: async (tripId: string, data: TripPatchRequest): Promise<any> => {
    const response = await userAxios.patch(`${STAFF}/logistic-trips/${tripId}`, data, {
      headers: await authHeaders(),
    });
    return response.data;
  },

  addTripItem: async (tripId: string, item: LogisticsTripItem): Promise<any> => {
    const response = await userAxios.post(`${STAFF}/logistic-trips/${tripId}/items`, item, {
      headers: await authHeaders(),
    });
    return response.data;
  },

  removeTripItem: async (tripId: string, itemId: string): Promise<any> => {
    const response = await userAxios.delete(
      `${STAFF}/logistic-trips/${tripId}/items/${itemId}`,
      { headers: await authHeaders() }
    );
    return response.data;
  },

  departTrip: async (tripId: string): Promise<any> => {
    const response = await userAxios.post(
      `${STAFF}/logistic-trips/${tripId}/depart`,
      undefined,
      { headers: await authHeaders() }
    );
    return response.data;
  },

  arriveTrip: async (tripId: string): Promise<any> => {
    const response = await userAxios.post(
      `${STAFF}/logistic-trips/${tripId}/arrive`,
      undefined,
      { headers: await authHeaders() }
    );
    return response.data;
  },

  cancelTrip: async (tripId: string, reason?: string): Promise<any> => {
    const response = await userAxios.post(
      `${STAFF}/logistic-trips/${tripId}/cancel`,
      reason ? { reason } : {},
      { headers: await authHeaders() }
    );
    return response.data;
  },

  receiveTrip: async (tripId: string, scans: TripReceiveScan[]): Promise<any> => {
    const response = await userAxios.post(
      `${STAFF}/logistic-trips/${tripId}/receive`,
      { scans },
      { headers: await authHeaders() }
    );
    return response.data;
  },

  completeTrip: async (tripId: string, data?: TripCompleteRequest): Promise<any> => {
    const response = await userAxios.post(
      `${STAFF}/logistic-trips/${tripId}/complete`,
      data ?? {},
      { headers: await authHeaders() }
    );
    return response.data;
  },

  getManifest: async (tripId: string): Promise<any> => {
    const response = await userAxios.get(`${STAFF}/logistic-trips/${tripId}/manifest`, {
      headers: await authHeaders(),
    });
    return response.data;
  },

  getTripEvents: async (tripId: string, pagination: PaginationParams): Promise<any> => {
    const response = await userAxios.get(`${STAFF}/logistic-trips/${tripId}/events`, {
      params: pagination,
      headers: await authHeaders(),
    });
    return response.data;
  },
};
