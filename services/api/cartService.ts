import { userAxios } from "@/lib/apiClient";
import { extractApiErrorMessage } from "./apiUtils";

export interface AddItemToCartRequest {
  product_id: string;
  quantity: number;
}

export const cartService = {
  getCustomerCart: async (): Promise<any> => {
    try {
      const res = await userAxios.get("/v1/customer/cart");
      return res.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Get cart failed"));
    }
  },

  addItemToCart: async (data: AddItemToCartRequest): Promise<any> => {
    try {
      const res = await userAxios.post("/v1/customer/cart/items", data);
      return res.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Add item to cart failed"));
    }
  },

  updateCartItem: async (itemId: string, quantity: number): Promise<any> => {
    try {
      const res = await userAxios.put(`/v1/customer/cart/items/${itemId}`, {
        quantity,
      });
      return res.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Update cart item failed"));
    }
  },

  removeItemFromCart: async (itemId: string): Promise<any> => {
    try {
      const res = await userAxios.delete(`/v1/customer/cart/items/${itemId}`);
      return res.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Remove item from cart failed"));
    }
  },
};
