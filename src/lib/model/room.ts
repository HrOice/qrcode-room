export type Room = {
    id: number;
    cdKeyId: number;
    ip: string;
    createdAt: Date;
    lastActive: Date;
    status: number;
    adminId: number;
    socketId: string;
    adminSocketId: string;
}