// 用于操作Room的

import { checkRoomOrCreate, deleteRooms, findAndDeleteRoom, updateAdminInfo } from '@/lib/service/RoomService';
import { Room } from "@prisma/client";

class RoomStatus {
    private clientLastActive: Date;
    private adminLastActive: Date;
    private activeTimeout: number;
    private _room : Room;

    constructor(room: Room, activeTimeout: number) {
        this.activeTimeout = activeTimeout;
        this._room = room;
        this.clientLastActive = new Date();
        this.adminLastActive = new Date();
    }

    get room() {
        return this._room;
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

    updateActive(socketId: string) : void {
        if (socketId == this._room.adminSocketId) {
            this.updateAdminActive();
        } else if (socketId === this._room.socketId) {
            this.updateClientActive()
        } else {
            throw new Error("无效的连接")
        }
    }

    // 检查是否在线
    isClientOnline(): boolean {
        const now = new Date();
        return now.getTime() - this.clientLastActive.getTime() <= this.activeTimeout;
    }

    isAdminOnline(): boolean {
        const now = new Date();
        return now.getTime() - this.adminLastActive.getTime() <= this.activeTimeout;
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
    private static insntance: RoomCache;
    private roomMap: Map<number, RoomStatus>;

    constructor() {
        this.roomMap = new Map<number, RoomStatus>();
    }

    public static getInstance(): RoomCache {
        if (!RoomCache.insntance) {
            RoomCache.insntance = new RoomCache();
        }
        return RoomCache.insntance;
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
            return room.isOnline()
        });
    } catch (error) {
        console.error('查找不活跃房间失败:', error);
        return [];
    }
}

export async function clientJoinRoom(ip: string, cdkeyId: number, socketId: string, timeout: number): Promise<Room> {
    try {
        const room = await checkRoomOrCreate(ip, cdkeyId, socketId);
        const rs = new RoomStatus(room, timeout)
        roomCache.setRoom(rs);
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

export async function heartBeat(roomId: number, socketId: string): Promise<Room | undefined> {
    try {
        const room = roomCache.getRoom(roomId);
        if (!room) {
            return;
        }
        room.updateActive(socketId)
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