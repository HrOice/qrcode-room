import { requireAdmin } from "@/lib/decorators/auth";
import { getRooms } from "@/lib/service/RoomService";
import { NextRequest, NextResponse } from "next/server";


class AdminRoomController {

    /**
     * 获取房间列表
     */
    @requireAdmin()
    static async GET(request: NextRequest) {
        const rooms = await getRooms();
        rooms.forEach((room) => {
            room.cdkey
        })
        return NextResponse.json({success: true, rooms})
    }
}

export const {GET} =AdminRoomController