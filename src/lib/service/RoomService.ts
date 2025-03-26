
import { subMinutes } from "date-fns";
import prisma from "../db";

// 维护ip的房间状态

/**
 * 获取所有房间
 */
export async function getRooms() {
    const rooms = await prisma.room.findMany({
        include: {
            cdkey: true
        }
    });
    return rooms;
}
/**
 * 批量删除房间
 * @param ids 
 */
export async function deleteRooms(ids:number[]) {
    if (ids.length === 0) {
        return;
    }
    // 删除room
    await prisma.room.deleteMany({
        where: {
            id: {
                in: ids,
            }
        }
    })
}

export async function findInactiveRooms(timeout: Date) {
    const inactiveRooms = await prisma.room.findMany({
        where: {
            lastActive: {
                lt: timeout
            },
            status: {
                not: 0
            }
        }
    })
    return inactiveRooms
}

/**
 * 根据客户端ip，cdKey创建一个房间 
 */
export async function createRoom(ip: string, cdkeyId: number) {
    const room = await prisma.room.create({
        data: {
            ip,
            cdkeyId,
            lastActive: new Date()
        }
    });
    return room;
}

/**
 * 批量更新房间的lastActive时间
 */
export async function updateRoomLastActive(roomIds: number[]) {
    await prisma.room.updateMany({
        where: {
            id: {
                in: roomIds
            }
        },
        data: {
            lastActive: new Date()
        }
    })
}

export async function updateAdminInfo(roomId: number, adminId: number, socketId: string) {
    const room = await prisma.room.update({
        where: { id: roomId },
        data: {
            adminId,
            adminSocketId: socketId,
            status: 1
        }
    })
    return room;
}

export async function updateReceiverInfo(roomId: number, socketId: string) {
    const room = await prisma.room.update({
        where: { id: roomId },
        data: {
            socketId,
            status: 0
        }
    })
    return room;
}

export async function findAndDeleteRoom(roomId: number) {
    const room = await prisma.room.findUnique({
        where: { id: roomId }
    })
    if (!room) {
        return;
    }
    await prisma.room.delete({
        where: { id: roomId }
    })
    return room;
}

/**
 * 
 * @param ip 检查房间是否存在，不存在则创建，存在则更新socketId用于断线重连
 * @param cdkeyId 
 * @param socketId 
 */
export async function checkRoomOrCreate(ip: string, cdkeyId: number, socketId: string) {
    let room = await prisma.room.findFirst({
        where: { ip, cdkeyId }
    })
    console.log('find room', room)

    if (!room) {
        console.log('room not exist ', ip, cdkeyId, socketId)
        room = await prisma.room.create({
            data: {
                ip,
                cdkeyId,
                lastActive: new Date(),
                socketId
            }
        })
    } else {
        console.log('room exist ', ip, cdkeyId, socketId, room.id)
        room = await prisma.room.update({
            where: { id: room.id },
            data: {
                lastActive: new Date(),
                socketId
            }
        })
    }
    return room;
}

export async function senderCheckRoomOrCreate(id: number, ip: string, cdkeyId: number, adminSocketId: string) {
    let room = await prisma.room.findUnique({
        where: { id }
    })
    console.log('find room', room)

    if (!room) {
        console.log('room not exist ', ip, cdkeyId, adminSocketId)
        room = await prisma.room.create({
            data: {
                id,
                ip,
                cdkeyId,
                lastActive: new Date(),
                adminSocketId,
            }
        })
    } else {
        console.log('room exist ', ip, cdkeyId, adminSocketId, room.id)
        room = await prisma.room.update({
            where: { id: room.id },
            data: {
                lastActive: new Date(),
                adminSocketId,
            }
        })
    }
    return room;
}


/**
 * 根据id查询room
 */
export async function findRoom(id: number) {
    return await prisma.room.findUnique({
        where: {id},
        include: {cdkey: true}
    })
}

export async function cleanUnactiveRoom(activeRooms: number[]) {
    return await prisma.room.deleteMany({
        where: {
            id: {
                notIn: activeRooms
            },
            createdAt: {
                lt: subMinutes(new Date(), 10)
            }
        }
    })
}