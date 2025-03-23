import { subSeconds } from 'date-fns'
import { Server } from 'socket.io'
import { validCDKey } from '../service/CDkeyService'
import { jwtUtils } from '../utils/jwtUtils'
import { adminJoinRoom, clientJoinRoom, clientLeaveRoom, deleteRoom, findInactiveRoom, heartBeat } from './roomStore'


export function createSocketServer(server: any) {
  const io = new Server(server)

  // 添加身份验证中间件
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error('unauthorized'))
    }

    try {
      if (token.includes('.')) {
        console.log('admin-auth ', token)
        const payload = await jwtUtils.verify(token)
        console.log('admin-auth ', token, payload)
        if (!payload) {
          return next(new Error('admin.unauthorized'))
        }

        // 将用户信息添加到请求头中
        socket.data.adminId = payload.id
      } else {
        // 验证 valid_key
        const { id, key, valid } = await validCDKey(token);

        if (!valid) {
          return next(new Error('unauthorized'))
        }

        // 将验证信息保存到 socket 实例中
        socket.data.record = { id, key }
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
  const TIMEOUT_SECONDS = 20

  // 检查断线的房间
  setInterval(async () => {
    const inactiveRooms = await findInactiveRoom()
    console.log('inactiveRooms, ', inactiveRooms);
    await deleteRoom(inactiveRooms.map(r=>r.getRoom.id))

  }, HEARTBEAT_INTERVAL)

  io.on('connection', (socket) => {
    console.log('Client connected with record:', socket.data.record)
    // 用户创建/重连房间
    socket.on('join-room', async ({ ip }, cb) => {
      console.log('join-room:', socket.data.record, ip)
      const { id, key } = socket.data.record;
      // const existRoom = RoomMap.get(id);

      try {
        const room = await clientJoinRoom(ip, id, socket.id, TIMEOUT_SECONDS)
        socket.data.roomId = room.id
        socket.join(String(room.id))
        // socket.to(String(room.id)).emit('join-room', { roomId: room.id })
        console.log('join-room cb', room.id, cb)
        // 要检查admin的状态，是否在线，是否准备
        cb(room.id)
      } catch (error) {
        socket.emit('error', { message: '加入房间失败' })
      }
    })

    // 管理员加入房间
    socket.on('admin-join', async ({ roomId },cb) => {
      try {
        const adminId = socket.data.adminId;

        socket.data.roomId = roomId
        console.log('admin-join', adminId, roomId);
        await adminJoinRoom(roomId, adminId, socket.id);

        socket.join(String(roomId))
        socket.to(String(roomId)).emit('admin-join', {roomId, adminId})
        cb()
      } catch (error) {
        socket.emit('error', { message: '加入房间失败' })
      }
    })

    socket.on('user-ready', async (ready, cb) => {
      const roomId = socket.data.roomId
      socket.to(String(roomId)).emit('user-ready', ready)
      cb(ready)
    })

    socket.on('admin-ready', async (ready, cb) => {
      const roomId = socket.data.roomId
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
      socket.to(String(roomId)).emit('admin-send', data, () => {
        // 发送成功减次数
        console.log('send success........', cb);
        cb()
      })
    })

    // 心跳包
    socket.on('heartbeat', async ({ roomId }, cb) => {
      try {
        // roomId
        console.log('heartbeat:', roomId, socket.id)
        await heartBeat(roomId, socket.id)
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
        socket.emit('error', { message: 'admin离开房间失败' })
      }
    })

    // 断开连接
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  return io
}