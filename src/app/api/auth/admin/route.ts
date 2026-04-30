import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (username !== adminUsername || password !== adminPassword) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    const token = process.env.ADMIN_TOKEN || 'admin-token-xtep-2024';

    return NextResponse.json({
      success: true,
      token,
      admin: {
        username: adminUsername,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
