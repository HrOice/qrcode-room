// lib/db/index.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
    log: [
        {
          emit: 'stdout',
          level: 'query', // 开启 SQL 查询日志
        },
        {
          emit: 'stdout',
          level: 'error', // 错误日志（推荐开启）
        },
      ],
})

// 防止 Next.js 开发模式下的热重载导致过多连接
if (process.env.NODE_ENV !== 'production') {
  (global as any).prisma = prisma
}

export default prisma