import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

interface UserConfig {
  id: string;
  username: string;
  password: string;
  apiKey: string;
  model: string;
  isActive: boolean;
}

const USER_CONFIG_PATH = path.join(
  process.cwd(), 
  'users.json'
);

async function loadUserConfigs(): Promise<UserConfig[]> {
  try {
    if (!existsSync(USER_CONFIG_PATH)) {
      return [];
    }
    const data = await readFile(USER_CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading user configs:', error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, password } = await request.json();

    if (!userId || !password) {
      return NextResponse.json(
        { error: '请输入用户ID和密码' },
        { status: 400 }
      );
    }

    const configs = await loadUserConfigs();
    const user = configs.find(u => u.id === userId && u.password === password && u.isActive);

    if (!user) {
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        modelName: user.model,
        provider: 'easyrouter',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: '登录失败' },
      { status: 500 }
    );
  }
}
