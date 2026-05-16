import { API_BASE_URL } from "@/constants/api";
import { ProductStatus, ProductType, SecureStoreKeys } from "@/constants/enum";
import { userAxios } from "@/lib/apiClient";
import * as SecureStore from "@/lib/secureStorage";
import { extractApiErrorMessage } from "./apiUtils";

export interface AddProductRequest {
  name: string;
  price: number;
  reserved_quantity: number;
  sku: string;
  stock_quantity: number;
  store_id: string;
  type: string;
  unit: string;
  category_ids: string[];
  description: string;
  thumbnail_url: string;
  gallery_urls: string[];
  priority: number;
}

export interface AddProductBulkRequest {
  products: AddProductRequest[];
}

export interface UpdateProductRequest {
  name?: string;
  price?: number;
  reserved_quantity?: number;
  sku?: string;
  stock_quantity?: number;
  type?: string;
  unit?: string;
  category_ids?: string[];
  description?: string;
  thumbnail_url?: string;
  gallery_urls?: string[];
  priority?: number;
  status?: ProductStatus;
}

export interface SearchProductRequest {
  ids?: string[];
  store_id?: string;
  status?: ProductStatus;
  type?: ProductType;
}

export const productService = {
  async addProducts(data: AddProductBulkRequest): Promise<any> {
    try {
      const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
      if (!token) {
        throw new Error("Token not found");
      }
      const response = await userAxios.post(
        `${API_BASE_URL}/v1/admin/products/bulk`,
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
      throw new Error(extractApiErrorMessage(error, "Add products failed"));
    }
  },

  addProduct: async (data: AddProductRequest): Promise<any> => {
    try {
      const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
      if (!token) {
        throw new Error("Token not found");
      }
      const response = await userAxios.post(
        `${API_BASE_URL}/v1/admin/products`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Add product failed"));
    }
  },

  searchProducts: async (
    page?: number,
    size?: number,
    sort?: string,
    data?: SearchProductRequest
  ): Promise<any> => {
    try {
      const response = await userAxios.post(
        `${API_BASE_URL}/v1/public/products/search`,
        data,
        {
          headers: {
            "Content-Type": "application/json",
          },
          params: {
            page: page,
            size: size,
            sort: sort,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Get products failed"));
    }
  },

  getProductById: async (id: string): Promise<any> => {
    try {
      const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
      if (!token) {
        throw new Error("Token not found");
      }
      const response = await userAxios.get(
        `${API_BASE_URL}/v1/public/products/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, "Get product failed"));
    }
  },

  updateProduct: async (id: string, data: UpdateProductRequest): Promise<any> => {
    try {
      const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
      if (!token) {
        throw new Error("Token not found");
      }
      const response = await userAxios.patch(
        `${API_BASE_URL}/v1/admin/products/${id}`,
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
      throw new Error(extractApiErrorMessage(error, "Update product failed"));
    }
  },
};
