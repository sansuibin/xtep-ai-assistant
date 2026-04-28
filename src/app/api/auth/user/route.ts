import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, password } = await request.json();

    // Get demo config from env
    const demoUserId = process.env.DEMO_USER_ID || 'demo';
    const demoPassword = process.env.DEMO_PASSWORD || 'demo123';

    // Validate credentials
    if (userId !== demoUserId || password !== demoPassword) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: demoUserId,
        username: '测试用户',
        modelName: 'gemini-3.1-flash-image-preview',
        provider: 'google',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: '登录失败' },
      { status: 500 }
    );
  }
}
