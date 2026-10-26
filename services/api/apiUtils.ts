import { SecureStoreKeys } from "@/constants/enum";
import axios from "axios";
import * as SecureStore from "@/lib/secureStorage";

const TRANSPORT_ERROR_MESSAGES: Record<string, string> = {
  "400045": "Món không ở cửa hàng này. Hãy tải lại danh sách.",
  "400046": "Món đã nằm trên một chuyến.",
  "400047": "Không thể chuyển trạng thái món đồ như vậy",
  "400048": "Trạng thái hoặc mẻ giặt không cho đi hướng này.",
  "400049": "Thao tác không hợp lệ với trạng thái chuyến hiện tại",
  "400050": "Điểm đến sai loại cửa hàng.",
  "400051": "Còn mã chưa nhận. Xác nhận thất lạc trước khi hoàn tất.",
  "400052": "Chưa chọn món nào.",
  "400053": "Đơn đã huỷ hoặc bị từ chối. Bỏ thẻ này.",
};

export function extractApiErrorCode(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.meta?.code ?? "");
  }
  return "";
}

export function extractApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const meta = error.response?.data?.meta;
    const code = String(meta?.code ?? "");
    if (!meta?.message && code === "400039") {
      return "Số điện thoại đã được đăng ký";
    }
    if (!meta?.message && (code === "400040" || code === "400041")) {
      return code === "400040"
        ? "Chỉ dịch vụ mới có món chi tiết"
        : "Số lượng dịch vụ phải bằng tổng số lượng từng món";
    }
    if (!meta?.message && TRANSPORT_ERROR_MESSAGES[code]) {
      return TRANSPORT_ERROR_MESSAGES[code];
    }
    return meta?.message || fallback;
  }
  return fallback;
}

export const getStoreToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(SecureStoreKeys.LOGIN_TOKEN);
  } catch (error) {
    return null;
  }
};