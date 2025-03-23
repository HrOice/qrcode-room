'use client'

import { userApi, type User } from '@/lib/api/user'
import { Search } from '@react-vant/icons'
import { useCallback, useEffect, useState } from 'react'
import { Button, Cell, Input, Loading } from 'react-vant'

export default function UserPage() {
    const [users, setUsers] = useState<User[]>([])
    const [keyword, setKeyword] = useState('')
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)

    // 使用 useCallback 包装 fetchUsers
    const fetchUsers = useCallback(async () => {
        setLoading(true)
        try {
            const { users } = await userApi.getUsers({
                page: currentPage,
                keyword
            })
            setUsers(users)
        } catch (error) {
            console.error('获取用户列表失败:', error)
        } finally {
            setLoading(false)
        }
    }, [currentPage, keyword]) // 添加所需的依赖

    // 切换用户状态
    const toggleStatus = useCallback(async (id: number, status: boolean) => {
        try {
            await userApi.updateStatus(id, !status)
            fetchUsers()
        } catch (error) {
            console.error('更新用户状态失败:', error)
        }
    }, [fetchUsers])

    // 搜索用户
    const handleSearch = useCallback(() => {
        setCurrentPage(1)
        fetchUsers()
    }, [fetchUsers])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])   

    return (
        <div className="space-y-4">
            {/* 搜索栏 */}
            <div className="flex gap-2">
                <Input
                    value={keyword}
                    onChange={setKeyword}
                    placeholder="搜索用户名"
                    clearable
                    prefix={<Search />}
                    className="flex-1"
                />
                <Button onClick={handleSearch} loading={loading}>搜索</Button>
            </div>

            {/* 用户列表 */}
            <div className="bg-white rounded-lg">
                {loading ? (
                    <div className="py-12 flex items-center justify-center">
                        <Loading type="spinner" color="#1989fa">加载中...</Loading>
                    </div>
                ) : users.length > 0 ? (
                    users.map(user => (
                        <Cell
                            key={user.id}
                            title={user.username}
                            label={`ID: ${user.id}`}
                            extra={
                                <Button
                                    size="small"
                                    type={user.status ? 'danger' : 'primary'}
                                    onClick={() => toggleStatus(user.id, user.status)}
                                    loading={loading}
                                >
                                    {user.status ? '禁用' : '启用'}
                                </Button>
                            }
                        />
                    ))
                ) : (
                    <div className="py-12 text-center text-gray-500">
                        暂无用户数据
                    </div>
                )}
            </div>

            {/* 分页 */}
            <div className="flex justify-between">
                <Button
                    disabled={currentPage === 1 || loading}
                    onClick={() => {
                        setCurrentPage(p => p - 1)
                        fetchUsers()
                    }}
                >
                    上一页
                </Button>
                <Button
                    disabled={users.length < 10 || loading}
                    onClick={() => {
                        setCurrentPage(p => p + 1)
                        fetchUsers()
                    }}
                >
                    下一页
                </Button>
            </div>
        </div>
    )
}