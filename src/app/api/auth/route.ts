import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { password } = await request.json();
  const CORRECT_PASSWORD = process.env.ACCESS_PASSWORD;

  if (password === CORRECT_PASSWORD) {
    const response = NextResponse.json({ success: true });
    
    // 设置一个 HttpOnly 的 Cookie，增加安全性
    response.cookies.set('app_access_token', 'memblaze_verified', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 天有效
      path: '/',
    });

    return response;
  }

  return NextResponse.json({ success: false }, { status: 401 });
}