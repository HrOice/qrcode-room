import { requireAdmin } from "@/lib/decorators/auth";
import { getRooms } from "@/lib/service/RoomService";
import { NextResponse } from "next/server";


class AdminRoomController {

    /**
     * 获取房间列表
     */
    @requireAdmin()
    static async GET() {
        const rooms = await getRooms();

        return NextResponse.json({success: true, rooms})
    }
}

export const {GET} =AdminRoomController