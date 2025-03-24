import { findRoom } from "@/lib/service/RoomService";
import { NextRequest, NextResponse } from "next/server";


class AdminRoomDetailController {

    static async GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
        const { id } = await params // 'a', 'b', or 'c'
        const room = await findRoom(parseInt(id))
        return NextResponse.json({success: true, room});
    }
}

export const {GET} = AdminRoomDetailController