import { API_BASE_URL } from "@/constants/api";
import { CustomerPackageStatus, PackageProductStatus, SecureStoreKeys } from "@/constants/enum";
import { userAxios } from "@/lib/apiClient";
import { PaginationParams } from "@/utils/pagination";
import * as SecureStore from "@/lib/secureStorage";

export interface CreatePackageRequest {
    name: string;
    price: number;
    quantity: number;
    service_product_id: string;
    store_id: string;
    unit: string;
    description: string;
    thumbnail_url: string;
    gallery_urls: string[];
    priority: number;
}

export interface UpdatePackageRequest {
    service_product_id?: string;
    quantity?: number;
    name?: string;
    description?: string;
    thumbnail_url?: string;
    gallery_urls?: string[];
    unit?: string;
    price?: number;
    priority?: number;
    status?: PackageProductStatus;
}

export interface SearchPackagesRequest {
    ids?: string[];
    store_id?: string;
    service_product_id?: string;
    name?: string;
    status?: CustomerPackageStatus;
    deleted?: boolean;
}

export interface CustomerRegisterPackageRequest {
    package_product_id: string;
}


export const packageService = {
    createPackage: async (data: CreatePackageRequest): Promise<any> => {
        const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        if (!token) {
            throw new Error("Token not found");
        }
        const response = await userAxios.post(`${API_BASE_URL}/v1/admin/package-products`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    },

    updatePackage: async (id: string, data: UpdatePackageRequest): Promise<any> => {
        const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        if (!token) {
            throw new Error("Token not found");
        }
        const response = await userAxios.patch(`${API_BASE_URL}/v1/admin/package-products/${id}`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/merge-patch+json",
            },
        });
        return response.data;
    },

    searchPackages: async (data: SearchPackagesRequest, pagination: PaginationParams): Promise<any> => {
        const response = await userAxios.post(`${API_BASE_URL}/v1/public/package-products/search`, data, {
            params: pagination,
        });
        return response.data;
    },

    getPackageById: async (id: string): Promise<any> => {
        const response = await userAxios.get(`${API_BASE_URL}/v1/public/package-products/${id}`);
        return response.data;
    },

    customerSearchPackages: async (data: SearchPackagesRequest, pagination: PaginationParams): Promise<any> => {
        const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        if (!token) {
            throw new Error("Token not found");
        }
        const response = await userAxios.post(`${API_BASE_URL}/v1/customer/customer-packages/search`, data, {
            params: pagination,
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    },

    getCustomerPackageById: async (id: string): Promise<any> => {
        const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        if (!token) {
            throw new Error("Token not found");
        }
        const response = await userAxios.get(`${API_BASE_URL}/v1/customer/customer-packages/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    },

    customerRegisterPackage: async (data: CustomerRegisterPackageRequest): Promise<any> => {
        const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
        if (!token) {
            throw new Error("Token not found");
        }
        const response = await userAxios.post(`${API_BASE_URL}/v1/customer/customer-packages`, data, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    },
};