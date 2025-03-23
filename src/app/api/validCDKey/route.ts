import { validCDKey } from "@/lib/service/CDkeyService";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    // 从请求体中获取密码    
    const { password } = await request.json();
  
    // 从数据库查询cdkey信息
    const {id, key, valid} = await validCDKey(password);

    if (valid) {
        // 验证成功，设置set-cookie key
        const resp = NextResponse.json({
            success: true,
            message: '验证成功',
            data: {key}
        });
        
        // resp.cookies.set('valid_key', key, {
        //     httpOnly: true
        // })
        return resp;
    } else {
        return NextResponse.json({
            success: false,
            message: '验证失败'
          }, { status: 401 });
    }
  }