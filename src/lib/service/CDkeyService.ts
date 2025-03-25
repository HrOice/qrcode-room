import prisma from '@/lib/db';
import { randomBytes } from 'crypto';


const CHAR_SET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PREFIX_LENGTH = 6;  // 前缀长度
const SEQUENCE_LENGTH = 5;  // 序号长度

function generateRandomPrefix(): string {
    const bytes = randomBytes(PREFIX_LENGTH);
    return Array.from({ length: PREFIX_LENGTH }, (_, i) => {
        const index = bytes[i] % CHAR_SET.length;
        return CHAR_SET[index];
    }).join('');
}

function formatSequence(num: number): string {
    return num.toString().padStart(SEQUENCE_LENGTH, '0');
}

function generateCDKeyWithSequence(prefix: string, sequence: number): string {
    return `${prefix}-${formatSequence(sequence)}`;
}

/**
 * 创建cdkey
 * @param count 创建的CDKey数量
 * @param totalUse 每个key可用次数
 * @returns 
 */
export async function createCDKeys(number: number, totalUse: number) {
    // 生成一个随机前缀，所有key共用
    const prefix = generateRandomPrefix();
    
    // 获取当前最大序号
    const lastKey = await prisma.cDKey.findFirst({
        orderBy: {
            key: 'desc'
        }
    });

    // 确定起始序号
    let startSequence = 10001; // 默认起始值
    if (lastKey?.key) {
        const match = lastKey.key.match(/-(\d+)$/);
        if (match) {
            startSequence = parseInt(match[1]) + 1;
        }
    }

    // 生成指定数量的key
    const keys = Array.from({ length: number }, (_, i) => ({
        key: generateCDKeyWithSequence(prefix, startSequence + i),
        used: 0,
        total: totalUse,
        status: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    }));

    // 批量创建
    await prisma.cDKey.createMany({
        data: keys,
    });

    return keys;
}

/**
 * 检查cdkey是否有效
 * @param key 
 * @returns 
 */
export async function validCDKey(key: string, id?: number):
    Promise<{ id?: number; key?: string; valid: boolean; used?: number; total?:number}> {
    const where: {id?:number, key?:string} = {}
    if (id != null) {
        where.id = id;
    } else {
        where.key = key
    }
    const cdkey = await prisma.cDKey.findFirst({
        where
    });
    if (!cdkey) {
        return {valid: false};
    }
    if (cdkey.used >= cdkey.total) {
        return {id: cdkey.id, key: cdkey.key, valid: false};
    }
    return {id: cdkey.id, key: cdkey.key, valid: true, used: cdkey.used, total: cdkey.total };
}
/**
 * 使用cdkey
 * @param key 
 * @returns 
 */
export async function useCDKey(id: number, ip: string, adminId: number) {
    const cdkey = await prisma.cDKey.findUnique({
        where: {
            id,
        },
    });
    if (!cdkey) {
        return -1;
    }
    if (cdkey.used >= cdkey.total) {
        return -1;
    }
    try {
        const result = await prisma.$transaction(async (tx) => {
            await tx.cDKey.update({
                where: {
                    id: cdkey.id,
                    used: {
                        lt: cdkey.total // 确保 used 小于 total
                    }
                },
                data: {
                    used: {
                        increment: 1 // 使用 increment 进行原子递增
                    }
                },
            });

            // 插入使用记录
            await tx.cDKeyRecord.create({
                data: {
                    cdkeyId: cdkey.id,
                    ip: ip,
                    adminId,
                },
            });
            return cdkey.used + 1;
        })

        return result;
    } catch (error) {
        console.error('useCDKey Error:', error);
        return false;
    }
}

/**
 * 获取cdkey列表
 * @param page
 * @param keyword
 * @param status
 * @param total
 * @returns
 */
export async function getCDKeys(page: number , keyword: string | undefined, status: number | undefined, total: number | undefined) {
    const pageSize = 10;
    console.log({ page, keyword, status, total })
    const where = {
        ...(keyword ? { key: { contains: keyword } } : {}),
        ...(status !== null ? { status: status } : {}),
        ...(total ? { total: total } : {})
    }
    const [cdkeys, count] = await Promise.all([
        prisma.cDKey.findMany({
            where,
            skip: (page - 1) * pageSize,
            take: pageSize,
            orderBy: { id: 'desc' }
        }),
        prisma.cDKey.count({ where })
    ])
    return { cdkeys, total: count }
};

/**
 * 更新cdkey状态
 */
export async function updateCDKeyStatus(id: number, status: boolean) {
    return prisma.cDKey.update({
        where: {
            id,
        },
        data: {
            status: status ? 1 : 0,
        },
    });
}