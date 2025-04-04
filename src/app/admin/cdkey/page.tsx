'use client'

import { cdkeyApi, type CDKey } from '@/lib/api/cdkey'
import { copyToClipboard } from '@/lib/utils/clipboard'
import { Search } from '@react-vant/icons'
import { format } from 'date-fns'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Button, Cell, Input, Pagination, Popup } from 'react-vant'

export default function CDKeyPage() {
    const [cdkeys, setCDKeys] = useState<CDKey[]>([])
    const [keyword, setKeyword] = useState('')
    const [status, setStatus] = useState<number>()
    const [totalUse, setTotalUse] = useState<number>()
    const [loading, setLoading] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [showStatusPicker, setShowStatusPicker] = useState(false)
    const [totalItems, setTotalItems] = useState(0)
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [addForm, setAddForm] = useState({
        number: 1,      // 生成个数
        totalUse: 1,      // 可用次数
    })
    // 获取列表
    const fetchCDKeys = useCallback(async () => {
        setLoading(true)
        try {
            const { cdkeys, total } = await cdkeyApi.getCDKeys({
                page: currentPage,
                keyword,
                status,
                total: totalUse
            })
            setCDKeys(cdkeys)
            setTotalItems(total)
        } catch (error) {
            console.log(error)
            toast.error('加载失败')
        } finally {
            setLoading(false)
        }
    }, [currentPage, keyword, status, totalUse])


    // 搜索处理
    const handleSearch = () => {
        setCurrentPage(1)
        fetchCDKeys()
    }

    // 重置筛选
    const handleReset = () => {
        setKeyword('')
        setStatus(undefined)
        setTotalUse(undefined)
        setCurrentPage(1)
    }

    useEffect(() => {
        fetchCDKeys()
    }, [fetchCDKeys])

    // async function toggleStatus(id: number, status: number): void {
    //     await cdkeyApi.updateStatus(id, !status)
    //     await fetchCDKeys()
    // }

    return (
        <div className="space-y-4">
            {/* 筛选栏 */}
            <div className="flex flex-wrap gap-4 bg-white p-4 rounded-lg">
                <Input
                    value={keyword}
                    onChange={setKeyword}
                    placeholder="搜索CDKey"
                    prefix={<Search />}
                    className="!w-64"
                />
                {/*<Button onClick={() => setShowStatusPicker(true)}>*/}
                {/*    状态: {status === undefined ? '全部' : status ? '可用' : '禁用'}*/}
                {/*</Button>*/}
                <Input
                    value={totalUse === undefined ? '' : String(totalUse)}
                    onChange={(val) => {
                        const num = val === '' ? undefined : parseInt(val)
                        setTotalUse(num && !isNaN(num) ? num : undefined)
                    }}
                    type="number"
                    // min={1}
                    placeholder="使用次数"
                    className="!w-32"
                />
                <Button type="primary" onClick={handleSearch}>查询</Button>
                <Button onClick={handleReset}>重置</Button>
                <Button type="primary" onClick={() => setShowAddDialog(true)}>新增</Button>
            </div>

            {/* 列表区域 */}
            <div className="bg-white rounded-lg overflow-hidden">
                {/* 表头 */}
                <div className="grid lg:grid-cols-5 grid-cols-1 gap-4 px-4 py-3 bg-gray-50 text-gray-600 font-medium text-sm">
                    <div>CDKey</div>
                    <div className="lg:block hidden">使用次数</div>
                    {/*<div className="lg:block hidden">状态</div>*/}
                    <div className="lg:block hidden">创建时间</div>
                    <div className="lg:block hidden">操作</div>
                </div>

                {/* 列表项 */}
                <div className="divide-y divide-gray-100">
                    {cdkeys.map(cdkey => (
                        <Cell key={cdkey.id} className="!px-4 !py-3">
                            <div className="lg:grid lg:grid-cols-5 flex flex-col gap-4 w-full items-center">
                                {/* CDKey 显示 */}
                                <div className="w-full flex items-center gap-2">
                                    <span className="font-mono text-sm truncate">
                                        {cdkey.key}
                                    </span>
                                    <Button
                                        size="mini"
                                        onClick={async () => {
                                            const success = await copyToClipboard(cdkey.key)
                                            if (success) {
                                                toast.success('已复制到剪贴板')
                                            } else {
                                                toast.error('复制失败')
                                            }
                                        }}
                                    >
                                        复制
                                    </Button>
                                </div>
                                
                                {/* 在小屏幕下显示的信息 */}
                                <div className="lg:hidden w-full grid grid-cols-2 gap-2 text-sm text-gray-600">
                                    <div>使用次数: {cdkey.used}/{cdkey.total}</div>
                                    {/*<div>*/}
                                    {/*    状态: */}
                                    {/*    <span className={`ml-1 px-2 py-1 rounded ${*/}
                                    {/*        cdkey.status */}
                                    {/*            ? 'bg-green-50 text-green-600' */}
                                    {/*            : 'bg-red-50 text-red-600'*/}
                                    {/*    }`}>*/}
                                    {/*        {cdkey.status ? '可用' : '禁用'}*/}
                                    {/*    </span>*/}
                                    {/*</div>*/}
                                    <div>创建时间: {format(new Date(cdkey.createdAt), 'yyyy-MM-dd HH:mm')}</div>
                                </div>

                                {/* 在大屏幕下显示的信息 */}
                                <div className="hidden lg:block text-gray-600">
                                    {cdkey.used}/{cdkey.total}
                                </div>
                                <div className="hidden lg:block">
                                    <span className={`px-2 py-1 rounded text-sm ${
                                        cdkey.status 
                                            ? 'bg-green-50 text-green-600' 
                                            : 'bg-red-50 text-red-600'
                                    }`}>
                                        {cdkey.status ? '可用' : '禁用'}
                                    </span>
                                </div>
                                <div className="hidden lg:block text-gray-600 text-sm">
                                    {format(new Date(cdkey.createdAt), 'yyyy-MM-dd HH:mm')}
                                </div>
                                
                                {/* 操作按钮 */}
                                {/*<div className="w-full lg:w-auto flex lg:flex-col gap-2">*/}
                                {/*    <Button*/}
                                {/*        size="mini"*/}
                                {/*        type={cdkey.status ? 'danger' : 'primary'}*/}
                                {/*        onClick={() => toggleStatus(cdkey.id, cdkey.status)}*/}
                                {/*        className="flex-1 lg:flex-none"*/}
                                {/*    >*/}
                                {/*        {cdkey.status ? '禁用' : '启用'}*/}
                                {/*    </Button>*/}
                                {/*    <Button*/}
                                {/*        size="mini"*/}
                                {/*        onClick={() => router.push(`/admin/cdkey/records/${cdkey.id}`)}*/}
                                {/*        className="flex-1 lg:flex-none"*/}
                                {/*    >*/}
                                {/*        记录*/}
                                {/*    </Button>*/}
                                {/*</div>*/}
                            </div>
                        </Cell>
                    ))}
                </div>

                {/* 加载和空状态 */}
                {loading ? (
                    <div className="py-8 text-center text-gray-500">加载中...</div>
                ) : cdkeys.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">暂无数据</div>
                ) : null}
            </div>

            {/* 分页 */}
            <Pagination 
                value={currentPage} 
                onChange={(p) => {
                    setCurrentPage(p)
                }} 
                mode="simple" 
                totalItems={totalItems} 
                itemsPerPage={10} 
            />

            {/* 状态选择器 */}
            <Popup
                visible={showStatusPicker}
                onClose={() => setShowStatusPicker(false)}
                position="bottom"
            >
                <div className="p-4">
                    <div className="flex flex-col space-y-2">
                        <Button
                            onClick={() => {
                                setStatus(undefined)
                                setShowStatusPicker(false)
                            }}
                        >
                            全部
                        </Button>
                        <Button
                            onClick={() => {
                                setStatus(1)
                                setShowStatusPicker(false)

                            }}
                        >
                            可用
                        </Button>
                        <Button
                            onClick={() => {
                                setStatus(0)
                                setShowStatusPicker(false)
                            }}
                        >
                            禁用
                        </Button>
                    </div>
                </div>
            </Popup>

            {/* 新增对话框 */}
            <Popup
                visible={showAddDialog}
                onClose={() => setShowAddDialog(false)}
                position="bottom"
                style={{ height: 'auto' }}
            >
                <div className="p-4 space-y-4">
                    <div className="text-lg font-medium">新增 CDKey</div>

                    <div className="space-y-2">
                        <div className="text-sm text-gray-600">生成个数</div>
                        <Input
                            type="number"
                            value={String(addForm.number)}
                            onChange={(val) => {
                                const num = parseInt(val);
                                setAddForm(prev => ({
                                    ...prev,
                                    number: isNaN(num) ? 1 : Math.max(1, num)
                                }))
                            }}
                            // min={1}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="text-sm text-gray-600">可用次数</div>
                        <Input
                            type="number"
                            value={String(addForm.totalUse)}
                            onChange={(val) => {
                                const num = parseInt(val)
                                setAddForm(prev => ({
                                    ...prev,
                                    totalUse: isNaN(num) ? 1 : Math.max(1, num)
                                }))
                            }}
                            // min={1}
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button
                            block
                            onClick={() => setShowAddDialog(false)}
                        >
                            取消
                        </Button>
                        <Button
                            block
                            type="primary"
                            onClick={async () => {
                                try {
                                    await cdkeyApi.addCDKey(addForm)
                                    toast.success('创建成功')
                                    setShowAddDialog(false)
                                    fetchCDKeys()
                                } catch (error) {
                                    console.error(error)
                                    toast.error('创建失败')
                                }
                            }}
                        >
                            确认
                        </Button>
                    </div>
                </div>
            </Popup>
        </div>
    )
}