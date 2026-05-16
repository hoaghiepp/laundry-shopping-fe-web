import { API_BASE_URL } from "@/constants/api";
import { SecureStoreKeys } from "@/constants/enum";
import { isAdmin } from "@/utils/globalState";
import * as SecureStore from "@/lib/secureStorage";

export interface UploadRequest {
  uri: string; // e.g. asset.uri from ImagePicker
  name?: string; // optional override
  mimeType?: string; // optional override (e.g. "image/jpeg")
}

export const uploadService = {
  customerUpload: async (data: UploadRequest): Promise<any> => {
    const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
    if (!token) {
      throw new Error("User token not found");
    }
    try {
      const filename =
        data.name || data.uri.split("/").pop() || `upload_${Date.now()}.jpg`;

      const ext = (filename.split(".").pop() || "jpg").toLowerCase();
      const type =
        data.mimeType ||
        (ext === "png"
          ? "image/png"
          : ext === "webp"
          ? "image/webp"
          : "image/jpeg");

      // Create FormData - React Native uses a different implementation
      const formData = new FormData();

      // For React Native/Expo, append file in this specific format
      formData.append("file", {
        uri: data.uri,
        name: filename,
        type,
      } as any);

      const response = await fetch(
        `${API_BASE_URL}/v1/customer/documents/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            // DO NOT set Content-Type - let the browser/RN set it with boundary
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Upload failed:", {
          status: response.status,
          data: errorData,
        });
        throw new Error(
          errorData?.message ||
            errorData?.meta?.message ||
            `Upload failed with status ${response.status}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error("Upload error:", {
        message: error.message,
        stack: error.stack,
      });

      if (error.message.includes("Network request failed")) {
        throw new Error(
          "Network error. Please check:\n" +
            "1. Your internet connection\n" +
            "2. Backend server is running\n" +
            "3. CORS is configured on backend"
        );
      }

      throw new Error(error.message || "Upload failed");
    }
  },

  staffUpload: async (data: UploadRequest): Promise<any> => {
    try {
      const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
      if (!token) {
        throw new Error("User token not found");
      }
      const filename =
        data.name || data.uri.split("/").pop() || `upload_${Date.now()}.jpg`;

      const ext = (filename.split(".").pop() || "jpg").toLowerCase();
      const type =
        data.mimeType ||
        (ext === "png"
          ? "image/png"
          : ext === "webp"
          ? "image/webp"
          : "image/jpeg");

      // Create FormData - React Native uses a different implementation
      const formData = new FormData();

      // For React Native/Expo, append file in this specific format
      formData.append("file", {
        uri: data.uri,
        name: filename,
        type,
      } as any);

      let url = "";
      if (isAdmin()) {
        url = `${API_BASE_URL}/v1/admin/documents/upload`;
      }
      else {
        url = `${API_BASE_URL}/v1/staff/documents/upload`;
      }

      const response = await fetch(
        url,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            // DO NOT set Content-Type - let the browser/RN set it with boundary
          },
          body: formData,
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Upload failed:", {
          status: response.status,
          data: errorData,
        });
        throw new Error(
          errorData?.message ||
            errorData?.meta?.message ||
            `Upload failed with status ${response.status}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error("Upload error:", {
        message: error.message,
        stack: error.stack,
      });

      if (error.message.includes("Network request failed")) {
        throw new Error(
          "Network error. Please check:\n" +
            "1. Your internet connection\n" +
            "2. Backend server is running\n" +
            "3. CORS is configured on backend"
        );
      }

      throw new Error(error.message || "Upload failed");
    }
  },
};
