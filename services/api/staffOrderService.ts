import { API_BASE_URL } from "@/constants/api";
import { ProductStatus } from "@/constants/enum";
import { customerOrderAxios, userAxios } from "@/lib/apiClient";
import { extractApiErrorMessage } from "./apiUtils";
import { ChangePasswordRequest } from "./authService";

export interface StaffCheckoutSubItem {
  name: string;
  quantity: number;
  note?: string;
}

export interface StaffCheckoutItem {
  product_id: string;
  quantity: number;
  note?: string;
  sub_items?: StaffCheckoutSubItem[];
}

export interface StaffOrderCheckoutReq {
  phone_number: string;
  full_name: string;
  items: StaffCheckoutItem[];
  shipping_full_name?: string;
  shipping_phone_number?: string;
  shipping_address_detail?: string;
  shipping_ward?: string;
  shipping_ward_id?: string;
  shipping_district?: string;
  shipping_district_id?: string;
  shipping_province?: string;
  shipping_province_id?: string;
  is_need_shipment?: boolean;
  is_split_shipment?: boolean;
  same_day_service?: boolean;
  note?: string;
}

export const staffOrderService = {
  searchProducts: async (
    storeId: string,
    type?: "SERVICE" | "GOODS",
    page = 0,
    size = 20
  ): Promise<any> => {
    try {
      const body: Record<string, any> = { store_id: storeId, status: ProductStatus.ACTIVE };
      if (type) body.type = type;
      const res = await customerOrderAxios.post(
        `${API_BASE_URL}/v1/public/products/search`,
        body,
        { params: { page, size } }
      );
      return res.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Search products failed"));
    }
  },

  searchCustomers: async (keyword: string, page = 0, size = 10): Promise<any> => {
    try {
      const res = await userAxios.post(
        "/v1/staff/customers/search",
        { keyword },
        { params: { page, size, sort: "createdDate,desc" } }
      );
      return res.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Search customers failed"));
    }
  },

  staffCheckout: async (req: StaffOrderCheckoutReq): Promise<any> => {
    try {
      const res = await userAxios.post("/v1/staff/orders/checkout", req);
      return res.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Checkout failed"));
    }
  },

  confirmForCustomer: async (orderId: string): Promise<any> => {
    try {
      const res = await userAxios.put(`/v1/staff/orders/${orderId}/confirm-for-customer`);
      return res.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Confirm for customer failed"));
    }
  },

  confirmCustomerOrderNoPayment: async (orderId: string): Promise<any> => {
    try {
      const res = await customerOrderAxios.put(`${API_BASE_URL}/v1/customer/orders/${orderId}/confirm-surcharge-no-payment`);
      return res.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Confirm order no payment failed"));
    }
  },

  changePassword: async (data: ChangePasswordRequest): Promise<any> => {
    try {
      const res = await customerOrderAxios.post(`${API_BASE_URL}/v1/public/change-password`, data);
      return res.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Change password failed"));
    }
  },
};
