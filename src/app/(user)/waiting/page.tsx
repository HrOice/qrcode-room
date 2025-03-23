'use client'

import { RoomSocket } from '@/lib/socket/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button, Image } from 'react-vant'

export default function WaitingPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [socket, setSocket] = useState<RoomSocket | null>(null)
    const [reconnect, setReconnect] = useState(false)
    const [reconnectKey, setReconnectKey] = useState(0) // 添加重连计数器
    const [adminJoin, setAdminJoin] = useState(false)
    const [adminReady, setAdminReady] = useState(false)
    const [roomId, setRoomId] = useState(0);
    const [ready, setReady] = useState(false) // 添加用户准备状态
    const [imgSrc, setImgsrc] = useState('')

    useEffect(() => {
        const key = searchParams.get('key')
        if (!key) {
            router.push('/login')
            return
        }

        const roomSocket = new RoomSocket(key, () => {
            setReconnect(true)
        })
        setReconnect(false)
        roomSocket.joinRoom(() => {
            setAdminJoin(true)
        }, (ready) => {
            setAdminReady(ready)
        }, () => {
            setAdminJoin(false)
        }, (id) => {
            setRoomId(id)
        }, (data) => {
            setImgsrc(data)
        })
        setSocket(roomSocket)

        return () => {
            roomSocket.clientDisconnect()
        }
    }, [searchParams, router, reconnectKey]) // 添加 reconnectKey 到依赖数组

    // 处理准备按钮点击
    const handleReady = () => {
        if (!socket) return
        const r = !ready;
        socket.userReady(r, (re) => {
            setReady(re)
        })
    }

    return (
        <div className="p-4 space-y-4">
            {/* 房间基本信息 */}
            <div className="bg-white rounded-lg p-4">
                <div className="space-y-2">
                    <div className="text-sm text-gray-500">房间号</div>
                    <div className="font-mono text-lg">{roomId}</div>
                </div>
                <div className="mt-2 space-y-2">
                    <div className="text-sm text-gray-500">CDKey</div>
                    <div className="font-mono bg-gray-50 p-2 rounded">
                        {searchParams.get('key')}
                    </div>
                </div>
            </div>

            {/* 根据不同状态显示不同内容 */}
            {!reconnect && (
                <>
                    {!adminJoin ? (
                        // 等待管理员加入状态
                        <div className="text-center space-y-4">
                            <div className="text-lg">等待管理员接入...</div>
                            <div className="animate-pulse text-gray-500">
                                请保持页面打开
                            </div>
                        </div>
                    ) : (
                        // 管理员已加入状态
                        <div className="space-y-4">
                            {/* 二维码展示区域 */}
                            <div className="bg-white rounded-lg p-4">
                                <div className="aspect-square w-full max-w-sm mx-auto border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                                    {!adminReady ? (
                                        <div className="text-gray-400">
                                            等待管理员准备...
                                        </div>
                                    ) : imgSrc ? (
                                        <Image
                                            src={imgSrc}
                                            alt="QR Code"
                                            className="w-full h-full object-contain p-4"
                                        />
                                    ) : (
                                        <div className="text-gray-400">
                                            等待管理员发送...
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 准备状态区域 */}
                            <div className="bg-white rounded-lg p-4 space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-2">
                                        <div>
                                            管理员状态：
                                            <span className={adminReady ? 'text-green-600' : 'text-yellow-600'}>
                                                {adminReady ? '已准备' : '未准备'}
                                            </span>
                                        </div>
                                        <div>
                                            用户状态：
                                            <span className={ready ? 'text-green-600' : 'text-yellow-600'}>
                                                {ready ? '已准备' : '未准备'}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        type={ready ? 'success' : 'primary'}
                                        disabled={ready || !adminReady}
                                        onClick={handleReady}
                                    >
                                        {ready ? '已准备' : '准备'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 离开按钮 */}
                    <Button
                        block
                        type="danger"
                        onClick={() => {
                            socket?.leaveRoom()
                            router.push('/login')
                        }}
                    >
                        离开房间
                    </Button>
                </>
            )}

            {/* 重连按钮 */}
            {reconnect && (
                <Button
                    block
                    type='primary'
                    onClick={() => {
                        setReconnectKey(prev => prev + 1)
                    }}
                >
                    重新连接
                </Button>
            )}
        </div>
    )
}