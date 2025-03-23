/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  user: {
    id: number
    username: string
    role: number
  } | null
  setAuth: (token: string, user: any) => void
  clearAuth: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        set({ token, user })
        localStorage.setItem('auth-token', token)
      },
      clearAuth: () => {
        set({ token: null, user: null })
        localStorage.removeItem('auth-token')
      }
    }),
    {
      name: 'auth-storage'
    }
  )
)