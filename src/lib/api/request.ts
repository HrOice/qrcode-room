/* eslint-disable @typescript-eslint/no-explicit-any */
import toast from "react-hot-toast"
import { useAuth } from "../store/auth"

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  params?: Record<string, string | number>
}

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options

  // 获取存储的 token
  const token = localStorage.getItem('auth-token')

  // 构建 URL 和查询参数
  const queryString = params 
    ? '?' + new URLSearchParams(params as Record<string, string>).toString() 
    : ''
  
  const response = await fetch(`/api${url}${queryString}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })

  if (response.status === 401 && url.startsWith('/admin')) {

    // 清除登录状态
    useAuth.getState().clearAuth()
    
    // 重定向到登录页
    if (typeof window !== 'undefined') {
      toast.error('登录已过期，请重新登录')
      window.location.href = '/admin/login'
    }
    
    throw new Error('未授权访问')
  }
  if (!response.ok) {
    const error = await response.json()
    toast.error(error.message || error.error || '请求失败')
    throw new Error(error.error || '请求失败')
  }
  if (method !== 'GET') {
    toast.success('操作成功')
  }
  return response.json()
}