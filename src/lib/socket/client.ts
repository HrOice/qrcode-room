/* eslint-disable @typescript-eslint/no-unused-vars */

import { io, Socket } from 'socket.io-client'
import { getClientIp } from '../utils/getClientIp'
import { SocketEmitter } from './socketUtil'

export class RoomSocket {
    private socket: Socket
    private heartbeatInterval: NodeJS.Timer | null = null
    private roomId: number | null = null
    private token: string
    private onDisconnected?: () => void

    constructor(token: string, onDisconnected?: () => void) {
        // 添加 auth 选项，socket.io-client 会自动携带 cookie
        this.token = token;
        this.onDisconnected = onDisconnected;
        this.socket = io({
            auth: {
                token
            }
        })
        this.setupListeners()
    }

    private setupListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to socket server')
        })

        this.socket.on('disconnect', () => {
            console.log("disconnected...")
            this.onDisconnected?.()
        })

        this.socket.on('connect_error', (error) => {
            if (error.message === 'unauthorized') {
                console.error('Authentication failed')
                // 可以在这里处理未授权的情况，比如跳转到登录页
                window.location.href = '/login'
            } else if (error.message === 'admin.unauthorized') {
                console.error('admin Authentication failed')
                // 可以在这里处理未授权的情况，比如跳转到登录页
                window.location.href = '/admin/login'
            } else {
                console.error('uncaught error', error)
                this.socket.disconnect()
                this.onDisconnected?.()
            }
        })

        this.socket.on('error', (error) => {
            console.error('Socket error:', error)
        })
    }

    // 用户加入房间
    async joinRoom(onAdminJoin: () => void,
        onAdminReady: (ready: boolean) => void,
        onAdminLeft: () => void,
        onJoinRoom: (roomId: number, adminReady: boolean, adminOnline: boolean, used: number, total: number) => void,
        onReceiveImg: (data: string, used: number) => void,
        onStatus: () => { ready: boolean },
        _onHeartBeat: (param: {roomId: number, ready: boolean, online: boolean}) => void
    ) {
        const ip = await getClientIp()
        console.log("joi room", ip)
        this.socket.on('admin-join', () => {
            // admin加入后，改变展示状态，显示准备
            onAdminJoin()
        })
        // admin准备
        this.socket.on('admin-ready', onAdminReady)
        // admin离开 
        this.socket.on('admin-left', () => {
            console.log('admin left ')
            onAdminLeft()
        })
        this.socket.on('admin-send', (data, used, cb) => {debugger
            onReceiveImg(data, used)
            cb()
        })
        this.socket.on('status', (cb) => {
            const status = onStatus()
            console.log('onStatus', status)
            cb(status)
        })
        // 加入房间
        this.socket.emit('join-room', { ip, key: this.token },
            (response: { roomId: number, ready: boolean, online: boolean, used: number, total: number }) => {
                const { roomId, ready, online, used, total } = response
                this.roomId = roomId
                onJoinRoom(this.roomId!, ready, online, used, total)
                console.log('user join room', roomId)
                this.startHeartbeat()
            })
    }

    // 管理员加入房间
    async adminJoin(roomId: number,
        onUserReady: (ready: boolean) => void,
        onUserLeft: () => void,
        onStatus: () => { ready: boolean },
        onJoinRoom: (roomId: number, clientReady: boolean, clientOnline: boolean) => void,
        _onHeartBeat: (param: {roomId: number, ready: boolean, online: boolean}) => void,
                    onUserJoin: () => void
    ) {

        this.socket.emit('admin-join', { roomId }, (response: { roomId: number, ready: boolean, online: boolean }) => {

            const { roomId, ready, online } = response
            this.roomId = roomId
            console.log('admin join room', response)
            onJoinRoom(this.roomId!, ready, online)
            this.startHeartbeat()
        })
        this.socket.on('user-join', onUserJoin)
        this.socket.on('user-ready', onUserReady)
        this.socket.on('user-left', onUserLeft)
        this.socket.on('status', (cb) => {
            const status = onStatus()
            cb(status)
        })
    }

    async adminReady(ready: boolean, onReady: (ready: boolean) => void) {
        this.socket.emit('admin-ready', ready, (response: boolean) => {
            onReady(response)
        })
    }

    async userReady(ready: boolean, onReady: (ready: boolean) => void) {
        this.socket.emit('user-ready', ready, (response: boolean) => {
            onReady(response)
        })
    }
    // type 0 图片，1文本
    async adminSend(data: string, onSuccess: (used: number) => void) {
        this.socket.emit('admin-send', data, (used: number) => {
            onSuccess(used)
        })
    }

    // 开始发送心跳包
    private startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval as NodeJS.Timeout)
        }

        this.heartbeatInterval = setInterval(() => {
            if (this.roomId) {
                SocketEmitter.getInstance(this.socket, 'heartbeat', { roomId: this.roomId }, 1, 3000, () => {
                    clearInterval(this.heartbeatInterval as NodeJS.Timeout)
                }).emit();
            }
        }, 4000)
    }



    // 离开房间
    adminLeaveRoom() {
        // console.log('admin-left', this.roomId)
        // if (this.roomId) {
        //     this.socket.emit('admin-left', { roomId: this.roomId }, () => {
        //         debugger;
        //     })
        //     this.roomId = null
        // }
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval as NodeJS.Timeout)
            this.heartbeatInterval = null
        }
    }

    clientLeaveRoom() {
        // if (this.roomId) {
        //
        //     this.socket.emit('user-left', { roomId: this.roomId })
        //     this.roomId = null
        // }
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval as NodeJS.Timeout)
            this.heartbeatInterval = null
        }
    }

    // 断开连接
    disconnect() {
        // this.leaveRoom()
        this.socket.disconnect()
    }

    clientDisconnect() {
        this.clientLeaveRoom()
        this.socket.disconnect()
    }

    adminDisconnect() {
        this.adminLeaveRoom()
        this.socket.disconnect()
    }
}