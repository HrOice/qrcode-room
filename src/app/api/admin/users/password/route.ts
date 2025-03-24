/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireSuperAdmin } from "@/lib/decorators/auth"
import { UpdatePassword } from "@/lib/service/AdminUserService"
import { NextRequest, NextResponse } from "next/server"


class UserController {
    @requireSuperAdmin()
    static async PUT(request: NextRequest) {
        const { id, password } = await request.json()
        try {
        await UpdatePassword(id, password)
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 500 })
        }

        return NextResponse.json(true)
    }
}

export const {PUT} = UserController