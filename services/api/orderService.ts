import { API_BASE_URL } from "@/constants/api";
import { OrderStatus, PaymentStatus, SecureStoreKeys } from "@/constants/enum";
import { userAxios } from "@/lib/apiClient";
import { PaginationParams } from "@/utils/pagination";
import * as SecureStore from "@/lib/secureStorage";
import { extractApiErrorMessage } from "./apiUtils";

export type UUID = string;

export interface OrderCheckoutReq {
  cart_item_ids: string[];
  shipping_address_detail: string;
  shipping_district: string;
  shipping_district_id: number;
  shipping_full_name: string;
  shipping_phone_number: string;
  shipping_province: string;
  shipping_province_id: number;
  shipping_ward: string;
  shipping_ward_id: number;
  /**
   * JTS Point (recommended to send as WKT string if backend supports it),
   * example: "POINT(21.028511 105.804817)"
   */
  shipping_location?: string;
  note?: string;
  customer_promotion_id?: UUID;
  customer_package_id?: UUID;
  is_split_shipment: boolean;
  is_need_shipment: boolean;
  wallet_payment_amount?: string | number; // BigDecimal: send number or "50000"
}

export interface SearchOrderCustomerRequest {
  code?: string;
  customer_id: string;
  hub_id?: string;
  factory_id?: string;
  status?: OrderStatus | string;
  from_date?: string;
  to_date?: string;
  fetch_order_items?: boolean;
  fetch_order_logs?: boolean;
}

export interface SearchOrderStoreRequest {
  code?: string;
  hub_id?: string;
  customer_id?: string;
  factory_id?: string;
  status?: OrderStatus | string;
  from_date?: string;
  to_date?: string;
  fetch_order_items?: boolean;
  fetch_order_logs?: boolean;
  fetch_incidents?: boolean;
}

export interface ShippingLocationSnapshot {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Order {
  id: string;
  code: string;
  customer_id: string;
  hub_id: string;
  factory_id: string;
  shipping_full_name_snapshot: string;
  shipping_phone_number_snapshot: string;
  shipping_ward_snapshot: string;
  shipping_ward_id_snapshot: number;
  shipping_district_snapshot: string;
  shipping_district_id_snapshot: number;
  shipping_province_snapshot: string;
  shipping_province_id_snapshot: number;
  shipping_address_detail_snapshot: string;
  sub_total: number;
  discount_amount: number;
  shipping_fee: number;
  package_deduction: number;
  wallet_deduction: number;
  service_fee: number;
  product_additional_fee?: number;
  service_additional_fee?: number;
  additional_fee?: number;
  final_total: number;
  note?: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  is_split_shipment?: boolean;
  is_need_shipment?: boolean;
  deleted: boolean;
  created_by: string;
  last_modified_by: string;
  created_date: string;
  last_modified_date: string;
  order_items?: any[];
  order_logs?: any[];
  incidents?: any[];
}

export interface OrderAssignFactoryReq {
  factory_id: string;
  note?: string;
  shipping_location_snapshot?: ShippingLocationSnapshot;
  shipping_full_name_snapshot?: string;
  shipping_phone_number_snapshot?: string;
  shipping_ward_snapshot?: string;
  shipping_district_snapshot?: string;
  shipping_province_snapshot?: string;
  shipping_address_detail_snapshot?: string;
}

export interface AdjustOrderUpdatedItem {
  order_item_id: string;
  quantity: number;
}

export interface AdjustOrderNewItem {
  product_id: string;
  quantity: number;
}

export interface AdjustOrderReq {
  updated_items?: AdjustOrderUpdatedItem[];
  new_items?: AdjustOrderNewItem[];
  product_additional_fee?: number;
  service_additional_fee?: number;
}

export interface OrderSearchResponse {
  meta: {
    code: string;
    page: number;
    size: number;
    total: number;
  };
  data: Order[];
}

export interface UpdateOrderStatusReq {
  status: OrderStatus;
  note?: string;
}

export const orderService = {
  checkout: async (data: OrderCheckoutReq): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    try {
      const response = await userAxios.post(
        `${API_BASE_URL}/v1/customer/orders/checkout`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.log(error);
      throw new Error(extractApiErrorMessage(error, "Checkout failed"));
    }
  },

  getOrderCustomerById: async (orderId: string): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    try {
      const response = await userAxios.get(
        `${API_BASE_URL}/v1/customer/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Get order failed"));
    }
  },

  searchCustomerOrders: async (
    data: SearchOrderCustomerRequest,
    pagination?: PaginationParams
  ): Promise<OrderSearchResponse> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    try {
      const response = await userAxios.post<OrderSearchResponse>(
        `${API_BASE_URL}/v1/customer/orders/search`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          params: {
            page: pagination?.page ?? 0,
            size: pagination?.size ?? 20,
            sort: pagination?.sort,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Search orders failed"));
    }
  },

  /**
   * Search orders for store (uses store token)
   */
  searchStoreOrders: async (
    data: SearchOrderStoreRequest,
    pagination?: PaginationParams
  ): Promise<OrderSearchResponse> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("Store token not found");
    }
    try {
      const response = await userAxios.post<OrderSearchResponse>(
        `${API_BASE_URL}/v1/staff/orders/search`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          params: {
            page: pagination?.page ?? 0,
            size: pagination?.size ?? 20,
            sort: pagination?.sort,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.log(error);
      throw new Error(
        extractApiErrorMessage(error, "Search store orders failed")
      );
    }
  },

  /**
   * Backward-compatible alias used by report screen.
   */
  searchOrder: async (
    data: SearchOrderStoreRequest,
    pagination?: PaginationParams
  ): Promise<OrderSearchResponse> => {
    return orderService.searchStoreOrders(data, pagination);
  },

  assignOrderToFactory: async (
    orderId: string,
    data: OrderAssignFactoryReq
  ): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("Store token not found");
    }
    try {
      const response = await userAxios.patch(
        `${API_BASE_URL}/v1/staff/orders/${orderId}`,
        data,
        {
          headers: {
            "Content-Type": "application/merge-patch+json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        extractApiErrorMessage(error, "Assign order to factory failed")
      );
    }
  },

  adjustOrder: async (orderId: string, data: AdjustOrderReq): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("Store token not found");
    }
    try {
      const response = await userAxios.post(
        `${API_BASE_URL}/v1/staff/orders/${orderId}/adjust`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.log(error);
      throw new Error(extractApiErrorMessage(error, "Adjust order failed"));
    }
  },

  getStaffOrderById: async (orderId: string): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("Store token not found");
    }
    try {
      // Note: Authorization header is automatically added by userAxios interceptor
      // URL encode only if orderId contains special characters
      const encodedOrderId = orderId.includes('%') || orderId.includes('+') || orderId.includes(' ')
        ? encodeURIComponent(orderId)
        : orderId;

      const response = await userAxios.get(
        `${API_BASE_URL}/v1/staff/orders/${encodedOrderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error("Error getting staff order by ID:", error);
      throw new Error(extractApiErrorMessage(error, "Get staff order failed"));
    }
  },

  updateOrderStatus: async (
    orderId: string,
    data: UpdateOrderStatusReq
  ): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("Store token not found");
    }
    const response = await userAxios.put(
      `${API_BASE_URL}/v1/staff/orders/${orderId}/status`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};
