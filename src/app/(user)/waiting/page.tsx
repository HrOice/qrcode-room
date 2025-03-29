/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { roomApi, RoomDetail } from '@/lib/api/room'
import { RoomSocket } from '@/lib/socket/client'


import { Jimp, ResizeStrategy } from 'jimp'
import jsQR from 'jsqr'
import QRCode from 'qrcode'

import ConfirmDialog from '@/components/ConfirmDialog'
import { useNotifySound } from '@/hooks/useNotifySound'
import { useQRScanner } from '@/hooks/useQRScanner'
import { copyToClipboard } from '@/lib/utils/clipboard'
import { generateQRWithText } from '@/lib/utils/qrcode'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Qr } from '@react-vant/icons'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Button, Input, Uploader, UploaderValueItem } from 'react-vant'



// 创建一个包装组件
function WaitingRoom() {
    const searchParams = useSearchParams()
    const router = useRouter()


    const [room, setRoom] = useState<RoomDetail | null>(null)
    const [isReady, setIsReady] = useState(false)
    const [userReady, setUserReady] = useState(false)
    const [userOnline, setUserOnline] = useState(false)
    const [textValue, setTextValue] = useState('')
    const [qrCodeData, setQrCodeData] = useState<{
        url: string;
        type: 'text' | 'image';
    } | null>(null)
    const [loading, setLoading] = useState(false)
    const [reconnect, setReconnect] = useState(true)
    const [reconnectKey, setReconnectKey] = useState(0) // 添加重连计数器
    const [leaveModalOpen, setLeaveModalOpen] = useState(false)
    const readyRef = useRef(false)  // 添加 ref 来跟踪最新状态'
    const [usedCount, setUsedCount] = useState(0)

    const [roomId, setRoomId] = useState(0)
    const [showRoomQR, setShowRoomQR] = useState(false)
    const [roomQRCode, setRoomQRCode] = useState('')
    const [sendSuccess, setSendSuccess] = useState(false)

    const [orderSuccessBtnOpen, setOrderSuccessBtnOpen] = useState(false)
    // 添加倒计时状态
    const [countdown, setCountdown] = useState<string>('')
    const countdownIntervalRef = useRef<NodeJS.Timer | null>(null)
    const totalRef = useRef(0)
    const [receiverCallback, setReceiverCallback] = useState('')

    const playNotifySound = useNotifySound({
        volume: 0.5,
        soundUrl: '/sounds/sounds.mp3'
    })
    // 添加倒计时处理函数
    const startCountdown = useCallback((roomCreatedAt: string, roomExpired: number) => {
        const updateCountdown = () => {
            const now = new Date()
            const createdAt = new Date(roomCreatedAt)
            const timeLimit = roomExpired // 30分钟
            const timePassed = now.getTime() - createdAt.getTime()
            const timeLeft = timeLimit - timePassed

            if (timeLeft <= 0) {
                if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current as NodeJS.Timeout)
                }
                setCountdown('已超时')
                return
            }

            const minutes = Math.floor(timeLeft / 60000)
            const seconds = Math.floor((timeLeft % 60000) / 1000)
            setCountdown(`${minutes}分${seconds}秒`)
        }

        // 清除已存在的定时器
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current as NodeJS.Timeout)
        }

        // 立即更新一次
        updateCountdown()
        // 设置定时更新
        countdownIntervalRef.current = setInterval(updateCountdown, 1000)
    }, [])


    useEffect(() => {
        readyRef.current = isReady  // 当 ready 状态改变时更新 ref
    }, [isReady])
    // 获取房间详情
    const fetchRoomDetail = useCallback(async () => {
        if (roomId == 0) {
            return;
        }
        const { room } = await roomApi.getRoom(roomId)
        if (!room) {
            return;
        }
        setRoom(room)
        setUsedCount(room.cdkey.used)
        totalRef.current = room.cdkey.total
    }, [roomId])
    // 添加清空函数
    const handleClear = () => {
        setQrCodeData(null)
        setTextValue('')
    }
    const resetStatus = useCallback(() => {
        // setUserReady(false)
        // setUserOnline(false)
        // setIsReady(false)
        // setSendSuccess(false)
        // handleClear()
    }, [])
    const onOrderSuccess = useCallback((used: number) => {
        setOrderSuccessBtnOpen(false)
        if (used <= totalRef.current && used >= 0) {
            setUsedCount(used)
            toast.success('成功, 3秒后离开房间')
        } else {
            toast.success('次数不足')
            roomSocketRef.current!.adminDisconnect()
        }

        setTimeout(() => {
            roomSocketRef.current!.adminDisconnect()
            resetStatus()
        }, 3000)
    }, [resetStatus])

    // 使用 useRef 确保 socket 实例只初始化一次
    const roomSocketRef = useRef<RoomSocket | null>(null)
    // 初始化 Socket 连接
    useEffect(() => {
        const key = searchParams.get('key')
        if (!key) {
            router.push('/login')
            return
        }
        if (!roomSocketRef.current) {
            console.log('new ref admin', roomId)
            const roomSocket = new RoomSocket(key, undefined, () => {
                setReconnect(true);
            })

            roomSocketRef.current = roomSocket
            setReconnect(false)
            roomSocket.senderJoin(
                () => {
                    setUserReady(true)
                    playNotifySound()
                },
                () => {
                    toast.success('用户已离开房间')
                    resetStatus()
                },
                () => {
                    return {
                        ready: readyRef.current,
                    }
                },
                (roomId, ready, online, roomCreatedAt, roomExpired, data) => {
                    startCountdown(roomCreatedAt, roomExpired)  // 启动倒计时
                    // 当前客户端时间与roomCreatedAt计算差值，
                    setRoomId(roomId)
                    // 获取房间详情
                    fetchRoomDetail()
                    setUserReady(ready);
                    setUserOnline(online)
                    setTextValue(data)
                    if (data) {
                        setSendSuccess(true)
                    } else {
                        setSendSuccess(false)
                    }
                    setReceiverCallback('')
                    setIsReady(false)
                }, (param) => {
                    const { online, ready } = param
                    setUserOnline(online)
                    setUserReady(ready)
                }, () => {
                    setUserOnline(true)
                    // setUserReady(false)
                    // setIsReady(false)
                    // setSendSuccess(false)
                }, (used, success) => {
                    if (success) {
                        setReceiverCallback('成功')
                        onOrderSuccess(used)
                    } else {
                        toast.error('接收者反馈失败')
                        setReceiverCallback('未成功')
                    }
                    playNotifySound()
                }
            )

        }



        return () => {
            // 清理 socket 连接
            if (roomSocketRef.current) {
                roomSocketRef.current!.adminDisconnect()
                roomSocketRef.current = null
            }
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current as NodeJS.Timeout)
            }
        }
    }, [roomId, router, fetchRoomDetail, reconnectKey, searchParams, resetStatus, onOrderSuccess, startCountdown, playNotifySound])

    // 处理准备状态
    const handleReady = () => {
        if (!roomSocketRef.current) return
        const r = !isReady;
        roomSocketRef.current!.adminReady(r, (re) => {
            setIsReady(re)
        })
    }

    // 修改文本变化处理函数
    const handleTextChange = async (text: string) => {
        try {
            setTextValue(text)
            if (text) {
                // 不带文字
                // const qrDataUrl = await generateQR(text)  // 添加中心文本
                setQrCodeData({
                    url: '',
                    type: 'text'
                })
            } else {
                setQrCodeData(null)
            }
        } catch (error) {
            console.error(error)
            toast.error('生成二维码失败')
        }
    }

    // 处理图片上传和二维码识别
    const handleImageUpload = async (items: UploaderValueItem[]) => {
        try {
            if (items.length > 0) {
                setQrCodeData({
                    url: items[0].url!,
                    type: 'image'
                })

                // 使用 Jimp 处理图片
                const image = await Jimp.read(items[0].url!)

                // 可以添加图片预处理以提高识别率
                image
                    .normalize() // 标准化像素值
                    // .quality(80)
                    .contrast(0.2) // 增加对比度
                    .resize({ w: 800, mode: ResizeStrategy.BILINEAR }) // 调整大小但保持比例

                const { width, height } = image.bitmap
                const imageData = new Uint8ClampedArray(image.bitmap.data)

                // 使用增强的配置进行识别
                const code = jsQR(imageData, width, height, {
                    inversionAttempts: "dontInvert", // 尝试黑白两种模式

                })

                if (code) {
                    // 识别成功后，使用文本重新生成小尺寸二维码
                    const compressedQR = await QRCode.toDataURL(code.data, {
                        width: 400,
                        margin: 1,
                        scale: 4,
                        // quality: 0.8,
                    })

                    setTextValue(code.data)
                    setQrCodeData({
                        url: compressedQR,
                        type: 'text'  // 改为text类型，这样发送时会使用文本重新生成
                    })
                    toast.success('已识别二维码内容')
                } else {
                    toast.error('未检测到二维码，请尝试调整图片亮度或对比度')
                }
            }
        } catch (error) {
            console.error('识别二维码失败:', error)
            toast.error('识别失败，请确保上传的是清晰的二维码图片')
        }
    }

    // 处理提交
    const handleSubmit = async () => {
        if (!roomSocketRef.current || !textValue) return
        setLoading(true)
        try {
            roomSocketRef.current!.adminSend(textValue, (used, total) => {
                if (used <= total && used >= 0) {
                    toast.success('发送成功')
                    setSendSuccess(true)
                    setUsedCount(used)
                } else {
                    toast.success('次数不足')
                }
            })
        } catch (error) {
            console.error(error)
            toast.error('提交失败')
        } finally {
            setLoading(false)
        }
    }

    // 处理离开房间
    const handleLeave = () => {

        if (roomSocketRef.current) {
            roomSocketRef.current?.adminLeaveRoom()
        }
        router.push('/login')
    }

    const { showCamera, videoRef, startCamera, stopCamera } = useQRScanner({
        onSuccess: async (text) => {
            setTextValue(text)
            // const qrDataUrl = await generateQR(text)
            setQrCodeData({
                url: '',
                type: 'text'
            })
            toast.success('已识别二维码')
        }
    })

    // 清理相机相关的 useEffect
    useEffect(() => {
        return () => {
            stopCamera()
        }
    }, [stopCamera])

    // 修改房间二维码生成
    const generateRoomQR = useCallback(async () => {
        if (!room) return
        const url = `${window.location.origin}/to/${room.id}`
        try {
            const qrDataUrl = await generateQRWithText(url, {
                centerText: String(room.id)
            })
            setRoomQRCode(qrDataUrl)
        } catch (error) {
            console.error(error)
            toast.error('生成房间二维码失败')
        }
    }, [room])


    const handleOrderSuccess = async () => {
        setOrderSuccessBtnOpen(false)
        try {
            await roomSocketRef.current!.senderSuccess((used) => {
                onOrderSuccess(used)
            })
        } catch (error) {
            console.error(error)
            toast.error('提交失败')
        } finally {
            // setLoading(false)
        }
    }

    if (!room) {
        return <div className="p-4 text-center">加载中...</div>
    }

    return (
        <div className="max-w-2xl p-4 space-y-6">
            {/* 房间信息 */}
            <div className="bg-white rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-medium">房间 #{room.id}</h2>
                    <div className="flex items-center gap-2">
                        {/* 添加倒计时显示 */}
                        {!reconnect && <span className={`text-sm ${countdown === '已超时' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                            剩余时间: {countdown}
                        </span>}
                        <Button
                            size="small"
                            icon={<Qr />}
                            onClick={() => {
                                generateRoomQR()
                                setShowRoomQR(true)
                            }}
                        >
                            房间码
                        </Button>
                        {/* <span className="text-gray-500">
                            创建于 {formatDate(room.createdAt)}
                        </span> */}
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="text-sm text-gray-500">CDKey</div>
                    <div className="font-mono bg-gray-50 p-2 rounded">
                        {room.cdkey.key}
                    </div>
                </div>
                <div className="text-sm text-gray-600">
                    剩余使用次数: {room.cdkey.total - usedCount}/{room.cdkey.total}
                </div>
                {sendSuccess && <div className="text-sm text-red-600">
                    接收者反馈状态: {receiverCallback}
                </div>}
            </div>
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

            {/* 操作区域 */}
            {!reconnect && (isReady || textValue) && userReady && (
                <div className="bg-white rounded-lg p-4 space-y-4">
                    {/* 文本输入 */}
                    <Input.TextArea
                        value={textValue}
                        onChange={handleTextChange}
                        placeholder="输入文本自动生成二维码"
                        rows={4}
                    />

                    {/* 合并的图片上传和预览区域 */}
                    <div className="space-y-4">
                        <div className="text-sm text-gray-500">
                            上传或扫描二维码识别内容
                        </div>
                        <div className=" mx-auto border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-4">
                            <Uploader
                                onChange={handleImageUpload}
                                multiple={false}
                                maxCount={1}
                                previewFullImage={false}
                            >
                                <Button>
                                    点击此处上传图片
                                </Button>
                            </Uploader>

                            <Button
                                icon={<Qr />}
                                onClick={(e) => {
                                    e.preventDefault()
                                    startCamera()
                                }}
                            >
                                打开相机扫码
                            </Button>
                        </div>
                    </div>

                    <Button
                        block
                        type="primary"
                        loading={loading}
                        disabled={!textValue}
                        onClick={handleSubmit}
                    >
                        发送给用户
                    </Button>
                    {sendSuccess && (<><Button
                        block
                        type="info"
                        disabled={!sendSuccess}
                        onClick={() => {
                            setOrderSuccessBtnOpen(true)
                        }}
                    >
                        成功
                    </Button>
                        <ConfirmDialog
                            open={orderSuccessBtnOpen}
                            title="确认完成"
                            content="确认成功？"
                            confirmText="确认成功"
                            confirmType="primary"
                            onConfirm={handleOrderSuccess}
                            onCancel={() => setOrderSuccessBtnOpen(false)}
                        /></>)}
                </div>
            )}

            {/* 准备状态 */}
            {!reconnect && (
                <div className="bg-white rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="space-y-2">
                            <div>
                                用户状态:
                                <span className={`ml-2 ${userOnline ? 'text-green-600' : 'text-red-600'}`}>
                                    {userOnline ? '在线' : '离线'}
                                </span>
                                {userOnline && (
                                    <span className={`ml-2 ${userReady ? 'text-green-600' : 'text-yellow-600'}`}>
                                        {userReady ? '已准备' : '未准备'}
                                    </span>
                                )}
                            </div>
                        </div>
                        <Button
                            type={isReady ? 'info' : 'primary'}
                            disabled={isReady} // 用户不在线时禁用准备按钮
                            onClick={handleReady}
                        >
                            {isReady ? '已准备' : '准备'}
                        </Button>
                    </div>
                </div>)}

            {/* 离开按钮 */}
            <Button block type="danger" onClick={() => setLeaveModalOpen(true)}>
                离开房间
            </Button>
            {/* 离开Dialog */}
            <ConfirmDialog
                open={leaveModalOpen}
                title="确认离开"
                content="离开后可重新加入"
                confirmText="离开"
                confirmType="primary"
                onConfirm={handleLeave}
                onCancel={() => setLeaveModalOpen(false)}
            />
            {/* 修改相机对话框部分 */}
            <Dialog
                open={showCamera}
                onClose={stopCamera}
                className="relative z-50"
            >
                <div className="fixed inset-0 bg-black/30" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel className="w-full max-w-sm rounded-lg bg-white">
                        <div className="p-4">
                            <DialogTitle className="text-lg font-medium">相机扫码</DialogTitle>
                            <div className="mt-4 aspect-[4/3] w-full relative bg-black">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-[15%] border-2 border-primary border-dashed rounded-lg pointer-events-none" />
                                <div className="absolute top-0 left-0 right-0 text-center p-2 text-sm text-gray-500 bg-black/10">
                                    将二维码对准框内
                                </div>
                            </div>
                            <div className="mt-4 flex justify-between items-center">
                                <div className="text-sm text-gray-500">
                                    扫描中...
                                </div>
                                <Button onClick={stopCamera}>关闭相机</Button>
                            </div>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
            {/* 在最后添加房间二维码对话框 */}
            <Dialog
                open={showRoomQR}
                onClose={() => setShowRoomQR(false)}
                className="relative z-50"
            >
                <div className="fixed inset-0 bg-black/30" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <DialogPanel className="w-full max-w-sm rounded-lg bg-white">
                        <div className="p-4">
                            <DialogTitle className="text-lg font-medium">房间二维码 #{room.id}</DialogTitle>
                            <div className="mt-4 aspect-square w-full relative flex flex-col items-center">
                                {roomQRCode && (
                                    <Image
                                        src={roomQRCode}
                                        width={200}
                                        height={200}
                                        alt="Room QR Code"
                                        className="w-48 h-48 object-contain"
                                    />
                                )}
                                <div className="mt-4 flex items-center gap-2 px-4">
                                    {/* <div className="text-sm text-gray-500 break-all flex-1">
                                        {`${window.location.origin}/to/${room.id}`}
                                    </div> */}
                                    <Button
                                        size="small"
                                        onClick={() => copyToClipboard(`${window.location.origin}/to/${room.id}`)}
                                    >
                                        复制地址
                                    </Button>
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Button onClick={() => setShowRoomQR(false)}>关闭</Button>
                            </div>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog></div>)


}

// 修改默认导出组件
export default function RoomDetailPage() {
    return (
        <Suspense fallback={<div className="p-4 text-center">加载中...</div>}>
            <WaitingRoom />
        </Suspense>
    )
}