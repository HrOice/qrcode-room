import { request } from './request'

export interface CDKey {
    id: number
    key: string
    used: number
    total: number
    status: number
    createdAt: Date
}

export interface CDKeyListResponse {
    cdkeys: CDKey[]
    total: number
}

export const cdkeyApi = {
    // 获取列表
    getCDKeys(params: {
        page: number
        keyword?: string | undefined
        status: number | undefined
        total?: number | undefined
    }) {
        return request<CDKeyListResponse>('/admin/cdkeys', {
            params: {
                ...params,
                status: params.status!
            }
        })
    },

    // 更新状态
    updateStatus(id: number, status: boolean) {
        return request('/admin/cdkeys/status', {
            method: 'PUT',
            body: { id, status }
        })
    },

    addCDKey(data: { number: number, totalUse: number }) {
        return request('/admin/cdkeys', {
            method: 'POST',
            body: data
        })
    }
}