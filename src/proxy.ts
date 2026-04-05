import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 16.2.2+ (Turbopack) 规范：
 * 将原 middleware 重命名为 proxy，并使用 default 导出
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. 如果访问的是登录页或 API 路由，直接放行
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // 2. 检查 Cookie 中是否有访问令牌
  const accessToken = request.cookies.get('app_access_token');

  // 3. 如果没有令牌，则重定向到登录页
  if (!accessToken || accessToken.value !== 'memblaze_verified') {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// 依然保持命名的 config 导出
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * 1. /api (部分子路由可能需要放行)
     * 2. /_next (Next.js 内部资源)
     * 3. /static, /favicon.ico, 等静态文件
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};