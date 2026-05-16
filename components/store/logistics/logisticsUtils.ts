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
      return 'Bao tải về';
    default:
      return type;
  }
};

export const getItemStatusDisplay = (status: string): StatusDisplay => {
  switch (status) {
    case 'SEALED':
      return { text: 'Đã đóng gói', color: '#3B82F6', bg: '#DBEAFE' };
    case 'OPENED':
      return { text: 'Đã mở', color: '#059669', bg: '#D1FAE5' };
    default:
      return { text: status, color: '#6B7280', bg: '#F3F4F6' };
  }
};

