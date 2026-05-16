import { API_BASE_URL } from "@/constants/api";
import { userAxios } from "@/lib/apiClient";
import { withCache } from "@/services/cache";
import { extractApiErrorMessage } from "./apiUtils";

export interface SearchCategoriesRequest {
  id: string;
  ids: string[];
  name: string;
  status: string;
  fetch_products: boolean;
  deleted: boolean;
}

const getAllImpl = async (page: number, page_size: number): Promise<any> => {
  try {
    const response = await userAxios.post<any>(
      `${API_BASE_URL}/v1/public/categories/search`,
      {},
      {
        params: {
          page: page,
          size: page_size,
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(extractApiErrorMessage(error, "Get categories failed"));
  }
};

export const categoryService = {
  getAll: withCache(getAllImpl, (page: number, page_size: number) => ({
    key: "categories:all",
    ttl: 15 * 60 * 1000,
  })),
};
