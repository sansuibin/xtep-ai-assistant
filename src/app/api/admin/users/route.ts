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

async function saveUserConfigs(configs: UserConfig[]): Promise<void> {
  await writeFile(USER_CONFIG_PATH, JSON.stringify(configs, null, 2), 'utf-8');
}

// Verify admin token
function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '');
  const adminToken = process.env.ADMIN_TOKEN || 'admin-token-xtep-2024';
  return token === adminToken;
}

// GET - List all users
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const configs = await loadUserConfigs();
  
  // Hide passwords in response
  const users = configs.map(u => ({
    id: u.id,
    username: u.username,
    apiKey: u.apiKey ? u.apiKey.substring(0, 8) + '...' : '',
    apiKeyFull: u.apiKey,
    model: u.model,
    isActive: u.isActive,
  }));

  return NextResponse.json({ users });
}

// POST - Create new user
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, username, password, apiKey, model } = body;

    if (!id || !username || !password) {
      return NextResponse.json(
        { error: '用户ID、显示名称和密码为必填项' },
        { status: 400 }
      );
    }

    const configs = await loadUserConfigs();
    
    // Check if user ID already exists
    if (configs.find(u => u.id === id)) {
      return NextResponse.json(
        { error: '用户ID已存在' },
        { status: 400 }
      );
    }

    const newUser: UserConfig = {
      id,
      username,
      password,
      apiKey: apiKey || '',
      model: model || 'gemini-3.1-flash-image-preview',
      isActive: true,
    };

    configs.push(newUser);
    await saveUserConfigs(configs);

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        model: newUser.model,
        isActive: newUser.isActive,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 });
  }
}
