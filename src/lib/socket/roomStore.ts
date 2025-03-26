// 用于操作Room的

import { checkRoomOrCreate, deleteRooms, findAndDeleteRoom, senderCheckRoomOrCreate, updateAdminInfo, updateReceiverInfo } from '@/lib/service/RoomService';
import { Room } from "@prisma/client";
import { Socket } from 'socket.io';
import { invalidCDKey } from '../service/CDkeyService';

class RoomStatus {
    private clientLastActive: Date;
    private adminLastActive: Date;
    private activeTimeout: number;
    private _room : Room;
    private socketId?: string;
    private adminSocketId?: string
    private _roomCreatedAt?: Date; // 发送者加入的时间，如果超过半小时，触发房间失效，删除room，cdkey改成0
    private _socket?: Socket;
    private _adminSocket?: Socket;

    constructor(room: Room, activeTimeout: number, adminSocket?:Socket, socket?:Socket) {
        this.activeTimeout = activeTimeout;
        this._room = room;
        this.clientLastActive = new Date();
        this.adminLastActive = new Date('2000-01-01');
        this._socket = socket
        this._adminSocket = adminSocket
    }

    get socket() :Socket | undefined  {
        return this._socket;
    }

    get adminSocket(): Socket | undefined {
        return this._adminSocket
    }

    set socket(socket: Socket) {
        this._socket = socket
    }

    set adminSocket(adminSocket: Socket) {
        this._adminSocket = adminSocket
    }

    resetSocket() {
        this._adminSocket = undefined
        this._socket = undefined
    }

    setRoomCreatedAt() {
        if (this._roomCreatedAt) {
            // 异常情况断开连接不处理
        } else {
            this._roomCreatedAt = new Date()
        }
    }

    resetRoomCreatedAt() {
        // 发送成功反馈后重置
        this._roomCreatedAt = undefined
    }

    checkRoomExpired(timeout: number) {
        if (this._roomCreatedAt) {
            const now = new Date();
            return now.getTime() - this._roomCreatedAt.getTime() > timeout;
        } else {
            return false
        }
    }

    get roomCreatedAt() {
        return this._roomCreatedAt
    }

    get room() {
        return this._room;
    }

    setAdminSocketId(socketId?: string) {
        this.adminSocketId = socketId;
    }

    getAdminSocketId() {
        return this.adminSocketId;
    }

    setSocketId(socketId?: string) {
        this.socketId = socketId;
    }
    getSocketId() {
        return this.socketId;
    }

    validAdminSocketId(socketId: string) {
        if (!this.adminSocketId) {
            this.setAdminSocketId(socketId);
            return true;
        }
        if (this.adminSocketId !== socketId) {
            return false;
        }
    }

    cancelAdminSocketId(socketId: string) {
        if  (!this.adminSocketId) {
            return;
        }
        if (this.adminSocketId === socketId) {
            this.setAdminSocketId(undefined)
            this._adminSocket = undefined
        }
    }


    cancelSocketId(socketId: string) {
        if  (!this.socketId) {
            return;
        }
        if (this.socketId === socketId) {
            this.setSocketId(undefined)
            this._socket = undefined
        }
    }

    validSocketId(socketId: string) {
        if (!this.socketId) {
            this.setSocketId(socketId);
            return true;
        }
        if (this.socketId !== socketId) {
            return false;
        }
    }

    updateRoom(room: Room) {
        this._room = room
    }

    // 更新最后活跃时间
    updateClientActive(): void {
        this.clientLastActive = new Date();
    }

    updateAdminActive(): void {
        this.adminLastActive = new Date();
    }

    updateActive(role: string) : void {
        // console.log('updateActive', role, this.adminLastActive, this.clientLastActive)
        if (role === 'admin') {
            this.updateAdminActive();
        } else if (role === 'client') {
            this.updateClientActive()
        } else {
            throw new Error("无效的连接")
        }
    }

    // 检查是否在线
    isClientOnline(): boolean {
        const now = new Date();
        const r = !!this.socketId && (now.getTime() - this.clientLastActive.getTime() <= this.activeTimeout);
        console.log('isClientOnline', r, this.socketId, now, this.clientLastActive)
        return r;
    }

    isAdminOnline(): boolean {
        const now = new Date();
        const r = !!this.adminSocketId && (now.getTime() - this.adminLastActive.getTime() <= this.activeTimeout);
        console.log('isAdminOnline', r, this.adminSocketId, now, this.adminLastActive)
        return r;
    }

    isOnline(): boolean {
        return this.isClientOnline() || this.isAdminOnline();
    }

    // 获取最后活跃时间
    getClientLastActive(): Date {
        return this.clientLastActive;
    }

    getAdminLastActive(): Date {
        return this.adminLastActive;
    }
}

class RoomCache {
    private static instance: RoomCache;
    private roomMap: Map<number, RoomStatus>;

    constructor() {
        console.log('init roomCache...')
        this.roomMap = new Map<number, RoomStatus>();
    }

    public static getInstance(): RoomCache {
        if (!RoomCache.instance) {
            RoomCache.instance = new RoomCache();
        }
        return RoomCache.instance;
    }

    getRooms(): RoomStatus[] {
        return Array.from(this.roomMap.values());
    }

    setRoom(room: RoomStatus): void {
        this.roomMap.set(room.room.id, room);
    }

    deleleRoom(id: number): void {
        this.roomMap.delete(id);
    }

    getRoom(id: number): RoomStatus | undefined {
        return this.roomMap.get(id);
    }

    contains(id: number): boolean {
        return this.roomMap.has(id);
    }

    getRoomIds(): number[] {
        return Array.from(this.roomMap.keys());
    }
}
export const roomCache = RoomCache.getInstance();

export async function getRoom(id: number) {
    try {
        const rs = roomCache.getRoom(id);
        if (!rs) {
            throw new Error("room.not.exist")
        }
        return rs;
    } catch (error){
        console.error('查询房间失败哦:',id, error);
        throw error;
    }
}
/**
 * 删除房间
 * @param ids 要删除的房间ID数组
 */
export async function deleteRoom(ids: number[]): Promise<void> {
    try {
        // 先删除数据库中的记录
        await deleteRooms(ids);
        // 再删除内存中的记录
        ids.forEach((id) => {
            roomCache.deleleRoom(id);
        });
    } catch (error) {
        console.error('删除房间失败:', error);
        throw error;
    }
}

export async function findInactiveRoom(): Promise<RoomStatus[]> {
    try {
        // 查询超时的返回并删除
        return roomCache.getRooms().filter((room) => {
            return !room.isOnline()
        });
    } catch (error) {
        console.error('查找不活跃房间失败:', error);
        return [];
    }
}

export async function findExpiredRoom(timeout: number) {
    try {
        // 查询超时的返回并删除
        return roomCache.getRooms().filter((room) => {
            return room.checkRoomExpired(timeout)
        });
    } catch (error) {
        console.error('查找过期房间失败:', error);
        return [];
    }
}

/**
 * 用户作为发送方，创建房间
 * @param ip 
 * @param cdkeyId 
 * @param adminSocketId 
 * @param adminId 
 * @param timeout 
 * @returns 
 */
export async function adminJoinCreateRoom(roomId: number, 
    ip: string = '127.0.0.1', cdkeyId: number, 
    adminSocketId: string, adminId: number, 
    timeout: number, socket:Socket) {
    try {
        const room = await senderCheckRoomOrCreate(roomId, ip, cdkeyId, adminSocketId);
        let rs = null;
        if (!roomCache.contains(room.id)) {
            rs = new RoomStatus(room, timeout, socket)
            roomCache.setRoom(rs);
            if (!rs.roomCreatedAt) {
                rs!.setRoomCreatedAt()
                rs.updateAdminActive()
            }
        } else {
            rs = roomCache.getRoom(room.id)
            rs!.updateAdminActive()
            rs!.setRoomCreatedAt()
        }

        return room;
    } catch (error) {
        console.error('user 加入房间失败:', error);
        throw error;
    }
}

export async function receiverJoinRoom(roomId: number, socketId: string, socket:Socket) {
    try {
        const rs = roomCache.getRoom(roomId)
        if (!rs) {
            throw new Error('房间不存在');
        }
        rs.socket = socket
        // 先更新admin信息
        const room = await updateReceiverInfo(roomId, socketId);
        console.log('receiver join', room)
        rs.updateRoom(room);
        rs.updateClientActive()
        if (!room) {
            // 不存在
            throw new Error('房间不存在');
        }
        return room;
    } catch (error) {
        console.error('管理员加入房间失败:', error);
        throw error;
    }
}

export async function clientJoinRoom(ip: string, cdkeyId: number, socketId: string, timeout: number, socket:Socket): Promise<Room> {
    try {
        const room = await checkRoomOrCreate(ip, cdkeyId, socketId);
        let rs = null;
        if (!roomCache.contains(room.id)) {
            rs = new RoomStatus(room, timeout, undefined, socket)
            roomCache.setRoom(rs);
        } else {
            rs = roomCache.getRoom(room.id)
            rs!.updateClientActive()
        }

        return room;
    } catch (error) {
        console.error('客户端加入房间失败:', error);
        throw error;
    }
}

export async function clientLeaveRoom(roomId: number): Promise<Room | undefined> {
    try {
        const room = await findAndDeleteRoom(roomId);
        if (room) {
            roomCache.deleleRoom(roomId);
        }
        return room;
    } catch (error) {
        console.error('客户端离开房间失败:', error);
        throw error;
    }
}

export async function heartBeat(roomId: number, socketId: string, role: string): Promise<Room | undefined> {
    try {
        const room = roomCache.getRoom(roomId);
        if (!room) {
            return;
        }
        // console.log('updateActive', roomId, role, socketId)
        room.updateActive(role)
        return room.room;
    } catch (error) {
        console.error('心跳更新失败:', error);
        throw error;
    }
}

/**
 * admin进入房间
 * @param roomId 房间ID
 * @param adminId 管理员ID
 * @param socketId Socket连接ID
 */
export async function adminJoinRoom(roomId: number, adminId: number, socketId: string): Promise<Room> {
    try {
        const rs = roomCache.getRoom(roomId)
        if (!rs) {
            throw new Error('房间不存在');
        }
        // 先更新admin信息
        const room = await updateAdminInfo(roomId, adminId, socketId);
        console.log('admin join', room)
        rs.updateRoom(room);
        rs.updateAdminActive()
        if (!room) {
            // 不存在
            throw new Error('房间不存在');
        }
        return room;
    } catch (error) {
        console.error('管理员加入房间失败:', error);
        throw error;
    }
}

export async function triggerExpiredRooms(timeout:number, onExpired:(socket: Socket) => void) {
    const expiredRooms = await findExpiredRoom(timeout)
    const rIds = expiredRooms.map((r) => r.room.id);
    console.log('find expired room:', rIds.length, rIds);
    expiredRooms.forEach((room) => {
        roomCache.deleleRoom(room.room.id);
        if (room.socket) {
            onExpired(room.socket)
        }
        if (room.adminSocket) {
            onExpired(room.adminSocket)
        }
    })
    deleteRoom(rIds)
    invalidCDKey(rIds)
}