import { request } from "./request";

export const clientApi = {
    validCDKey: async (password: string): Promise<{ data: { key: string; } }> => {
        return request('/validCDKey', {
            method: 'POST',
            body: { password }
        })
    }
}