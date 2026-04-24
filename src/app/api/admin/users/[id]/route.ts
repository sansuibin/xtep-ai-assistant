import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// Update user
export async function PUT(request: NextRequest) {
	try {
		const token = request.headers.get('Authorization')?.replace('Bearer ', '');

		if (!token) {
			return NextResponse.json({ error: '未授权' }, { status: 401 });
		}

		const { id, username, apiKey, modelName, provider, isActive } = await request.json();

		if (!id) {
			return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
		}

		const client = getSupabaseClient();

		// Build update object
		const updates: Record<string, unknown> = {};
		if (username !== undefined) updates.username = username;
		if (apiKey !== undefined) updates.api_key = apiKey;
		if (modelName !== undefined) updates.model_name = modelName;
		if (provider !== undefined) updates.provider = provider;
		if (isActive !== undefined) updates.is_active = isActive;
		updates.updated_at = new Date().toISOString();

		const { data, error } = await client
			.from('api_configs')
			.update(updates)
			.eq('id', id)
			.select()
			.limit(1);

		if (error) {
			throw error;
		}

		if (!data || data.length === 0) {
			return NextResponse.json({ error: '用户不存在' }, { status: 404 });
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
		console.error('Update user error:', error);
		return NextResponse.json({ error: '更新用户失败' }, { status: 500 });
	}
}

// Delete user
export async function DELETE(request: NextRequest) {
	try {
		const token = request.headers.get('Authorization')?.replace('Bearer ', '');

		if (!token) {
			return NextResponse.json({ error: '未授权' }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const id = searchParams.get('id');

		if (!id) {
			return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
		}

		const client = getSupabaseClient();

		const { error } = await client
			.from('api_configs')
			.delete()
			.eq('id', parseInt(id));

		if (error) {
			throw error;
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Delete user error:', error);
		return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
	}
}
