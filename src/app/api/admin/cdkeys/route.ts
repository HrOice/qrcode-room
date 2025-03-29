import { requireAdmin } from "@/lib/decorators/auth";
import { createCDKeys, getCDKeys } from "@/lib/service/CDkeyService";
import { QueryParser } from "@/lib/utils/queryParser";
import { NextRequest, NextResponse } from "next/server";

class CDKeysController {
    @requireAdmin()
    static async GET(request: NextRequest): Promise<NextResponse> {
        const params = request.nextUrl.searchParams;

        const query = {
            page: QueryParser.toInt(params.get('page'), 1),
            keyword: QueryParser.toString(params.get('keyword')),
            status: QueryParser.toInt(params.get('status')),
            total: QueryParser.toInt(params.get('total'))
        };

        const { cdkeys, total } = await getCDKeys(
            query.page!,
            query.keyword,
            query.status,
            query.total
        );

        return NextResponse.json({ cdkeys, total });
    }

    /** 
     * 新增cdkey
     */
    @requireAdmin()
    static async POST(request: NextRequest): Promise<NextResponse> {
        const { number, totalUse } = await request.json();
        // 新增cdkey
        try {
            const keys = await createCDKeys(number, totalUse);
            return NextResponse.json({ result: true , keys});
        } catch (e) {
            console.error(e);
            return NextResponse.json({ error: '新增失败' }, { status: 500 });
        }
    }
}

export const { GET, POST } = CDKeysController