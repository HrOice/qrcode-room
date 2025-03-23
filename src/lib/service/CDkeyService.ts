
import prisma from '@/lib/db';
import { randomBytes } from 'crypto';


const CHAR_SET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GROUP_SIZE = 4;
const GROUPS = 4;

function generateHighSecurityCDKey(): string {
    // 生成足够的随机字节
    const bytes = randomBytes(GROUP_SIZE * GROUPS);

    // 生成每一组
    const groups = Array.from({ length: GROUPS }, (_, groupIndex) => {
        // 每组处理4个字节
        const start = groupIndex * GROUP_SIZE;
        return Array.from({ length: GROUP_SIZE }, (_, i) => {
            // 使用随机字节取模得到字符集索引
            const index = bytes[start + i] % CHAR_SET.length;
            return CHAR_SET[index];
        }).join('');
    });

    // 用 - 连接各组
    return groups.join('-');
}

/**
 * 创建cdkey
 * @param count 创建的CDKey数量
 * @returns 
 */
export async function createCDKeys(number: number, totalUse: number) {
    const keys = Array.from({ length: number }, () => ({
        key: generateHighSecurityCDKey(),
        used: 0,
        total: totalUse,
        status: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    }));
    console.log(keys)
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