'use client'

import { RoomSocket } from '@/lib/socket/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, Suspense } from 'react'
import { Button, Image } from 'react-vant'

// 创建一个包装组件来处理搜索参数
function WaitingContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [socket, setSocket] = useState<RoomSocket | null>(null)
    const [reconnect, setReconnect] = useState(false)
    const [reconnectKey, setReconnectKey] = useState(0) // 添加重连计数器
    const [adminJoin, setAdminJoin] = useState(false)
    const [adminReady, setAdminReady] = useState(false)
    const [roomId, setRoomId] = useState(0);
    const [ready, setReady] = useState(false) // 添加用户准备状态
    const readyRef = useRef(false)  // 添加 ref 来跟踪最新状态
    const [imgSrc, setImgsrc] = useState('')
    const [usedCount, setUsedCount] = useState(0)
    const [totalCount, setTotalCount] = useState(0)

    useEffect(() => {
        readyRef.current = ready  // 当 ready 状态改变时更新 ref
    }, [ready])


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
            setAdminReady(false)
            setReady(false)
        }, (id, ready, online, used, total) => {
            setRoomId(id)
            setAdminJoin(online)
            setAdminReady(ready)
            setTotalCount(total)
            setUsedCount(used)
        }, (data, used) => {
            setImgsrc(data)
            setUsedCount(used)
        }, () => {
            const currentReady = readyRef.current;  // 记录当前状态以便调试
            console.log('Status check, current ready state:', currentReady);
            return {
                ready: currentReady,
            }
        }, (param) => {
            const {online, ready} = param
            setAdminJoin(online)
            setAdminReady(ready)
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
            console.log('user ready', ready, re)
            setReady(re)
            console.log('user ready1', ready, re)

        })
    }

    const handleLeave = () => {
        if (!socket) return
        socket.clientLeaveRoom()
        router.replace("/login")
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
                    <div className="text-sm text-gray-500 flex justify-between items-center">
                    <span>使用次数:</span>
                    <span className={usedCount >= totalCount ? 'text-red-500' : 'text-green-500'}>
                        {usedCount}/{totalCount}
                    </span>
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
                                        type={ready ? 'info' : 'primary'}
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
                        onClick={handleLeave}
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

// 主组件使用 Suspense 包装
export default function WaitingPage() {
    return (
        <Suspense fallback={
            <div className="p-4 text-center">
                <div className="text-lg">加载中...</div>
            </div>
        }>
            <WaitingContent />
        </Suspense>
    )
}