export async function getClientIp(): Promise<string> {
    try {
        const response = await fetch('https://cip.cc/')
        const text = await response.text()

        // 解析第一行的 IP
        const ipMatch = text.match(/IP\s*:\s*([0-9.]+)/)
        if (ipMatch && ipMatch[1]) {
            return ipMatch[1]
        }

        throw new Error('IP 解析失败')
    } catch (error) {
        console.error('获取 IP 失败:', error)
        return '127.0.0.1'
    }
}