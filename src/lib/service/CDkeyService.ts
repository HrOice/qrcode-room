import { randomBytes } from 'crypto';
import prisma from '../db';


const CHAR_SET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PREFIX_LENGTH = 6;  // 前缀长度
const SUFFIX_LENGTH = 6;  // 后缀长度

function generateRandomPrefix(): string {
    const bytes = randomBytes(PREFIX_LENGTH);
    return Array.from({ length: PREFIX_LENGTH }, (_, i) => {
        const index = bytes[i] % CHAR_SET.length;
        return CHAR_SET[index];
    }).join('');
}


/**
 * 创建cdkey
 * @param count 创建的CDKey数量
 * @param totalUse 每个key可用次数
 * @returns 
 */
export async function createCDKeys(number: number, totalUse: number) {
    try {
        // 获取数据库最大 ID
        const maxIdResult = await prisma.cDKey.findFirst({
            orderBy: {
                id: 'desc'
            },
            select: {
                id: true
            }
        });

        const startId = (maxIdResult?.id || 0) + 1;
        const createdAt = new Date()
        // 生成要创建的 keys
        const keys = Array.from({ length: number }, (_, i) => {
            const currentId = startId + i;
            const prefix = generateRandomPrefix(); // 每个 key 生成新的前缀
            const formattedId = currentId.toString().padStart(SUFFIX_LENGTH, '0');
            
            return {
                key: `${prefix}-${formattedId}`,
                used: 0,
                total: totalUse,
                status: 1,
                createdAt: createdAt,
                updatedAt: createdAt,
            };
        });

        // 批量创建
        await prisma.cDKey.createMany({
            data: keys,
        });

        return keys;

    } catch (error) {
        console.error('创建 CDKey 失败:', error);
        throw error;
    }
}

/**
 * 检查cdkey是否有效
 * @param key 
 * @returns 
 */
export async function validCDKey(key: string, id?: number):
    Promise<{ id?: number; key?: string; valid: boolean; used?: number; total?: number }> {
    const where: { id?: number, key?: string } = {}
    if (id != null) {
        where.id = id;
    } else {
        where.key = key
    }
    const cdkey = await prisma.cDKey.findFirst({
        where
    });
    if (!cdkey) {
        return { valid: false };
    }
    if (cdkey.used >= cdkey.total || cdkey.status != 1) {
        return { id: cdkey.id, key: cdkey.key, valid: false };
    }
    return { id: cdkey.id, key: cdkey.key, valid: true, used: cdkey.used, total: cdkey.total };
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
    if (cdkey.used >= cdkey.total || cdkey.status != 1) {
        return -2;
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

export async function invalidCDKey(ids: number[]) {
    if (ids.length > 0) {
        return prisma.cDKey.updateMany({
            where: {
                id: {
                    in: ids
                }
            }, 
            data: {
                status: 0
            }
        })
    }
    return null;
}

/**
 * 获取cdkey列表
 * @param page
 * @param keyword
 * @param status
 * @param total
 * @returns
 */
export async function getCDKeys(page: number, keyword: string | undefined, status: number | undefined, total: number | undefined) {
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