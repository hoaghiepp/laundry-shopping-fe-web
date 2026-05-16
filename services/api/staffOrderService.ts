import { API_BASE_URL } from "@/constants/api";
import { ProductStatus } from "@/constants/enum";
import { customerOrderAxios } from "@/lib/apiClient";
import { extractApiErrorMessage } from "./apiUtils";
import { ChangePasswordRequest } from "./authService";
import { OrderCheckoutReq } from "./orderService";

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

  addToCart: async (productId: string, quantity: number): Promise<any> => {
    try {
      const res = await customerOrderAxios.post(`${API_BASE_URL}/v1/customer/cart/items`, {
        product_id: productId,
        quantity,
      });
      return res.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Add to cart failed"));
    }
  },

  updateCartItem: async (itemId: string, quantity: number): Promise<any> => {
    try {
      const res = await customerOrderAxios.put(
        `${API_BASE_URL}/v1/customer/cart/items/${itemId}`,
        { quantity }
      );
      return res.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Update cart item failed"));
    }
  },

  removeCartItem: async (itemId: string): Promise<any> => {
    try {
      const res = await customerOrderAxios.delete(
        `${API_BASE_URL}/v1/customer/cart/items/${itemId}`
      );
      return res.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Remove cart item failed"));
    }
  },

  checkout: async (req: OrderCheckoutReq): Promise<any> => {
    try {
      const res = await customerOrderAxios.post(
        `${API_BASE_URL}/v1/customer/orders/checkout`,
        req
      );
      return res.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Checkout failed"));
    }
  },

  getCustomerCart: async (): Promise<any> => {
    try {
      const res = await customerOrderAxios.get(`${API_BASE_URL}/v1/customer/cart`);
      return res.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Get cart failed"));
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
