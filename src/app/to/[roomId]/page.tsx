
'use client'

import ConfirmDialog from '@/components/ConfirmDialog'
import { RoomSocket } from '@/lib/socket/client'
import { decodeRoomUrl } from '@/lib/utils/qrcode'
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
    const [dataExpired, setDataExpired] = useState(false)
    const roomSocketRef = useRef<RoomSocket | null>(null)
    const [noticeSender, setNoticeSender] = useState(false)
    const [noticeSenderTime, setNoticeSenderTime] = useState(0)
    const noticeSenderTimeRef = useRef<NodeJS.Timeout>(null);
    useEffect(() => {
        readyRef.current = ready  // 当 ready 状态改变时更新 ref
    }, [ready])

    const resetStatus = () => {
        setAdminJoin(false)
        setAdminReady(false)
        setNoticeSender(false)
        // setReady(false)
        // setSendSuccess(false)
        // setReveivedUrl('')
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
        let { roomId } = params; // cdKey

        roomId = decodeRoomUrl(String(roomId))
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
                setAdminReady(false)
                setAdminJoin(false)
            }, (id, ready, online, used, total, selfReady, data, dataCreatedAt) => {
                setRoomId(id)
                setAdminJoin(online)
                setAdminReady(ready)
                setReady(selfReady)
                setReveivedUrl(data)
                if (data) {
                    setSendSuccess(true)
                    if (dataCreatedAt!.getTime() + 25000 < new Date().getTime()) {
                        // 不显示打开链接
                        setDataExpired(true)
                        setSendSuccess(false)
                        setReveivedUrl('')
                    } else {
                        window.open(data, '_blank')
                    }
                }
                // setTotalCount(total)
                // setUsedCount(used)
            }, (data) => {
                setReveivedUrl(data)
                setSendSuccess(true)
                setDataExpired(false)
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
            setNoticeSender(true)
            setNoticeSenderTime(15)
            noticeSenderTimeRef.current = setInterval(() => {
                setNoticeSenderTime((r) => {
                    return r -1;
                })
            }, 1000) 
            setTimeout(() => {
                setNoticeSender(false)
                clearInterval(noticeSenderTimeRef.current as NodeJS.Timeout)
            }, 15000)
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
                    {(
                        // 管理员已加入状态
                        <div className="space-y-4">
                            <div>
                                <div className='text-center text-red-500'>点击按钮，提醒对方发送</div>
                            </div>
                            {/* 二维码展示区域 */}
                            <div className="bg-white rounded-lg px-4">
                                <div className="p-4 w-full max-w-sm mx-auto rounded-lg flex items-center justify-center">
                                    {(!adminReady) && (!reveivedUrl) ? (
                                        <div className="text-gray-400">
                                            <span>请在此页面等待0-2分钟  中途不要离开网页  避免掉线</span>
                                            <div className='text-center'>等待发送者发送...</div>
                                        </div>
                                    ) : (reveivedUrl) ? (
                                        <div className='w-full flex flex-col items-center'>
                                            <div className='p-4'>接收成功</div>
                                            {!dataExpired && <Button
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
                                            </Button>}
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
                                            <span>请在此页面等待0-2分钟  中途不要离开网页  避免掉线</span>
                                            <div className='text-center'>等待发送者发送...</div>
                                        </div>
                                    )}

                                </div>
                                <div>成功:截图反馈即可</div>
                                <div>失败:重新扫描房间码进入房间，提醒对方发送</div>
                            </div>

                            {/* 准备状态区域 */}
                            <div className="bg-white rounded-lg p-4 space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-2">
                                        <div>
                                        对方是否在线：
                                            <span className={adminJoin ? 'text-green-600' : 'text-red-600'}>
                                                {adminJoin ? '在线' : '离线'}
                                            </span>
                                        </div>
                                        {/* <div>
                                            用户状态：
                                            <span className={'text-green-600'}>
                                                已准备
                                            </span>
                                        </div> */}
                                    </div>
                                    <Button
                                        type={'primary'}
                                        disabled={noticeSender || !adminJoin}
                                        onClick={handleReady}
                                    >
                                       提醒对方{noticeSender?`(${noticeSenderTime})`:''}
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