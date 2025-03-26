import QRCode from 'qrcode'

interface QROptions {
  width?: number
  margin?: number
  darkColor?: string
  lightColor?: string
  centerText?: string
}

// 生成二维码的工具函数
export async function generateQR(text: string, options: QROptions = {}) {
  const {
    width = 400,
    margin = 1,
    darkColor = '#000000',
    lightColor = '#ffffff'
  } = options

  try {
    return await QRCode.toDataURL(text, {
      width,
      margin,
      color: {
        dark: darkColor,
        light: lightColor
      }
    })
  } catch (error) {
    console.error('生成二维码失败:', error)
    throw error
  }
}

// 生成带有中心文本的二维码
export async function generateQRWithText(text: string, options: QROptions = {}) {
  const {
    width = 400,
    margin = 1,
    darkColor = '#000000',
    lightColor = '#ffffff',
    centerText
  } = options

  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('无法创建 canvas context')
    }

    canvas.width = width
    canvas.height = width

    // 生成二维码
    await QRCode.toCanvas(canvas, text, {
      width,
      margin,
      color: {
        dark: darkColor,
        light: lightColor
      }
    })

    // 如果有中心文本，添加文本
    if (centerText) {
      ctx.fillStyle = lightColor
      ctx.fillRect(150, 150, 100, 100)

      ctx.font = 'bold 30px Arial'
      ctx.fillStyle = darkColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(centerText, 200, 200)
    }

    return canvas.toDataURL()
  } catch (error) {
    console.error('生成二维码失败:', error)
    throw error
  }
}