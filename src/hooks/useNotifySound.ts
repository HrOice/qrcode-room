import { useCallback, useEffect, useRef } from 'react'

export function useNotifySound(options = {
    volume: 0.5,
    soundUrl: '/sounds/sounds.mp3'
}) {
    const notifyAudioRef = useRef<HTMLAudioElement | null>(null)
    const isLoadedRef = useRef(false)

    // 初始化音频
    useEffect(() => {
        notifyAudioRef.current = new Audio(options.soundUrl)
        if (notifyAudioRef.current) {
            notifyAudioRef.current.volume = options.volume
            notifyAudioRef.current.preload = 'auto'
            
            // 监听加载完成事件
            notifyAudioRef.current.addEventListener('loadeddata', () => {
                isLoadedRef.current = true
            })
        }
    }, [options.soundUrl, options.volume])

    // 添加用户交互检测
    useEffect(() => {
        const handleInteraction = () => {
            // 只在未加载时执行一次
            if (notifyAudioRef.current && !isLoadedRef.current) {
                notifyAudioRef.current.load()
            }
        }

        // 只在未加载时添加监听器
        if (!isLoadedRef.current) {
            document.addEventListener('click', handleInteraction)
            document.addEventListener('touchstart', handleInteraction)
        }

        return () => {
            document.removeEventListener('click', handleInteraction)
            document.removeEventListener('touchstart', handleInteraction)
        }
    }, [])

    const playNotifySound = useCallback(() => {
        if (!notifyAudioRef.current || !isLoadedRef.current) return

        // 如果正在播放，先重置
        if (!notifyAudioRef.current.paused) {
            notifyAudioRef.current.currentTime = 0
            return
        }

        const playPromise = notifyAudioRef.current.play()

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    notifyAudioRef.current!.currentTime = 0
                })
                .catch(error => {
                    if (error.name === 'NotAllowedError') {
                        console.log('需要用户交互才能播放音频')
                    } else {
                        console.error('播放提示音失败:', error)
                    }
                })
        }
    }, [])

    return playNotifySound
}