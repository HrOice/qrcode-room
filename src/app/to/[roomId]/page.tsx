/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import ConfirmDialog from '@/components/ConfirmDialog'
import { RoomSocket } from '@/lib/socket/client'
import { useParams, useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { Button } from 'react-vant'

// 接收方
// 创建一个包装组件来处理搜索参数
function WaitingContent() {
    const router = useRouter()
    const params = useParams()
    const [socket, setSocket] = useState<RoomSocket | null>(null)
    const [reconnect, setReconnect] = useState(false)
    const [reconnectKey, setReconnectKey] = useState(0) // 添加重连计数器
    const [adminJoin, setAdminJoin] = useState(false)
    const [adminReady, setAdminReady] = useState(false)
    const [roomId, setRoomId] = useState(0);
    const [ready, setReady] = useState(false) // 添加用户准备状态
    const readyRef = useRef(false)  // 添加 ref 来跟踪最新状态
    const [reveivedUrl, setReveivedUrl] = useState('')
    const [orderSuccessBtnOpen, setOrderSuccessBtnOpen] = useState(false)
    const [orderFailBtnOpen, setOrderFailBtnOpen] = useState(false)
    const [sendSuccess, setSendSuccess] = useState(false)

    const roomSocketRef = useRef<RoomSocket | null>(null)


    useEffect(() => {
        readyRef.current = ready  // 当 ready 状态改变时更新 ref
    }, [ready])

    const resetStatus = () => {
        setAdminJoin(false)
        setAdminReady(false)
        setReady(false)
        setSendSuccess(false)
        setReveivedUrl('')
    }


    const onOrderSuccess = useCallback(() => {
        setOrderSuccessBtnOpen(false)
        toast.success('成功反馈, 3秒后离开房间')
        setTimeout(() => {
            resetStatus()
            roomSocketRef.current!.adminDisconnect()
        }, 3000)
    }, [])


    useEffect(() => {
        const { roomId } = params; // cdKey
        if (!roomId) {
            throw new Error('房间不存在')
        }
        if (!roomSocketRef.current) {
            const roomSocket = new RoomSocket('student', parseInt(roomId as string), () => {
                setReconnect(true)
            })
            roomSocketRef.current = roomSocket
            setReconnect(false)
            roomSocket.receiverJoinRoom(parseInt(roomId as string), () => {
                setAdminJoin(true)
            }, (ready) => {
                setAdminReady(ready)
            }, () => {
                resetStatus()
            }, (id, ready, online, used) => {
                setRoomId(id)
                setAdminJoin(online)
                setAdminReady(ready)
                setReady(false)
                // setTotalCount(total)
                // setUsedCount(used)
            }, (data) => {
                setReveivedUrl(data)
                setSendSuccess(true)
                setTimeout(() => {
                    if (window) {
                        window.open(data, '_blank')
                    }
                }, 500)
                // setUsedCount(used)
            }, () => {
                const currentReady = readyRef.current;  // 记录当前状态以便调试
                console.log('Status check, current ready state:', currentReady);
                return {
                    ready: currentReady,
                }
            }, (param) => {
                // 没用
                const { online, ready } = param
                setAdminJoin(online)
                setAdminReady(ready)
            }, () => {
                setSendSuccess(false)
                onOrderSuccess()
            })
            setSocket(roomSocket)
        }
        return () => {
            if (roomSocketRef.current) {
                roomSocketRef.current!.clientDisconnect()
                roomSocketRef.current = null
            }
        }
    }, [params, router, reconnectKey, onOrderSuccess]) // 添加 reconnectKey 到依赖数组

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

    const handleOrderSuccess = async (success: boolean) => {
        setOrderSuccessBtnOpen(false)
        setOrderFailBtnOpen(false)
        try {
            await roomSocketRef.current!.receiverSuccess(success, () => {
                onOrderSuccess()
            }, () => {
                // 失败显示失败提示，
            })
        } catch (error) {
            console.error(error)
            toast.error('提交失败')
        } finally {
            // setLoading()
        }
    }

    return (
        <div className="p-4 space-y-4">
            {/* 房间基本信息 */}
            <div className="bg-white rounded-lg p-4">
                <div className="space-y-2">
                    <div className="text-sm text-gray-500">房间号</div>
                    <div className="font-mono text-lg">{roomId}</div>
                </div>
                {/* <div className="mt-2 space-y-2">
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
                </div> */}
            </div>

            {/* 根据不同状态显示不同内容 */}
            {!reconnect && (
                <>
                    {!adminJoin ? (
                        // 等待管理员加入状态
                        <div className="text-center space-y-4">
                            <div className="text-lg">等待发送者接入...</div>
                            <div className="animate-pulse text-gray-500">
                                请保持页面打开
                            </div>
                        </div>
                    ) : (
                        // 管理员已加入状态
                        <div className="space-y-4">
                            {/* 二维码展示区域 */}
                            <div className="bg-white rounded-lg p-4">
                                <div className="aspect-square w-full max-w-sm mx-auto rounded-lg flex items-center justify-center">
                                    {!adminReady ? (
                                        <div className="text-gray-400">
                                            等待发送者准备...
                                        </div>
                                    ) : reveivedUrl ? (
                                        <div className='w-full flex flex-col items-center'>
                                            <div className='p-4'>接收成功</div>
                                            <Button
                                                type="primary" block
                                                onClick={() => {
                                                    if (reveivedUrl.startsWith('http://') || reveivedUrl.startsWith("https://")) {
                                                        window.open(reveivedUrl, '_blank')
                                                    } else {
                                                        toast.error('非法地址')
                                                    }
                                                }}
                                            >
                                                打开链接
                                            </Button>
                                            <div className="pt-6 w-full"  ></div>
                                            {sendSuccess && (<div className='flex  w-full space-x-1'><Button
                                                block
                                                type="info"
                                                disabled={!sendSuccess}
                                                onClick={() => {
                                                    setOrderSuccessBtnOpen(true)
                                                }}
                                            >
                                                成功
                                            </Button>
                                            <div className="pt-6 w-2.5"  ></div>

                                                <Button
                                                    block
                                                    type="warning"
                                                    disabled={!sendSuccess}
                                                    onClick={() => {
                                                        setOrderFailBtnOpen(true)
                                                    }}
                                                >
                                                    未成功
                                                </Button>
                                                <ConfirmDialog
                                                    open={orderSuccessBtnOpen}
                                                    title="确认成功？"
                                                    content="确认成功？"
                                                    confirmText="确认"
                                                    confirmType="primary"
                                                    onConfirm={() => handleOrderSuccess(true)}
                                                    onCancel={() => setOrderSuccessBtnOpen(false)}
                                                />
                                                <ConfirmDialog
                                                    open={orderFailBtnOpen}
                                                    title="确认未成功？"
                                                    content="确认未成功？"
                                                    confirmText="确认"
                                                    confirmType="primary"
                                                    onConfirm={() => handleOrderSuccess(false)}
                                                    onCancel={() => setOrderFailBtnOpen(false)}
                                                />
                                            </div>)}
                                        </div>
                                    ) : (
                                        <div className="text-gray-400">
                                            等待发送者发送...
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 准备状态区域 */}
                            <div className="bg-white rounded-lg p-4 space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-2">
                                        <div>
                                            发送者状态：
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
            <Toaster position="top-center" />

        </Suspense>
    )
}