import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// Get all users
export async function GET(request: NextRequest) {
	try {
		// Verify admin session (simple token check)
		const token = request.headers.get('Authorization')?.replace('Bearer ', '');

		if (!token) {
			return NextResponse.json({ error: '未授权' }, { status: 401 });
		}

		const client = getSupabaseClient();

		// Fetch all API configs (users)
		const { data, error } = await client
			.from('api_configs')
			.select('*')
			.order('created_at', { ascending: false });

		if (error) {
			throw error;
		}

		// Don't return API keys in list
		const safeData = (data || []).map((user: Record<string, unknown>) => ({
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

		const client = getSupabaseClient();

		// Check if user_id already exists
		const { data: existing } = await client
			.from('api_configs')
			.select('id')
			.eq('user_id', userId)
			.limit(1);

		if (existing && existing.length > 0) {
			return NextResponse.json(
				{ error: '用户ID已存在' },
				{ status: 400 }
			);
		}

		// Insert new user
		const { data, error } = await client
			.from('api_configs')
			.insert({
				user_id: userId,
				username,
				api_key: apiKey,
				model_name: modelName || 'gemini-2.0-flash',
				provider: provider || 'google',
				is_active: true,
				usage_count: 0,
			})
			.select()
			.limit(1);

		if (error) {
			throw error;
		}

		return NextResponse.json({
			success: true,
			user: {
				id: data[0].id,
				user_id: data[0].user_id,
				username: data[0].username,
				model_name: data[0].model_name,
				provider: data[0].provider,
				is_active: data[0].is_active,
			},
		});
	} catch (error) {
		console.error('Create user error:', error);
		return NextResponse.json(
			{ error: '创建用户失败' },
			{ status: 500 }
		);
	}
}
