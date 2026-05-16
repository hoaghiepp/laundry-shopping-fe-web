import { VIETQR_TEST_BASE_URL } from "@/constants/api";
import axios from "axios";
import base64 from "react-native-base64";

export interface GetTokenVietQRResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface SimulateTransactionRequest {
    bankAccount: string;
    content: string;
    amount: string;
    bankCode: string;
    transType: string;
}

export const vietqrTestService = {

    getVietToken: async (): Promise<GetTokenVietQRResponse> => {
        const user = 'customer-test7426-user26548'
        const password = 'Y3VzdG9tZXItdGVzdDc0MjYtdXNlcjI2NTQ4'
        const response = await axios.post(`${VIETQR_TEST_BASE_URL}/api/token_generate`,
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + base64.encode(`${user}:${password}`),
                }
            });

        console.log('response', response);

        return response.data;
    },

    simulateTransaction: async (content: string, amount: string): Promise<any> => {
        const responseToken = await vietqrTestService.getVietToken();
        if (!responseToken) {
            throw new Error('Failed to get access token');
        }

        // console.log('responseToken', responseToken);
        const data = {
            bankAccount: '0967890558',
            content: content,
            amount: amount,
            bankCode: 'MB',
            transType: 'C'
        }

        const response = await axios.post(`${VIETQR_TEST_BASE_URL}/bank/api/test/transaction-callback`,
            data,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + responseToken.access_token,
                }
            });
        return response.data;
    }
}