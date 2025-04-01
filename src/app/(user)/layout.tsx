import { Toaster } from "react-hot-toast"

export default function UserLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <main style={{
            width: '100%',
            // maxWidth: '600px',
            minHeight: '100dvh', // 动态高度
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            // justifyContent: 'center',
            // alignItems: 'center',
            padding: '2px',
            boxSizing: 'border-box'
        }}>
            {/* <h2>欢迎使用</h2> */}
            {children}
            <Toaster position="top-center" />
        </main>
        )
}