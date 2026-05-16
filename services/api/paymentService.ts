import { API_BASE_URL } from "@/constants/api";
import { PaymentType, SecureStoreKeys } from "@/constants/enum";
import { userAxios } from "@/lib/apiClient";
import { PaginationParams } from "@/utils/pagination";
import * as SecureStore from "@/lib/secureStorage";

export interface GenerateQrCodeRequest {
  amount: number;
}

export interface SearchTransactionsRequest {
  ids?: string[];
  customer_id?: string;
  transaction_type?: PaymentType;
  from_date?: string;
  to_date?: string;
  ref_id?: string;
  ref_ids?: string[];
  ref_type?: string;
}

export const paymentService = {
  generateQrCode: async (request: GenerateQrCodeRequest): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    const response = await userAxios.post(`${API_BASE_URL}/v1/customer/viet-qr/qr-code/generate`,
      request,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  waitTransaction: async (transactionContent: string): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    // Encode transactionContent to properly handle spaces and special characters
    const encodedContent = encodeURIComponent(transactionContent);
    const response = await userAxios.post(`${API_BASE_URL}/v1/viet-qr/payment/wait/${encodedContent}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  getStatusTransaction: async (transactionContent: string): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    // Encode transactionContent to properly handle spaces and special characters
    const encodedContent = encodeURIComponent(transactionContent);
    // console.log('encodedContent', `==${API_BASE_URL}/v1/viet-qr/payment/status/${transactionContent}==`);
    const response = await userAxios.get(`${API_BASE_URL}/v1/viet-qr/payment/status/${encodedContent}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  customerSearchTransactions: async (data: SearchTransactionsRequest, pagination: PaginationParams): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    const response = await userAxios.post(`${API_BASE_URL}/v1/customer/wallet/transactions/search`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: pagination,
      }
    );
    return response.data;
  },

  customerGetTransactionDetials: async (transaction_id: string): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    const response = await userAxios.get(`${API_BASE_URL}/v1/customer/wallet/transactions/${transaction_id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  searchTransactions: async (data: SearchTransactionsRequest, pagination: PaginationParams): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    const response = await userAxios.post(`${API_BASE_URL}/v1/admin/wallet/transactions/search`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: pagination,
      }
    );
    return response.data;
  },

  getTransactionDetails: async (transaction_id: string): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    const response = await userAxios.get(`${API_BASE_URL}/v1/admin/wallet/transactions/${transaction_id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }, 
};