import { requireAdmin } from "@/lib/decorators/auth";
import { findRoom } from "@/lib/service/RoomService";
import { NextRequest, NextResponse } from "next/server";


class AdminRoomDetailController {
    @requireAdmin()
    static async GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        console.log('find rooms', params)
        const { id } = await params // 'a', 'b', or 'c'
        const room = await findRoom(parseInt(id))
        return NextResponse.json({success: true, room});
    }
}

export const {GET} = AdminRoomDetailController