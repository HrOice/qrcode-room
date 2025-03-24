'use client'

import { Bars, UserO, WapHomeO } from '@react-vant/icons'; // 添加 CloseO 图标
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Button, Cell, Popup } from 'react-vant'; // 添加 Dialog

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [visible, setVisible] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const isLoginPage = pathname === '/admin/login'
    // 如果是登录页，直接返回内容
    if (isLoginPage) {
        return <div className="min-h-screen bg-white p-12">{children}</div>
    }
    const tabs = [
        {
            key: '/admin/cdkey',
            title: 'CDKey管理',
            icon: <Bars />,
        },
        {
            key: '/admin/user',
            title: '用户管理',
            icon: <UserO />,
        },
        {
            key: '/admin/room',
            title: '房间管理',
            icon: <WapHomeO />,
        },
    ]

    const handleLogout = () => {
        localStorage.removeItem('auth-token');  // 清除认证令牌
        router.push('/admin/login');  // 跳转到登录页
        setVisible(false);  // 关闭菜单
    };

    return (
        <div className="min-h-screen flex flex-col bg-white text-gray-900">
            {/* 顶部导航栏 */}
            <div className="h-14 flex items-center px-4 border-b bg-white fixed w-full top-0 z-10 shadow-sm">
                <Button 
                    icon={<Bars fontSize={20} />} 
                    className="!p-2"
                    onClick={() => setVisible(true)}
                />
                <span className="ml-4 text-lg font-medium">管理后台</span>
            </div>

            {/* 主要内容区 */}
            <div className="flex-1 p-2 mt-14 bg-gray-50">
                {children}
            </div>

            {/* 侧边菜单 */}
            <Popup
                visible={visible}
                onClose={() => setVisible(false)}
                position='left'
                style={{ width: '50%', maxWidth: '300px', height: '100%' }}
            >
                <div className="h-full bg-white flex flex-col">
                    <div className="h-14 flex items-center px-4 border-b">
                        <span className="text-lg font-medium">菜单导航</span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {tabs.map(item => (
                            <Cell
                                key={item.key}
                                title={item.title}
                                icon={item.icon}
                                isLink
                                className={pathname === item.key ? 'rv-cell--active' : ''}
                                onClick={() => {
                                    router.push(item.key)
                                    setVisible(false)
                                }}
                            />
                        ))}
                    </div>
                    {/* 添加退出按钮 */}
                    <div className="border-t">
                        <Cell
                            title="退出"
                            className="text-red-500"
                            onClick={handleLogout}
                        />
                    </div>
                </div>
            </Popup>
            <Toaster position="top-center" />
        </div>
    )
}