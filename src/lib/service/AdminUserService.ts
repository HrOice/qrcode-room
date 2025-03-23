import prisma from "../db";
import { jwtUtils } from "../utils/jwtUtils";


// admin登录
export async function AdminLogin(username: string, password: string) {
    const user = await prisma.user.findFirst({
        where: {
            username,
            password,
            status: 1, // 只允许启用状态的用户登录
        },
    });
    if (!user) {
        return null;
    }

    // 生成 token
    const token = await jwtUtils.sign({
        id: user.id,
        username: user.username,
        role: user.role
    });

    return {
        token,
        user: {
            id: user.id,
            username: user.username,
            role: user.role
        }
    };
}

// 获取用户列表
export async function GetUserList(page: number, keyword: string) {
    const pageSize = 10;
    const users = await prisma.user.findMany({
        where: {
            username: {
                contains: keyword
            }
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
            createdAt: 'desc'
        }
    })
    return users;
}

// 添加用户
export async function AddUser(username: string, password: string) {
    const user = await prisma.user.create({
        data: {
            username,
            password,
            status: 1,
        },
    });
    return user;
}

export async function UpdateStatus(id: number, status: number) {
    status = status === 1 ? 1 : 0;
    if (id == 1) {
        throw new Error('超级管理员不允许修改状态');
    }
    const user = await prisma.user.update({
        where: {
            id,
        },
        data: {
            status,
        },
    });
    return user;
}