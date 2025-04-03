import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // 检查是否已存在管理员用户
    console.log('check admin exist')
    const existingAdmin = await prisma.user.findFirst({
        where: {
            username: 'admin'
        }
    })

    if (!existingAdmin) {
        // 创建管理员用户
        const hashedPassword = 'admin123' // 默认密码：admin123
        await prisma.user.create({
            data: {
                username: 'admin',
                password: hashedPassword,
                status: 1, // 启用状态,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        })
        console.log('Created admin user')
    } else {
        console.log('Admin user already exists')
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })