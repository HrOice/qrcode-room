import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale'; // 添加中文本地化支持
export const formatDate = (dateString: string) => {
    try {
        // 使用 parseISO 解析 ISO 日期字符串
        const date = parseISO(dateString)
        // 添加 locale 参数确保服务器端和客户端使用相同的格式
        return format(date, 'yyyy-MM-dd HH:mm', {
            locale: zhCN
        })
    } catch (error) {
        console.error('日期格式化错误:', error)
        return dateString
    }
}