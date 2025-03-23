'use client'

import { roomApi, type Room } from '@/lib/api/room';
import { formatDate } from '@/lib/utils/dateFormat';
import { Search } from '@react-vant/icons';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button, Dialog, Input } from 'react-vant';

export default function RoomListPage() {
    const router = useRouter()
    const [rooms, setRooms] = useState<Room[]>([])
    const [loading, setLoading] = useState(false)
    const [searchId, setSearchId] = useState('')

    // 获取房间列表
    const fetchRooms = useCallback(async () => {
        setLoading(true)
        try {
            const data = await roomApi.getRooms(searchId)
            if (data.rooms) {
                setRooms(data.rooms)
            }
        } catch (error) {
            console.error('获取房间列表失败:', error)
        } finally {
            setLoading(false)
        }
    }, [searchId]) // 添加 searchId 作为依赖


    // 加入房间
    const handleJoin = async (roomId: number) => {
        try {
            // 跳转到房间页面
            router.push(`/admin/room/${roomId}`)
        } catch (error) {
            console.error('加入房间失败:', error)
        }
    }

    // 删除房间
    const handleDelete = async (roomId: number) => {
        Dialog.confirm({
            title: '确认删除',
            message: '确定要删除这个房间吗？',
            onConfirm: async () => {
                try {
                    await roomApi.deleteRoom(roomId)
                    fetchRooms()
                } catch (error) {
                    console.error('删除房间失败:', error)
                }
            }
        })
    }


    useEffect(() => {
        fetchRooms()
    }, [fetchRooms])

    return (
        <div className="space-y-4">
            {/* 搜索栏 */}
            <div className="flex gap-4 bg-white p-4 rounded-lg">
                <Input
                    value={searchId}
                    onChange={setSearchId}
                    placeholder="搜索房间ID"
                    prefix={<Search />}
                    className="!w-64"
                />
                <Button type="primary" onClick={fetchRooms}>
                    搜索
                </Button>
            </div>

            {/* 大屏幕表格视图 */}
            <div className="hidden lg:block bg-white rounded-lg overflow-hidden">
                <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 text-gray-600 font-medium text-sm">
                    <div>房间ID</div>
                    <div>CDKey</div>
                    <div>状态</div>
                    <div>创建时间</div>
                    <div>操作</div>
                </div>

                <div className="divide-y divide-gray-100">
                    {rooms.map(room => (
                        <div key={room.id} className="grid grid-cols-5 gap-4 p-4 items-center">
                            <div>{room.id}</div>
                            <div className="font-mono text-sm truncate">
                                {room.cdkey.key}
                            </div>
                            <div>
                                <span className={`px-2 py-1 rounded text-sm ${
                                    room.status === 1
                                        ? 'bg-green-50 text-green-600'
                                        : 'bg-yellow-50 text-yellow-600'
                                }`}>
                                    {room.status === 1 ? '已连接' : '等待加入'}
                                </span>
                            </div>
                            <div className="text-gray-600 text-sm">
                                {formatDate(room.createdAt)}
                            </div>
                            <div className="space-x-2">
                                <Button size="small" type="primary" onClick={() => handleJoin(room.id)}>
                                    加入
                                </Button>
                                <Button size="small" type="danger" onClick={() => handleDelete(room.id)}>
                                    删除
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 小屏幕卡片视图 */}
            <div className="lg:hidden space-y-4">
                {rooms.map(room => (
                    <div key={room.id} className="bg-white p-4 rounded-lg space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-medium">房间 #{room.id}</span>
                            <span className={`px-2 py-1 rounded text-sm ${
                                room.status === 1
                                    ? 'bg-green-50 text-green-600'
                                    : 'bg-yellow-50 text-yellow-600'
                            }`}>
                                {room.status === 1 ? '已连接' : '等待加入'}
                            </span>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="text-sm text-gray-500">CDKey</div>
                            <div className="font-mono text-sm bg-gray-50 p-2 rounded break-all">
                                {room.cdkey.key}
                            </div>
                        </div>

                        <div className="text-sm text-gray-500">
                            创建时间: {formatDate(room.createdAt)}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button block type="primary" size="small" onClick={() => handleJoin(room.id)}>
                                加入
                            </Button>
                            {/*<Button block type="danger" size="small" onClick={() => handleDelete(room.id)}>*/}
                            {/*    删除*/}
                            {/*</Button>*/}
                        </div>
                    </div>
                ))}
            </div>

            {/* 加载和空状态 */}
            {loading && (
                <div className="py-8 text-center text-gray-500">加载中...</div>
            )}

            {!loading && rooms.length === 0 && (
                <div className="py-8 text-center text-gray-500">暂无房间</div>
            )}
        </div>
    )
}