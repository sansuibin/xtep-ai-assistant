import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// Get all users
export async function GET(request: NextRequest) {
	try {
		// Verify admin session (simple token check)
		const token = request.headers.get('Authorization')?.replace('Bearer ', '');

		if (!token) {
			return NextResponse.json({ error: '未授权' }, { status: 401 });
		}

		// Fetch all API configs (users)
		const users = await query<{
			id: number;
			user_id: string;
			username: string;
			model_name: string;
			provider: string;
			is_active: boolean;
			usage_count: number;
			created_at: string;
			updated_at: string | null;
		}>('SELECT * FROM api_configs ORDER BY created_at DESC');

		// Don't return API keys in list
		const safeData = users.rows.map((user) => ({
			id: user.id,
			user_id: user.user_id,
			username: user.username,
			model_name: user.model_name,
			provider: user.provider,
			is_active: user.is_active,
			usage_count: user.usage_count,
			created_at: user.created_at,
			updated_at: user.updated_at,
		}));

		return NextResponse.json({ users: safeData });
	} catch (error) {
		console.error('Get users error:', error);
		return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
	}
}

// Create new user
export async function POST(request: NextRequest) {
	try {
		const token = request.headers.get('Authorization')?.replace('Bearer ', '');

		if (!token) {
			return NextResponse.json({ error: '未授权' }, { status: 401 });
		}

		const { userId, username, apiKey, modelName, provider } = await request.json();

		if (!userId || !username || !apiKey) {
			return NextResponse.json(
				{ error: '缺少必填字段' },
				{ status: 400 }
			);
		}

		// Check if user_id already exists
		const existing = await queryOne<{ id: number }>(
			'SELECT id FROM api_configs WHERE user_id = $1 LIMIT 1',
			[userId]
		);

		if (existing) {
			return NextResponse.json(
				{ error: '用户ID已存在' },
				{ status: 400 }
			);
		}

		// Insert new user
		const result = await queryOne<{
			id: number;
			user_id: string;
			username: string;
			model_name: string;
			provider: string;
			is_active: boolean;
		}>(
			`INSERT INTO api_configs (user_id, username, api_key, model_name, provider, is_active, usage_count)
			 VALUES ($1, $2, $3, $4, $5, true, 0)
			 RETURNING id, user_id, username, model_name, provider, is_active`,
			[userId, username, apiKey, modelName || 'gemini-2.0-flash', provider || 'google']
		);

		if (!result) {
			throw new Error('Insert failed');
		}

		return NextResponse.json({
			success: true,
			user: result,
		});
	} catch (error) {
		console.error('Create user error:', error);
		return NextResponse.json(
			{ error: '创建用户失败' },
			{ status: 500 }
		);
	}
}
