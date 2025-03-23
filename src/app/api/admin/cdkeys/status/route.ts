import { requireSuperAdmin } from "@/lib/decorators/auth";
import { updateCDKeyStatus } from "@/lib/service/CDkeyService";
import { NextRequest, NextResponse } from "next/server";

class CDKeysStatusController {
    @requireSuperAdmin()
    static async PUT(request: NextRequest): Promise<NextResponse> {
        // 更新状态，从body获取id,status
        const { id, status } = await request.json();
        // 更新状态
        try {
            await updateCDKeyStatus(id, status);
        } catch (e) {
            console.error(e)
            return NextResponse.json({ error: '更新失败' }, { status: 500 });
        }
        return NextResponse.json({ result: true });
    }
}

export const { PUT } = CDKeysStatusController