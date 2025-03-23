
import * as AdminUserService from '@/lib/service/AdminUserService'
import { NextRequest, NextResponse } from 'next/server'

export class UserController {

    static async POST(req: NextRequest): Promise<NextResponse> {
        const { username, password } = await req.json()
        console.log(username, password)
        const user = await AdminUserService.AdminLogin(username, password)
        if (!user) {
            return NextResponse.json({ error: 'Invalid username or password' }, { status: 403 })
        }
        return NextResponse.json(user)
    }
}

export const { POST } = UserController