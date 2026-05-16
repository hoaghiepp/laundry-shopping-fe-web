import { API_BASE_URL } from "@/constants/api";
import { DiscountType, PromotionStatus, SecureStoreKeys } from "@/constants/enum";
import { userAxios } from "@/lib/apiClient";
import { PaginationParams } from "@/utils/pagination";
import * as SecureStore from "@/lib/secureStorage";

export interface CreatePromotionRequest {
    code: string;
    discount_type: DiscountType;
    discount_value: number;
    name: string;
    description: string;
    start_date: string;
    end_date: string;
    min_order_value: number;
    max_discount_value: number;
}

export interface UpdatePromotionRequest {
    name?: string;
    description?: string;
    discount_value?: number;
    discount_type?: DiscountType;
    min_order_value?: number;
    max_discount_value?: number;
    start_date?: string;
    end_date?: string;
    status?: PromotionStatus;
}

export interface SearchPromotionsRequest {
    ids?: string[];
    customer_id?: string;
    code?: string;
    name?: string;
    status?: PromotionStatus;
    start_date_from?: string;
    start_date_to?: string;
    end_date_from?: string;
    end_date_to?: string;
}

export const promotionService = {
    createPromotions: async (data: CreatePromotionRequest): Promise<any> => {
        const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        if (!token) {
            throw new Error("Token not found");
        }
        const response = await userAxios.post(`${API_BASE_URL}/v1/admin/promotions`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    },

    deletePromotion: async (id: string): Promise<any> => {
        const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        if (!token) {
            throw new Error("Token not found");
        }
        const response = await userAxios.delete(`${API_BASE_URL}/v1/admin/promotions/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    },

    updatePromotion: async (id: string, data: UpdatePromotionRequest): Promise<any> => {
        const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        if (!token) {
            throw new Error("Token not found");
        }
        const response = await userAxios.patch(`${API_BASE_URL}/v1/admin/promotions/${id}`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/merge-patch+json",
            },
        });
        return response.data;
    },

    customerSearchPromotions: async (data: SearchPromotionsRequest, pagination: PaginationParams): Promise<any> => {
        const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        if (!token) {
            throw new Error("Token not found");
        }
        const response = await userAxios.post(`${API_BASE_URL}/v1/customer/promotions/search`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            params: pagination,
        });
        return response.data;
    },

    customerSavePromotions: async (promotion_id: string): Promise<any> => {
        const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        if (!token) {
            throw new Error("Token not found");
        }
        const response = await userAxios.post(`${API_BASE_URL}/v1/customer/promotions/${promotion_id}/save`,
            {}, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    },

    searchPromotions: async (data: SearchPromotionsRequest, pagination: PaginationParams): Promise<any> => {
        const response = await userAxios.post(`${API_BASE_URL}/v1/public/promotions/search`, data, {
            params: pagination,
        });
        return response.data;
    },
};