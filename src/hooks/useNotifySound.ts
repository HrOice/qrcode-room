import { useCallback, useEffect, useRef } from 'react'

export function useNotifySound(options = {
    volume: 0.5,
    soundUrl: '/sounds/sounds.mp3'
}) {
    const notifyAudioRef = useRef<HTMLAudioElement | null>(null)

    // 初始化音频
    useEffect(() => {
        notifyAudioRef.current = new Audio(options.soundUrl)
        if (notifyAudioRef.current) {
            notifyAudioRef.current.volume = options.volume
            notifyAudioRef.current.preload = 'auto'
        }
    }, [options.soundUrl, options.volume])

    // 添加用户交互检测
    useEffect(() => {
        const handleInteraction = () => {
            if (notifyAudioRef.current) {
                notifyAudioRef.current.load()
            }
        }

        document.addEventListener('click', handleInteraction)
        document.addEventListener('touchstart', handleInteraction)

        return () => {
            document.removeEventListener('click', handleInteraction)
            document.removeEventListener('touchstart', handleInteraction)
        }
    }, [])

    const playNotifySound = useCallback(() => {
        if (!notifyAudioRef.current) return

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