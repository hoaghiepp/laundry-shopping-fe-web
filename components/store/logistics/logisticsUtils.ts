export interface StatusDisplay {
  text: string;
  color: string;
  bg: string;
}

export const getStatusDisplay = (status: string): StatusDisplay => {
  switch (status) {
    case 'CREATED':
      return { text: 'Đã tạo', color: '#3B82F6', bg: '#DBEAFE' };
    case 'IN_TRANSIT':
      return { text: 'Đang vận chuyển', color: '#D97706', bg: '#FEF3C7' };
    case 'ARRIVED':
      return { text: 'Đã đến', color: '#059669', bg: '#D1FAE5' };
    case 'COMPLETED':
      return { text: 'Hoàn thành', color: '#059669', bg: '#D1FAE5' };
    case 'CANCELLED':
      return { text: 'Đã huỷ', color: '#DC2626', bg: '#FEE2E2' };
    default:
      return { text: status, color: '#6B7280', bg: '#F3F4F6' };
  }
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getItemTypeDisplay = (type: string): string => {
  switch (type) {
    case 'BAG_OUTBOUND':
      return 'Bao tải đi';
    case 'BAG_INBOUND':
      return 'Bao đi xưởng';
    case 'BIN_OUTBOUND':
      return 'Thùng về cửa hàng';
    default:
      return type;
  }
};

export const getItemStatusDisplay = (status: string): StatusDisplay => {
  switch (status) {
    case 'SEALED':
      return { text: 'Chờ nhận', color: '#3B82F6', bg: '#DBEAFE' };
    case 'RECEIVED':
      return { text: 'Đã nhận', color: '#059669', bg: '#D1FAE5' };
    case 'UNPACKED':
      return { text: 'Đã mở', color: '#059669', bg: '#D1FAE5' };
    case 'OPENED':
      return { text: 'Đã mở', color: '#059669', bg: '#D1FAE5' };
    case 'MISSING':
      return { text: 'Thất lạc', color: '#DC2626', bg: '#FEE2E2' };
    case 'REMOVED':
      return { text: 'Đã bỏ', color: '#6B7280', bg: '#F3F4F6' };
    default:
      return { text: status, color: '#6B7280', bg: '#F3F4F6' };
  }
};

export const tripTypeLabel = (tripType?: string | null): string => {
  switch (tripType) {
    case 'OUTBOUND':
      return 'Đi xưởng';
    case 'RETURN':
      return 'Trả cửa hàng';
    default:
      return tripType || '';
  }
};

export const conditionLabel = (condition?: string | null): string => {
  switch (condition) {
    case 'NORMAL':
      return 'Bình thường';
    case 'DAMAGED':
      return 'Hư hỏng';
    case 'MISSING':
      return 'Thất lạc';
    default:
      return condition || 'Bình thường';
  }
};

export const locationTypeLabel = (type?: string | null): string => {
  switch (type) {
    case 'AT_STORE':
      return 'Tại cửa hàng';
    case 'ON_TRIP':
      return 'Đang trên chuyến';
    case 'AT_BATCH':
      return 'Trong mẻ giặt';
    case 'LOST':
      return 'Thất lạc';
    default:
      return type || 'Chưa rõ';
  }
};

export const eventTypeLabel = (eventType?: string | null): string => {
  switch (eventType) {
    case 'TAGGED':
      return 'Gắn thẻ';
    case 'LOADED':
      return 'Lên xe';
    case 'UNLOADED':
      return 'Bỏ khỏi xe';
    case 'DEPARTED':
      return 'Xuất phát';
    case 'ARRIVED':
      return 'Đến nơi';
    case 'RECEIVED':
      return 'Đã nhận';
    case 'MISSING':
      return 'Thất lạc';
    case 'UNEXPECTED_SCAN':
      return 'Quét không thuộc chuyến';
    case 'BATCH_ASSIGNED':
      return 'Vào mẻ';
    case 'BATCH_RELEASED':
      return 'Ra khỏi mẻ';
    case 'STATUS_SCAN':
      return 'Quét trạng thái';
    case 'CONDITION_CHANGED':
      return 'Đổi tình trạng';
    case 'TRIP_CREATED':
      return 'Tạo chuyến';
    case 'TRIP_DEPARTED':
      return 'Chuyến xuất phát';
    case 'TRIP_ARRIVED':
      return 'Chuyến đến nơi';
    case 'TRIP_CANCELLED':
      return 'Huỷ chuyến';
    case 'TRIP_COMPLETED':
      return 'Hoàn tất chuyến';
    case 'LEGACY_SNAPSHOT':
      return 'Dữ liệu cũ';
    default:
      return eventType || 'Sự kiện';
  }
};

