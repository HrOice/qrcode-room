import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { Button } from 'react-vant'

interface ConfirmDialogProps {
    open: boolean
    title: string
    content: string
    onConfirm: () => void
    onCancel: () => void
    confirmText?: string
    cancelText?: string
    confirmType?: 'default' | 'primary' | 'info' | 'warning' | 'danger'
}

export default function ConfirmDialog({
    open,
    title,
    content,
    onConfirm,
    onCancel,
    confirmText = '确定',
    cancelText = '取消',
    confirmType = 'primary'
}: ConfirmDialogProps) {
    return (
        <Dialog 
            open={open} 
            as="div" 
            className="relative z-10 focus:outline-none" 
            onClose={onCancel}
        >
            <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                    <DialogPanel
                        transition
                        className="w-full max-w-md rounded-xl bg-gray-500 p-6"
                    >
                        <DialogTitle as="h3" className="text-base/7 font-medium text-white">
                            {title}
                        </DialogTitle>
                        <p className="mt-2 text-sm/6 text-white/50">
                            {content}
                        </p>
                        <div className="mt-4 flex w-full flex-row-reverse">
                            <Button
                                type={confirmType}
                                className='flex-1 mx-1'
                                onClick={onConfirm}
                            >
                                {confirmText}
                            </Button>
                            <div className='w-2'></div>
                            <Button
                                className='flex-1 mx-1.5'
                                onClick={onCancel}
                            >
                                {cancelText}
                            </Button>
                        </div>
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    )
}