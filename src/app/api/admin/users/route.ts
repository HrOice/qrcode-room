/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireSuperAdmin } from '@/lib/decorators/auth'
import { AddUser, GetUserList, UpdateStatus } from '@/lib/service/AdminUserService'
import { NextRequest, NextResponse } from 'next/server'

class UserController {
    @requireSuperAdmin()
    static async PUT(request: NextRequest) {
        const { id, status } = await request.json()
        try {
        await UpdateStatus(id, status)
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 500 })
        }

        return NextResponse.json(true)
    }
    @requireSuperAdmin()
    static async POST(request: NextRequest) {
        const { username, password } = await request.json()

        await AddUser(username, password)

        return NextResponse.json(true)
    }
    @requireSuperAdmin()
    static async GET(request: NextRequest) {
        const searchParams = request.nextUrl.searchParams
        const page = parseInt(searchParams.get('page') || '1')
        const keyword = searchParams.get('keyword') || ''

        const users = await GetUserList(page, keyword)

        return NextResponse.json({ users })
    }
}

export const { PUT, POST, GET } = UserController
