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
  process.env.COZE_WORKSPACE_PATH || '/workspace/projects', 
  'users.json'
);

async function loadUserConfigs(): Promise<UserConfig[]> {
  try {
    if (!existsSync(USER_CONFIG_PATH)) return [];
    const data = await readFile(USER_CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveUserConfigs(configs: UserConfig[]): Promise<void> {
  await writeFile(USER_CONFIG_PATH, JSON.stringify(configs, null, 2), 'utf-8');
}

function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  const adminToken = process.env.ADMIN_TOKEN || 'admin-token-xtep-2024';
  return token === adminToken;
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { username, password, apiKey, model, isActive } = body;

    const configs = await loadUserConfigs();
    const index = configs.findIndex(u => u.id === id);

    if (index === -1) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // Update fields
    if (username !== undefined) configs[index].username = username;
    if (password !== undefined && password !== '') configs[index].password = password;
    if (apiKey !== undefined) configs[index].apiKey = apiKey;
    if (model !== undefined) configs[index].model = model;
    if (isActive !== undefined) configs[index].isActive = isActive;

    await saveUserConfigs(configs);

    return NextResponse.json({
      success: true,
      user: {
        id: configs[index].id,
        username: configs[index].username,
        model: configs[index].model,
        isActive: configs[index].isActive,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 });
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const configs = await loadUserConfigs();
    const filtered = configs.filter(u => u.id !== id);

    if (filtered.length === configs.length) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    await saveUserConfigs(filtered);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
  }
}
