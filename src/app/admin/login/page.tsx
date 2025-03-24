'use client'
import toast, { Toaster } from 'react-hot-toast'
import { Button, Cell, Input } from 'react-vant'

import { useAuth } from '@/lib/store/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'


export default function AdminLogin() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const router = useRouter()

    const { setAuth } = useAuth()

    const handleLogin = async () => {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        })
        const data = await res.json()
        if (data.token) {
            setAuth(data.token, data.user)
            toast('登录成功', { icon: '🎉' })
            router.push('/admin/cdkey')
        } else {
            toast('登录失败', { icon: '❌' })
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-semibold text-center mb-6">后台管理登录</h2>
                <div className="space-y-4">
                    <Cell className="!rounded border !p-0">
                        <Input
                            type="text"
                            value={username}
                            onChange={setUsername}
                            placeholder="请输入用户名"
                            className="!px-3 !py-2"
                        />
                    </Cell>
                    <Cell className="!rounded border !p-0">
                        <Input
                            type="password"
                            value={password}
                            onChange={setPassword}
                            placeholder="请输入密码"
                            className="!px-3 !py-2"
                        />
                    </Cell>
                    <Button 
                        block 
                        type="primary" 
                        onClick={handleLogin}
                        className="!mt-6"
                    >
                        登录
                    </Button>
                </div>
            </div>
            <Toaster position="top-center" />
        </div>
    )
}
