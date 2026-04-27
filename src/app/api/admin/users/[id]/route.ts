import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { createHash } from 'crypto';

// Simple hash function for passwords
function hashPassword(password: string): string {
	return createHash('sha256').update(password).digest('hex');
}

// Update user
export async function PUT(request: NextRequest) {
	try {
		const token = request.headers.get('Authorization')?.replace('Bearer ', '');

		if (!token) {
			return NextResponse.json({ error: '未授权' }, { status: 401 });
		}

		const { id, username, password, apiKey, modelName, provider, isActive } = await request.json();

		if (!id) {
			return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
		}

		// Build update query dynamically
		const updates: string[] = [];
		const values: unknown[] = [];
		let paramIndex = 1;

		if (username !== undefined) {
			updates.push(`username = $${paramIndex++}`);
			values.push(username);
		}
		if (password !== undefined && password !== '') {
			updates.push(`password_hash = $${paramIndex++}`);
			values.push(hashPassword(password));
		}
		if (apiKey !== undefined) {
			updates.push(`api_key = $${paramIndex++}`);
			values.push(apiKey);
		}
		if (modelName !== undefined) {
			updates.push(`model_name = $${paramIndex++}`);
			values.push(modelName);
		}
		if (provider !== undefined) {
			updates.push(`provider = $${paramIndex++}`);
			values.push(provider);
		}
		if (isActive !== undefined) {
			updates.push(`is_active = $${paramIndex++}`);
			values.push(isActive);
		}
		updates.push(`updated_at = $${paramIndex++}`);
		values.push(new Date().toISOString());
		values.push(id);

		const result = await queryOne<{
			id: number;
			user_id: string;
			username: string;
			model_name: string;
			provider: string;
			is_active: boolean;
		}>(
			`UPDATE api_configs SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, user_id, username, model_name, provider, is_active`,
			values
		);

		if (!result) {
			return NextResponse.json({ error: '用户不存在' }, { status: 404 });
		}

		return NextResponse.json({
			success: true,
			user: result,
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

		const result = await query('DELETE FROM api_configs WHERE id = $1', [parseInt(id)]);

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Delete user error:', error);
		return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
	}
}
