/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/db/index.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn']
        : ['error']
})

// 防止 Next.js 开发模式下的热重载导致过多连接
if (process.env.NODE_ENV !== 'production') {
    (global as any).prisma = prisma
}

export default prisma