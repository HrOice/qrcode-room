'use client'

import { roomApi, RoomDetail } from '@/lib/api/room'
import { RoomSocket } from '@/lib/socket/client'
import { formatDate } from '@/lib/utils/dateFormat'

import { Jimp } from 'jimp'
import jsQR from 'jsqr'
import QRCode from 'qrcode'

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Button, Input, Uploader, UploaderValueItem } from 'react-vant'



export default function RoomDetailPage() {
    const router = useRouter()
    const params = useParams()
    const roomId = Number(params.id)

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
    const [usedCount, setUsedCount ] = useState(0)
    
    useEffect(() => {
        readyRef.current = isReady  // 当 ready 状态改变时更新 ref
    }, [isReady])
    // 获取房间详情
    const fetchRoomDetail = useCallback(async () => {
        const { room } = await roomApi.getRoom(roomId)
        setRoom(room)
        setUsedCount(room.cdkey.used)
    }, [roomId])
    // 使用 useRef 确保 socket 实例只初始化一次
    const roomSocketRef = useRef<RoomSocket | null>(null)
    // 初始化 Socket 连接
    useEffect(() => {
        const token = localStorage.getItem('auth-token')
        if (!token) {
            router.push('/admin/login')
            return
        }

        if (!roomSocketRef.current) {
            console.log('new ref admin', roomId)
            const roomSocket = new RoomSocket(token, () => {
                setReconnect(true);
            })

            roomSocketRef.current = roomSocket
            setReconnect(false)
            roomSocket.adminJoin(
                roomId,
                () => {
                    setUserReady(true)
                },
                () => {
                    toast.success('用户已离开房间')
                    setUserReady(false)
                    setUserOnline(false)
                },
                () => {
                    return {
                        ready: readyRef.current,
                    }
                },
                (roomId, ready, online) => {
                    debugger
                    setUserReady(ready);
                    setUserOnline(online)
                }, (param) => {
                    const {online, ready} = param
                    setUserOnline(online)
                    setUserReady(ready)
                }, () => {
                    setUserOnline(true)
                    setUserReady(false)
                    setIsReady(false)
                }
            )

        }

        // 获取房间详情
        fetchRoomDetail()

        return () => {
            // 清理 socket 连接
            if (roomSocketRef.current) {
                roomSocketRef.current!.adminDisconnect()
                roomSocketRef.current = null
            }
        }
    }, [roomId, router, fetchRoomDetail, reconnectKey])

    // 处理准备状态
    const handleReady = () => {
        if (!roomSocketRef.current) return
        const r = !isReady;
        roomSocketRef.current!.adminReady(r, (re) => {
            setIsReady(re)
        })
    }

    // 处理文本转二维码
    const handleTextChange = async (text: string) => {
        try {
            setTextValue(text)
            if (text) {
                const qrDataUrl = await QRCode.toDataURL(text)
                setQrCodeData({
                    url: qrDataUrl,
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
                
                const image = await Jimp.read(items[0].url!)
                const { width, height } = image.bitmap
                const imageData = new Uint8ClampedArray(image.bitmap.data)
                
                const code = jsQR(imageData, width, height)
                if (code) {
                    setTextValue(code.data)
                    toast.success('已识别二维码内容')
                } else {
                    toast.error('未检测到二维码')
                }
            } else {
                setQrCodeData(null)
            }
        } catch (error) {
            console.error(error)
            toast.error('识别二维码失败')
        }
    }

    // 处理提交
    const handleSubmit = async () => {
        if (!roomSocketRef.current || !qrCodeData) return
        setLoading(true)
        try {
            roomSocketRef.current!.adminSend(qrCodeData.url, (used) => {
                toast.success(used>0?'提交成功':'没有次数')
                if (used>0) {setUsedCount(used)}
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
        router.push('/admin/room')
    }

    if (!room) {
        return <div className="p-4 text-center">加载中...</div>
    }

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-6">
            {/* 房间信息 */}
            <div className="bg-white rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-medium">房间 #{room.id}</h2>
                    <span className="text-gray-500">
                        创建于 {formatDate(room.createdAt)}
                    </span>
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
            {!reconnect && isReady && userReady && (
                <div className="bg-white rounded-lg p-4 space-y-4">
                    {/* 文本输入 */}
                    <Input.TextArea
                        value={textValue}
                        onChange={handleTextChange}
                        placeholder="输入文本自动生成二维码"
                        rows={4}
                    />
                    
                    {/* 合并的图片上传和预览区域 */}
                    <div className="space-y-2">
                        <div className="text-sm text-gray-500">
                            {qrCodeData?.type === 'text' ? '生成的二维码' : '上传二维码图片自动识别内容'}
                        </div>
                        <div className="aspect-square w-full max-w-sm mx-auto border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center relative">
                            {qrCodeData ? (
                                // 预览区域
                                <div className="relative group w-full h-full">
                                    <Image 
                                        src={qrCodeData.url}
                                        width="100"
                                        height="100"
                                        alt="QR Code"
                                        className="w-full h-full object-contain p-4"
                                    />
                                    {/* 悬停时显示的上传覆盖层 */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Uploader
                                            value={qrCodeData?.type === 'image' ? [{ url: qrCodeData.url }] : []}
                                            onChange={handleImageUpload}
                                            multiple={false}
                                            maxCount={1}
                                            className="!block"
                                        >
                                            <div className="text-white text-sm">
                                                点击更换图片
                                            </div>
                                        </Uploader>
                                    </div>
                                </div>
                            ) : (
                                // 初始上传区域
                                <Uploader
                                    value={[]}
                                    onChange={handleImageUpload}
                                    multiple={false}
                                    maxCount={1}
                                >
                                    <div className="text-gray-400 text-sm text-center p-4">
                                        <div>点击上传二维码图片</div>
                                        <div className="mt-1">或输入文本自动生成</div>
                                    </div>
                                </Uploader>
                            )}
                        </div>
                    </div>

                    <Button
                        block
                        type="primary"
                        loading={loading}
                        disabled={!qrCodeData}
                        onClick={handleSubmit}
                    >
                        发送给用户
                    </Button>
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
                        disabled={isReady || !userOnline} // 用户不在线时禁用准备按钮
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
            <Dialog open={leaveModalOpen} as="div" className="relative z-10 focus:outline-none" onClose={() => {
                setLeaveModalOpen(false)
            }}>
                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <DialogPanel
                            transition
                            className="w-full max-w-md rounded-xl bg-gray-500 p-6"
                        >
                            <DialogTitle as="h3" className="text-base/7 font-medium text-white">
                                确认离开
                            </DialogTitle>
                            <p className="mt-2 text-sm/6 text-white/50">
                                离开后可重新加入，或者分配其他人处理
                            </p>
                            <div className="mt-4 flex w-full flex-row-reverse">
                                <Button
                                    type='primary'
                                    className='flex-1 mx-1'
                                    onClick={handleLeave}
                                >
                                    离开
                                </Button>
                                <div className='w-2'></div>
                                <Button
                                    className='flex-1 mx-1.5'
                                    onClick={() => setLeaveModalOpen(false)}
                                >
                                    取消
                                </Button>
                            </div>
                        </DialogPanel>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}