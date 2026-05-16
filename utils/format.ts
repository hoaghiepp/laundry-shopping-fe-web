// Global formatting utilities
// Usage:
//   import { FormatUtils, formatCurrencyVND } from '@/utils/format';
//   const price = FormatUtils.toVndCurrency(120000);
//   const price2 = formatCurrencyVND(120000);

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export class FormatUtils {
  /**
   * Convert a number to VND currency string, e.g. 120000 -> "120.000 ₫"
   */
  static toVndCurrency(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return "";

    const num = typeof value === "string" ? Number(value) : value;
    if (Number.isNaN(num)) return "";

    return vndFormatter.format(num);
  }

  static formatDateTimeVN(isoString: string) {
    return new Date(isoString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }
}

/**
 * Helper function wrapper for VND currency formatting
 */
export const formatCurrencyVND = (
  value: number | string | null | undefined
): string => FormatUtils.toVndCurrency(value);

export const formatDateTimeVN = (isoString: string) => {
  return FormatUtils.formatDateTimeVN(isoString);
};