import { request } from './request'

export interface User {
  id: number
  username: string
  status: boolean
}

export interface UserListResponse {
  users: User[]
  total: number
}

export const userApi = {
  // 获取用户列表
  getUsers(params: { page: number; keyword: string }) {
    return request<UserListResponse>('/admin/users', {
      params
    })
  },

  // 更新用户状态
  updateStatus(id: number, status: boolean) {
    return request('/admin/users', {
      method: 'PUT',
      body: { id, status: status ? 1 : 0 }
    })
  },

  updatePassword(id: number, password: string) {
    return request('/admin/users/password', {
      method: 'PUT',
      body: { id, password: password }
    })
  },

  createUser(param: {username: string, password: string}) {
    return request('/admin/users', {
      method: 'POST',
      body: param
    })
  }
}