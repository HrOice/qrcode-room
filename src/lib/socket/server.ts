/* eslint-disable @typescript-eslint/no-explicit-any */
import { Server, Socket } from 'socket.io';
import { useCDKey, validCDKey } from '../service/CDkeyService';
import { cleanUnactiveRoom } from '../service/RoomService';

import {
  adminJoinCreateRoom,
  adminJoinRoom,
  clientJoinRoom,
  getRoom,
  heartBeat,
  receiverJoinRoom,
  roomCache,
  triggerExpiredRooms
} from './roomStore';

const ROOM_EXPIRED = parseInt(process.env.ROOM_EXPIRED || "1800000")
// 心跳检查间隔
const HEARTBEAT_INTERVAL = 10000
// 断线超时时间
const TIMEOUT_MS = 60000
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

async function checkAdminStatus(socket: Socket) {
  const roomId = socket.data.roomId;
  const room = await getRoom(roomId);

  if (!room) {
    throw new Error('Room not found');
  }

  return checkStatus(socket, roomId, () => room.isAdminOnline());
}

async function checkClientStatus(socket: Socket) {
  const roomId = socket.data.roomId;
  const room = await getRoom(roomId);

  if (!room) {
    throw new Error('Room not found');
  }

  return checkStatus(socket, roomId, () => room.isClientOnline());
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
        const rs = roomCache.getRoom(roomId)
        if (!rs) {
          return next(new Error('房间不存在'))
        } else {
          const valid = rs.validSocketId(socket.id)
          if (!valid) {
            return next(new Error('房间不能进入，已有接收者'))
          }
        }
      } else {
        // 验证 valid_key
        const { id, key, valid, used, total } = await validCDKey(token);

        if (!valid) {
          return next(new Error('cdkey.invalid'))
        }


        // 将验证信息保存到 socket 实例中
        socket.data.record = { id, key }
        socket.data.role = 'admin'
        socket.data.keyId = id
        socket.data.key = key
        socket.data.used = used
        socket.data.total = total
        socket.data.roomId = id //使用cdkeyId作为房间id
      }
      next()
    } catch (error) {
      console.error('Auth error:', error)
      next(new Error('unauthorized'))
    }
  })


  // 检查断线的房间
  setInterval(async () => {
    // const inactiveRooms = await findInactiveRoom()
    // if (inactiveRooms.length > 0) {
    //   console.log('inactiveRooms, ', inactiveRooms);
    // }
    // await deleteRoom(inactiveRooms.map(r => r.room.id))

    // 查询剩余房间，清理数据库不存在的房间
    const activeRooms = await roomCache.getRooms();
    const activeIds = activeRooms.map(t => t.room.id)
    cleanUnactiveRoom(activeIds)

    // 检查roomCreatedAt，如果超过30分钟，清除掉并失效cdkey
    triggerExpiredRooms(ROOM_EXPIRED, (socket: Socket) => {
      console.log('room-expired', socket.data.roomId, socket.id)
      socket.emit('room-expired', () => {
        socket.disconnect()
      })
    });
  }, HEARTBEAT_INTERVAL)

  io.on('connection', (socket) => {
    console.log('Client connected with record:', socket.data)

    if (socket.data.role === 'client') {
      // 接收方创建房间
      handleReceiverJoin(socket);
      handleJoinRoom(socket, TIMEOUT_MS)
      // r准备
      handleUserReady(socket);
      // r离开
      handleUserLeft(socket);
      // 成功反馈，扣减次数。
      // 接收方成功反馈，告诉发送者成功，扣减次数。
      handleReceiverSuccess(socket);
    } else {
      // admin
      // 发送方创建房间
      handleSenderJoin(socket, TIMEOUT_MS);
      handleAdminJoin(socket)
      // s准备
      handleAdminReady(socket);
      // s离开
      handleAdminLeft(socket);
      // s发送
      handleAdminSend(socket);
      // s成功
      handleSenderSuccess(socket);

    }

    // 心跳包
    handleHeartBeat(socket);




    // 断开连接
    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      const rs = roomCache.getRoom(roomId);
      console.log('Client disconnected:', roomId, socket.id, socket.data.role)
      if (socket.data.role === 'admin') {
        socket.to(String(roomId)).emit('admin-left')
        rs?.cancelAdminSocketId(socket.id)
      } else {
        socket.to(String(roomId)).emit('user-left')
        rs?.cancelSocketId(socket.id);
      }
    })
  })

  return io
}

function handleAdminLeft(socket: Socket) {
  socket.on('admin-left', async () => {
    try {
      const roomId = socket.data.roomId;
      console.log('admin admin-left, ', roomId);
      socket.to(String(roomId)).emit('admin-left', {}, () => {
        socket.leave(String(roomId));
        socket.disconnect();
      });
    } catch (error) {
      console.error(error);
      socket.emit('error', { message: 'admin离开房间失败' });
    }
  });
}

function handleUserLeft(socket: Socket) {
  return socket.id
  // socket.on('user-left', async ({ roomId }) => {
  //   try {
  //     console.log('user user-left, ', roomId);
  //     const room = await clientLeaveRoom(roomId);

  //     if (room?.adminSocketId) {
  //       socket.to(room.adminSocketId).emit('user-left', { roomId });
  //     }

  //     socket.leave(String(roomId));
  //   } catch (error) {
  //     console.error(error);
  //     socket.emit('error', { message: '离开房间失败' });
  //   }
  // });
}

function handleHeartBeat(socket: Socket) {
  socket.on('heartbeat', async ({ roomId }, cb) => {
    try {
      // roomId
      // console.log('heartbeat:', roomId, socket.id, new Date());
      await heartBeat(roomId, socket.id, socket.data.role);
      cb(true);
    } catch (error) {
      console.error('Heartbeat error:', error);
      cb(false)
    }
  });
}

function handleReceiverSuccess(socket: Socket) {
  socket.on('receiver-success', async (success, cb) => {
    console.log('receiver-success1', success, socket.data.roomId, socket.id);
    if (success) {
      const used = await useCDKey(socket.data.roomId, '127.0.0.1', -1);
      socket.to(String(socket.data.roomId)).emit('receiver-success', used, true);
    } else {
      socket.to(String(socket.data.roomId)).emit('receiver-success', 0, false);
    }
    cb()
    if (success) {
      const rs = roomCache.getRoom(socket.data.roomId);
      rs?.resetRoomCreatedAt()
    }
  });
}

function handleSenderSuccess(socket: Socket) {
  socket.on('sender-success', async (cb) => {
    // 通知接收，接收下线
    console.log('sender-success', socket.data.roomId, socket.id);
    const used = await useCDKey(socket.data.roomId, '127.0.0.1', -1);
    socket.to(String(socket.data.roomId)).emit('sender-success');
    cb(used);
    const rs = roomCache.getRoom(socket.data.roomId);
    rs?.resetRoomCreatedAt()
  });
}

function handleAdminSend(socket: Socket) {
  socket.on('admin-send', async (data, cb) => {
    const roomId = socket.data.roomId;
    // 先验证
    const { valid, used, total } = await validCDKey(socket.data.key, socket.data.keyId);
    if (!valid) {
      cb(-1);
      return;
    }
    socket.to(String(roomId)).emit('admin-send', data, used! + 1, total, async () => {
      // 发送成功减次数
      console.log('send success........', roomId, data.length);
      // 直接返回原结果
      cb(used, total);
    });
  });
}

function handleAdminReady(socket: Socket) {
  socket.on('admin-ready', async (ready, cb) => {
    const roomId = socket.data.roomId;
    console.log('admin-ready', ready);
    socket.to(String(roomId)).emit('admin-ready', ready);
    cb(ready);
  });
}

function handleUserReady(socket: Socket) {
  socket.on('user-ready', async (ready, cb) => {
    const roomId = socket.data.roomId;
    console.log('user-ready', ready);
    socket.to(String(roomId)).emit('user-ready', ready);
    cb(ready);
  });
}

function handleAdminJoin(socket: Socket) {
  socket.on('admin-join', async ({ roomId }, cb) => {
    try {
      const adminId = socket.data.adminId;

      socket.data.roomId = roomId;
      console.log('admin-join', adminId, roomId);
      const { cdkeyId, ip } = await adminJoinRoom(roomId, adminId, socket.id);
      socket.data.keyId = cdkeyId;
      socket.data.clientIp = ip;

      socket.join(String(roomId));
      socket.to(String(roomId)).emit('admin-join', { roomId, adminId });
      const clientStatus = await checkClientStatus(socket);
      console.log('admin-join', adminId, roomId, clientStatus);
      cb({ roomId: roomId, ...clientStatus });
    } catch (error) {
      console.error(error);
      socket.emit('error', { message: '加入房间失败' });
    }
  });
}

function handleJoinRoom(socket: Socket, TIMEOUT_MS: number) {
  socket.on('join-room', async ({ ip }, cb) => {
    console.log('join-room:', socket.data, ip);
    const id = socket.data.keyId;
    socket.data.ip = ip;
    // const existRoom = RoomMap.get(id);
    try {
      const room = await clientJoinRoom(ip, id, socket.id, TIMEOUT_MS, socket);
      socket.data.roomId = room.id;
      socket.join(String(room.id));
      console.log('join-room cb', room.id, cb);
      socket.to(String(room.id)).emit('user-join', { roomId: room.id });
      // 要检查admin的状态，是否在线，是否准备
      const adminStatus = await checkAdminStatus(socket);
      cb({ roomId: room.id, ...adminStatus, used: socket.data.used, total: socket.data.total });
    } catch (error) {
      console.error(error);
      socket.emit('error', { message: '加入房间失败' });
    }
  });
}

function handleReceiverJoin(socket: Socket) {
  socket.on('receiver-join', async ({ roomId }, cb) => {
    try {

      socket.data.roomId = roomId;
      console.log('receiver-join', roomId);
      const { cdkeyId, ip } = await receiverJoinRoom(roomId, socket.id, socket);
      socket.data.keyId = cdkeyId;
      socket.data.senderIp = ip;

      socket.join(String(roomId));
      socket.to(String(roomId)).emit('receiver-join', { roomId });
      const adminStatus = await checkAdminStatus(socket);
      console.log('receiver-join', roomId, adminStatus);
      cb({ roomId: roomId, ...adminStatus });
    } catch (error) {
      console.error(error);
      socket.emit('error', { message: 'receiver加入房间失败' });
    }
  });
}

function handleSenderJoin(socket: Socket, TIMEOUT_MS: number) {
  socket.on('sender-join', async ({ ip }, cb) => {
    console.log('sender-join', socket.data, ip);
    const cdkeyId = socket.data.keyId;
    socket.data.ip = ip;

    try {
      const room = await adminJoinCreateRoom(cdkeyId, ip, cdkeyId, socket.id, -1, TIMEOUT_MS, socket);
      const roomId = room.id;
      const rs = roomCache.getRoom(roomId);
      if (!rs) {
        socket.emit('error', { message: '房间不存在' });
        console.error('房间不存在', roomId, socket.id)
        socket.disconnect();
        return;
      } else {
        const valid = rs.validAdminSocketId(socket.id);
        if (!valid) {
          console.error('房间已占用', roomId, socket.id, rs.getAdminSocketId())
          socket.emit('error', { message: '房间已占用' });
          socket.disconnect();
          return;
        }
      }
      socket.data.roomId = room.id;
      socket.join(String(room.id));
      console.log('sender-join cb', room.id, cb);
      socket.to(String(room.id)).emit('sender-join', { roomId: room.id });
      // 要检查的状态，是否在线，是否准备
      const clientStatus = await checkClientStatus(socket);
      cb({ roomId: room.id, roomCreatedAt: rs.roomCreatedAt, roomExpired: ROOM_EXPIRED, ...clientStatus, used: socket.data.used, total: socket.data.total });
    } catch (error) {
      console.error(error);
      socket.emit('error', { message: '发送者加入房间失败' });
    }
  });
}
