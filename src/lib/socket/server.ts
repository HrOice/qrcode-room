/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server, Socket } from 'socket.io';
import { useCDKey, validCDKey } from '../service/CDkeyService';
import { cleanUnactiveRoom } from '../service/RoomService';

import { adminJoinCreateRoom, adminJoinRoom, clientJoinRoom, clientLeaveRoom, deleteRoom, findInactiveRoom, getRoom, heartBeat, receiverJoinRoom, roomCache } from './roomStore';
interface StatusResponse {
  online: boolean;
  ready: boolean;
}
export async function checkStatus(
  socket: Socket, 
  roomId: number,
  isOnline: () => boolean,
  timeout: number = 1000
): Promise<StatusResponse> {
  try {
    const status = await Promise.race([
      new Promise<boolean>((resolve, reject) => {
        socket.to(String(roomId)).timeout(timeout).emit('status', (err: any, args: any) => {
          if (err) {
            reject(new Error('Status check timeout'));
            return;
          }
          // args[0] 是实际的响应数据
          const response = args[0];
          resolve(response?.ready || false);
        });
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Status check timeout')), timeout)
      )
    ]);

    console.log('check status result:', status, isOnline());
    return {
      online: isOnline(),
      ready: !!status
    };
  } catch (error) {
    console.error('Status check failed:', error);
    return {
      online: false,
      ready: false
    };
  }
}


export function createSocketServer(server: any) {
  const io = new Server(server)

  // 添加身份验证中间件
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token
    const roomId = socket.handshake.auth.roomId
    if (!token) {
      return next(new Error('unauthorized'))
    }

    try {
      if (token === 'student') {
        // 将用户信息添加到请求头中
        socket.data.adminId = -1
        socket.data.role = 'client'
        socket.data.roomId = roomId
      } else {
        // 验证 valid_key
        const { id, key, valid, used, total } = await validCDKey(token);

        if (!valid) {
          return next(new Error('unauthorized'))
        }

        // 将验证信息保存到 socket 实例中
        socket.data.record = { id, key }
        socket.data.role = 'admin'
        socket.data.keyId = id
        socket.data.key = key
        socket.data.used = used
        socket.data.total = total
      }
      next()
    } catch (error) {
      console.error('Auth error:', error)
      next(new Error('unauthorized'))
    }
  })
  // 心跳检查间隔
  const HEARTBEAT_INTERVAL = 10000
  // 断线超时时间
  const TIMEOUT_MS = 60000

  // 检查断线的房间
  setInterval(async () => {
    const inactiveRooms = await findInactiveRoom()
    console.log('inactiveRooms, ', inactiveRooms);
    await deleteRoom(inactiveRooms.map(r=>r.room.id))

    // 查询剩余房间，清理数据库不存在的房间
    const activeRooms = await roomCache.getRooms();
    const activeIds = activeRooms.map(t=>t.room.id)
    cleanUnactiveRoom(activeIds)
  }, HEARTBEAT_INTERVAL)

  io.on('connection', (socket) => {
    console.log('Client connected with record:', socket.data)

    async function checkAdminStatus() {
      const roomId = socket.data.roomId;
      const room = await getRoom(roomId);
      
      if (!room) {
        throw new Error('Room not found');
      }
      
      return checkStatus(socket, roomId, () => room.isAdminOnline());
    }
    
    async function checkClientStatus() {
      const roomId = socket.data.roomId;
      const room = await getRoom(roomId);
      
      if (!room) {
        throw new Error('Room not found');
      }
    
      return checkStatus(socket, roomId, () => room.isClientOnline());
    }

    // 发送方创建房间
    socket.on('sender-join', async ({ip}, cb) => {
      console.log('sender-join', socket.data, ip)
      const cdkeyId = socket.data.keyId;
      socket.data.ip = ip

      try {
        const room = await adminJoinCreateRoom(ip, cdkeyId, socket.id,-1, TIMEOUT_MS)
        socket.data.roomId = room.id
        socket.join(String(room.id))
        console.log('sender-join cb', room.id, cb)
        socket.to(String(room.id)).emit('sender-join', {roomId: room.id})
        // 要检查admin的状态，是否在线，是否准备
        const clientStatus = await checkClientStatus()
        cb({roomId: room.id, ...clientStatus, used: socket.data.used, total: socket.data.total})
      } catch (error) {
        console.error(error)
        socket.emit('error', { message: 'sender加入房间失败' })
      }
    })

    // 接收方创建房间
    // 管理员加入房间
    socket.on('receiver-join', async ({ roomId },cb) => {
      try {

        socket.data.roomId = roomId
        console.log('receiver-join', roomId);
        const {cdkeyId, ip} = await receiverJoinRoom(roomId, socket.id);
        socket.data.keyId = cdkeyId
        socket.data.senderIp = ip

        socket.join(String(roomId))
        socket.to(String(roomId)).emit('receiver-join', {roomId})
        const adminStatus = await checkAdminStatus()
        console.log('receiver-join', roomId, adminStatus);
        cb({roomId: roomId, ...adminStatus})
      } catch (error) {
        console.error(error)
        socket.emit('error', { message: 'receiver加入房间失败' })
      }
    })

    // 用户创建/重连房间
    socket.on('join-room', async ({ ip }, cb) => {
      console.log('join-room:', socket.data, ip)
      const id = socket.data.keyId;
      socket.data.ip = ip
      // const existRoom = RoomMap.get(id);

      try {
        const room = await clientJoinRoom(ip, id, socket.id, TIMEOUT_MS)
        socket.data.roomId = room.id
        socket.join(String(room.id))
        console.log('join-room cb', room.id, cb)
        socket.to(String(room.id)).emit('user-join', {roomId: room.id})
        // 要检查admin的状态，是否在线，是否准备
        const adminStatus = await checkAdminStatus()
        cb({roomId: room.id, ...adminStatus, used: socket.data.used, total: socket.data.total})
      } catch (error) {
        console.error(error)
        socket.emit('error', { message: '加入房间失败' })
      }
    })

    // 管理员加入房间
    socket.on('admin-join', async ({ roomId },cb) => {
      try {
        const adminId = socket.data.adminId;

        socket.data.roomId = roomId
        console.log('admin-join', adminId, roomId);
        const {cdkeyId, ip} = await adminJoinRoom(roomId, adminId, socket.id);
        socket.data.keyId = cdkeyId
        socket.data.clientIp = ip

        socket.join(String(roomId))
        socket.to(String(roomId)).emit('admin-join', {roomId, adminId})
        const clientStatus = await checkClientStatus()
        console.log('admin-join', adminId, roomId, clientStatus);
        cb({roomId: roomId, ...clientStatus})
      } catch (error) {
        console.error(error)
        socket.emit('error', { message: '加入房间失败' })
      }
    })

    socket.on('user-ready', async (ready, cb) => {
      const roomId = socket.data.roomId
      console.log('user-ready', ready)
      socket.to(String(roomId)).emit('user-ready', ready)
      cb(ready)
    })

    socket.on('admin-ready', async (ready, cb) => {
      const roomId = socket.data.roomId
      console.log('admin-ready', ready)
      socket.to(String(roomId)).emit('admin-ready', ready)
      cb(ready)
    })

    socket.on('user-left', async () => {
      const roomId = socket.data.roomId
      socket.to(String(roomId)).emit('user-left')
    })

    socket.on('admin-left', async (ready) => {
      const roomId = socket.data.roomId
      socket.to(String(roomId)).emit('admin-left', ready)
    })
    socket.on('admin-send', async (data, cb) => {
      const roomId = socket.data.roomId
      // 先验证
      const {valid, used} = await validCDKey(socket.data.key, socket.data.keyId)
      if (!valid) {
        cb(-1)
        return;
      }
      socket.to(String(roomId)).emit('admin-send', data, used! + 1, async () => {
        // 发送成功减次数
        console.log('send success........', roomId, cb);
        const used = await useCDKey(socket.data.keyId, socket.data.ip, socket.data.adminId)
        cb(used)
      })
    })

    // 心跳包
    socket.on('heartbeat', async ({ roomId }, cb) => {
      try {
        // roomId
        console.log('heartbeat:', roomId, socket.id, new Date())
        await heartBeat(roomId, socket.id, socket.data.role)
        cb(true)
      } catch (error) {
        console.error('Heartbeat error:', error)
      }
    })

    // 用户主动离开
    socket.on('user-left', async ({ roomId }) => {
      try {
        console.log('user user-left, ', roomId);
        const room = await clientLeaveRoom(roomId);

        if (room?.adminSocketId) {
          io.to(room.adminSocketId).emit('user-left', { roomId })
        }

        socket.leave(String(roomId))
      } catch (error) {
        console.error(error)
        socket.emit('error', { message: '离开房间失败' })
      }
    })

    socket.on('admin-left', async () => {
      try {
        const roomId = socket.data.roomId;
        console.log('admin admin-left, ', roomId);
        socket.to(String(roomId)).emit('admin-left', {}, () => {
          socket.leave(String(roomId))
          socket.disconnect()
        })
      } catch (error) {
        console.error(error)
        socket.emit('error', { message: 'admin离开房间失败' })
      }
    })

    // 断开连接
    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      console.log('Client disconnected:', roomId, socket.id, socket.data.role)
      if(socket.data.role === 'admin') {
        socket.to(String(roomId)).emit('admin-left')
      } else {
        socket.to(String(roomId)).emit('user-left')
      }
    })
  })

  return io
}