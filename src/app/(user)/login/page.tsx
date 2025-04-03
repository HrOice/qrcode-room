'use client'

import { clientApi } from '@/lib/api/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button, Form, Input } from 'react-vant'

type FieldType = {
    password?: string
}

export default function Login() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [form] = Form.useForm()

    const handleSubmit = async (values: FieldType) => {
        setLoading(true)
        try {
            const {data} = await clientApi.validCDKey(values.password!)
            router.replace(`/waiting?key=${data.key}`)
        } finally {
            setLoading(false)
        }
    }
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center mb-6">登录验证</h2>
                <Form
                    form={form}
                    onFinish={handleSubmit}
                    layout="horizontal"
                    footer={
                        <Button
                            block
                            type="primary"
                            size="large"
                            loading={loading}
                            onClick={() => form.submit()}
                        >
                            验证
                        </Button>
                    }
                >
                    <Form.Item
                        label="卡密"
                        name="password"
                        rules={[{ required: true, message: '请输入卡密' }]}
                    >
                        <Input
                            placeholder="请输入卡密"
                            clearable
                        />
                    </Form.Item>
                </Form>
            </div>
        </div>
    )
}