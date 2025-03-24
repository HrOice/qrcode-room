'use client'

import { userApi, type User } from '@/lib/api/user'
import { Search } from '@react-vant/icons'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Button, Cell, Dialog, Form, Input, Loading } from 'react-vant'

export default function UserPage() {
    const [users, setUsers] = useState<User[]>([])
    const [keyword, setKeyword] = useState('')
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [createVisible, setCreateVisible] = useState(false)
    const [passwordVisible, setPasswordVisible] = useState(false)
    const [currentUserId, setCurrentUserId] = useState<number>(0)
    const [form] = Form.useForm();  // 添加表单实例
    const [passwordForm] = Form.useForm();  // 添加密码表单实例

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

    // 创建用户
    const handleCreate = useCallback(async (values: { username: string; password: string }) => {
        try {debugger
            await userApi.createUser(values)
            setCreateVisible(false)
            fetchUsers()
        } catch (error) {
            console.error('创建用户失败:', error)
            toast.error('创建失败')
        }
    }, [fetchUsers])

    // 修改密码
    const handlePasswordChange = useCallback(async (values: { password: string }) => {
        try {
            await userApi.updatePassword(currentUserId, values.password)
            setPasswordVisible(false)
        } catch (error) {
            console.error('修改密码失败:', error)
            toast.error('修改失败')
        }
    }, [currentUserId])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])   

    return (
        <div className="space-y-4">
            {/* 添加创建按钮 */}
            <div className="flex justify-between items-center bg-white p-4 rounded-lg">
                <div className="flex gap-2 flex-1">
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
                <Button type="primary" onClick={() => setCreateVisible(true)}>
                    创建用户
                </Button>
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
                                <div className="space-x-2">
                                    <Button
                                        size="small"
                                        type="primary"
                                        className='mr-3'
                                        onClick={() => {
                                            setCurrentUserId(user.id)
                                            setPasswordVisible(true)
                                        }}
                                    >
                                        修改密码
                                    </Button>
                                    <Button
                                        size="small"
                                        type={user.status ? 'danger' : 'primary'}
                                        onClick={() => toggleStatus(user.id, user.status)}
                                        loading={loading}
                                    >
                                        {user.status ? '禁用' : '启用'}
                                    </Button>
                                </div>
                            }
                        />
                    ))
                ) : (
                    <div className="py-12 text-center text-gray-500">
                        暂无用户数据
                    </div>
                )}
            </div>

            {/* 创建用户对话框 */}
            <Dialog
                visible={createVisible}
                title="创建用户"
                showCancelButton
                onCancel={() => {
                    setCreateVisible(false)
                    form.resetFields()  // 关闭时重置表单
                }}
                onConfirm={() => form.submit()}  // 点击确定时提交表单
            >
                <Form
                    form={form}
                    onFinish={handleCreate}
                    footer={false}
                >
                    <Form.Item
                        name="username"
                        label="用户名"
                        rules={[{ required: true, message: '请输入用户名' }]}
                    >
                        <Input placeholder="请输入用户名" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        label="密码"
                        rules={[{ required: true, message: '请输入密码' }]}
                    >
                        <Input type="password" placeholder="请输入密码" />
                    </Form.Item>
                </Form>
            </Dialog>

            {/* 修改密码对话框 */}
            <Dialog
                visible={passwordVisible}
                title="修改密码"
                showCancelButton
                onCancel={() => {
                    setPasswordVisible(false)
                    passwordForm.resetFields()  // 关闭时重置表单
                }}
                onConfirm={() => passwordForm.submit()}  // 点击确定时提交表单
            >
                <Form
                    form={passwordForm}
                    onFinish={handlePasswordChange}
                    footer={false}
                >
                    <Form.Item
                        name="password"
                        label="新密码"
                        rules={[{ required: true, message: '请输入新密码' }]}
                    >
                        <Input type="password" placeholder="请输入新密码" />
                    </Form.Item>
                </Form>
            </Dialog>

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