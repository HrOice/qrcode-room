import { jwtUtils } from '@/lib/utils/jwtUtils'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
      // 记录请求日志
  console.log(`[${request.method}] ${request.nextUrl.pathname}`)
  // 检查是否是 API 请求
  if (request.nextUrl.pathname.startsWith('/api/admin') && request.nextUrl.pathname !== '/api/admin/login') {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await jwtUtils.verify(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 将用户信息添加到请求头中
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.id.toString())
    requestHeaders.set('x-user-role', payload.role.toString())

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/admin/:path*',
}