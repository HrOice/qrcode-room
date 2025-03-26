import toast from "react-hot-toast"

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('复制成功')
    return true
  } catch (err) {
    console.error('复制失败:', err)
    toast.success('复制失败')
    return false
  }
}