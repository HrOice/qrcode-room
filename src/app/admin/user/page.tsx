'use client'

import { userApi, type User } from '@/lib/api/user'
import { Search } from '@react-vant/icons'
import { useEffect, useState } from 'react'
import { Button, Cell, Input } from 'react-vant'

export default function UserPage() {
    const [users, setUsers] = useState<User[]>([])
    const [keyword, setKeyword] = useState('')
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)

    // 获取用户列表
    const fetchUsers = async () => {
        setLoading(true)
        const { users } = await userApi.getUsers({
            page: currentPage,
            keyword
        })
        setUsers(users)
        setLoading(false)
    }

    // 切换用户状态
    const toggleStatus = async (id: number, status: boolean) => {
        await userApi.updateStatus(id, !status)
        fetchUsers()
    }

    // 搜索用户
    const handleSearch = () => {
        setCurrentPage(1)
        fetchUsers()
    }

    useEffect(() => {
        fetchUsers()
    }, [currentPage])   

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
                <Button onClick={handleSearch}>搜索</Button>
            </div>

            {/* 用户列表 */}
            <div className="bg-white rounded-lg">
                {users.map(user => (
                    <Cell
                        key={user.id}
                        title={user.username}
                        label={`ID: ${user.id}`}
                        extra={
                            <Button
                                size="small"
                                type={user.status ? 'danger' : 'primary'}
                                onClick={() => toggleStatus(user.id, user.status)}
                            >
                                {user.status ? '禁用' : '启用'}
                            </Button>
                        }
                    />
                ))}
            </div>

            {/* 分页 */}
            <div className="flex justify-between">
                <Button
                    disabled={currentPage === 1}
                    onClick={() => {
                        setCurrentPage(p => p - 1)
                        fetchUsers()
                    }}
                >
                    上一页
                </Button>
                <Button
                    disabled={users.length < 10}
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