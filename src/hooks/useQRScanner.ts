import { useCallback, useRef, useState } from 'react'
import jsQR from 'jsqr'
import toast from 'react-hot-toast'

interface UseQRScannerOptions {
  onSuccess?: (text: string) => void
}

export function useQRScanner({ onSuccess }: UseQRScannerOptions = {}) {
  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const scanQRCode = useCallback(() => {
    if (!videoRef.current || !videoRef.current.videoWidth) return

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return

    const { videoWidth, videoHeight } = videoRef.current
    canvas.width = videoWidth
    canvas.height = videoHeight

    context.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight)
    const imageData = context.getImageData(0, 0, videoWidth, videoHeight)

    try {
      const code = jsQR(
        imageData.data,
        imageData.width,
        imageData.height,
        {
          inversionAttempts: "dontInvert",
        }
      )

      if (code && code.data && code.data.trim()) {
        onSuccess?.(code.data)
        stopCamera()
      }
    } catch (error) {
      console.error('扫描二维码出错:', error)
    }
  }, [onSuccess])

  const startScanning = useCallback(() => {
    const interval = setInterval(scanQRCode, 200)
    scanIntervalRef.current = interval
  }, [scanQRCode])

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setShowCamera(false)
  }, [])

  const startCamera = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error('您的浏览器不支持访问相机')
        return
      }
      setShowCamera(true)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })

      if (!videoRef.current) {
        console.error('video 元素未找到')
        setShowCamera(false)
        return
      }

      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play()
          .catch(error => {
            console.error('视频播放失败:', error)
            toast.error('相机启动失败，请重试')
            setShowCamera(false)
          })
      }
      
      streamRef.current = stream
      toast.success('相机已启动')
      startScanning()
    } catch (err) {
      console.error('相机启动失败:', err)
      let errorMessage = '无法访问相机'
      setShowCamera(false)

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = '请允许访问相机权限'
        } else if (err.name === 'NotFoundError') {
          errorMessage = '未找到可用的相机设备'
        } else if (err.name === 'NotReadableError') {
          errorMessage = '相机设备被占用'
        }
      }

      toast.error(errorMessage)
    }
  }, [startScanning])

  return {
    showCamera,
    videoRef,
    startCamera,
    stopCamera,
  }
}