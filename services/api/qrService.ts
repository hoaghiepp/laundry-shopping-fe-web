import { QR_API_BASE_URL } from "@/constants/api";

export interface GenerateQRRequest {
    data: string;
    size?: string; // default value is '200x200', format: "200x200"
}

export const qrService = {
    /**
     * Generate QR code URL
     * The API returns the QR code image directly, so we return the URL to fetch the image
     * @param data - QR code request data
     * @returns URL string to the QR code image
     */
    generateQR: async (data: GenerateQRRequest): Promise<string> => {
        try {
            // Build the API URL according to goqr.me API documentation
            // https://goqr.me/api/doc/create-qr-code/
            const size = data.size || "200x200";
            const encodedData = encodeURIComponent(data.data);
            
            // The API returns the image directly, so we return the URL
            const qrUrl = `${QR_API_BASE_URL}/v1/create-qr-code/?data=${encodedData}&size=${size}`;
            
            return qrUrl;
        } catch (error: any) {
            throw new Error(error.message || "Generate QR failed");
        }
    }
}