import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { createHash } from 'crypto';

// Simple hash function for passwords
function hashPassword(password: string): string {
	return createHash('sha256').update(password).digest('hex');
}

// User login - validates against api_configs table
export async function POST(request: NextRequest) {
	try {
		const { userId, password } = await request.json();

		if (!userId || !password) {
			return NextResponse.json(
				{ error: '用户名和密码不能为空' },
				{ status: 400 }
			);
		}

		// Find user by user_id (not username)
		const user = await queryOne<{
			id: number;
			user_id: string;
			username: string;
			password_hash: string | null;
			api_key: string;
			model_name: string;
			provider: string;
			is_active: boolean;
		}>('SELECT * FROM api_configs WHERE user_id = $1 LIMIT 1', [userId]);

		if (!user) {
			return NextResponse.json(
				{ error: '用户不存在' },
				{ status: 401 }
			);
		}

		if (!user.is_active) {
			return NextResponse.json(
				{ error: '账号已被禁用' },
				{ status: 403 }
			);
		}

		// Verify password
		if (user.password_hash) {
			const inputHash = hashPassword(password);
			if (inputHash !== user.password_hash) {
				return NextResponse.json(
					{ error: '用户名或密码错误' },
					{ status: 401 }
				);
			}
		} else {
			// No password set - reject
			return NextResponse.json(
				{ error: '用户未设置密码，请联系管理员' },
				{ status: 401 }
			);
		}

		// Return user info (without sensitive data)
		return NextResponse.json({
			success: true,
			user: {
				id: user.user_id,
				username: user.username,
				modelName: user.model_name,
				provider: user.provider,
			},
		});
	} catch (error) {
		console.error('User login error:', error);
		return NextResponse.json(
			{ error: '登录失败' },
			{ status: 500 }
		);
	}
}
