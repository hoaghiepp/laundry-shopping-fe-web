import { API_BASE_URL } from "@/constants/api";
import { SecureStoreKeys } from "@/constants/enum";
import { isAdmin } from "@/utils/globalState";
import * as SecureStore from "@/lib/secureStorage";
import { Platform } from "react-native";

export interface UploadRequest {
  uri: string; // e.g. asset.uri from ImagePicker
  name?: string; // optional override
  mimeType?: string; // optional override (e.g. "image/jpeg")
}

function resolveFilename(data: UploadRequest): string {
  const fromName = data.name?.trim();
  if (fromName) return fromName;
  const fromUri = data.uri.split("/").pop()?.split("?")[0];
  if (fromUri && fromUri.includes(".")) return fromUri;
  return `upload_${Date.now()}.jpg`;
}

function resolveMimeType(filename: string, mimeType?: string): string {
  if (mimeType) return mimeType;
  const ext = (filename.split(".").pop() || "jpg").toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Cannot read file from URI (${response.status})`);
  }
  return response.blob();
}

/** Build multipart body with part name `file` (required by backend). */
async function buildUploadFormData(data: UploadRequest): Promise<FormData> {
  const formData = new FormData();
  const filename = resolveFilename(data);
  const type = resolveMimeType(filename, data.mimeType);

  if (Platform.OS === "web") {
    const blob = await uriToBlob(data.uri);
    const file =
      typeof File !== "undefined"
        ? new File([blob], filename, { type: blob.type || type })
        : blob;
    formData.append("file", file, filename);
  } else {
    formData.append(
      "file",
      {
        uri: data.uri,
        name: filename,
        type,
      } as unknown as Blob
    );
  }

  return formData;
}

async function postUpload(url: string, formData: FormData): Promise<any> {
  const token = await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
  if (!token) {
    throw new Error("User token not found");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      // Do not set Content-Type — browser/RN sets multipart boundary
    },
    body: formData,
  });

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

  return response.json();
}

function handleUploadError(error: unknown): never {
  const message = error instanceof Error ? error.message : "Upload failed";
  console.error("Upload error:", error);

  if (message.includes("Network request failed")) {
    throw new Error(
      "Network error. Please check:\n" +
        "1. Your internet connection\n" +
        "2. Backend server is running\n" +
        "3. CORS is configured on backend"
    );
  }

  throw new Error(message);
}

export const uploadService = {
  customerUpload: async (data: UploadRequest): Promise<any> => {
    try {
      const formData = await buildUploadFormData(data);
      return await postUpload(
        `${API_BASE_URL}/v1/customer/documents/upload`,
        formData
      );
    } catch (error) {
      return handleUploadError(error);
    }
  },

  staffUpload: async (data: UploadRequest): Promise<any> => {
    try {
      const formData = await buildUploadFormData(data);
      const url = isAdmin()
        ? `${API_BASE_URL}/v1/admin/documents/upload`
        : `${API_BASE_URL}/v1/staff/documents/upload`;
      return await postUpload(url, formData);
    } catch (error) {
      return handleUploadError(error);
    }
  },
};
