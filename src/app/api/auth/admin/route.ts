import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { createHash } from 'crypto';

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string): string {
	return createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password: string, hash: string): boolean {
	return hashPassword(password) === hash;
}

// Admin login
export async function POST(request: NextRequest) {
	try {
		const { username, password } = await request.json();

		if (!username || !password) {
			return NextResponse.json(
				{ error: '用户名和密码不能为空' },
				{ status: 400 }
			);
		}

		// Find admin user
		const admin = await queryOne<{
			id: number;
			username: string;
			password_hash: string;
		}>('SELECT id, username, password_hash FROM admin_users WHERE username = $1 LIMIT 1', [username]);

		if (!admin) {
			return NextResponse.json(
				{ error: '用户名或密码错误' },
				{ status: 401 }
			);
		}

		// Verify password
		if (!verifyPassword(password, admin.password_hash)) {
			return NextResponse.json(
				{ error: '用户名或密码错误' },
				{ status: 401 }
			);
		}

		// Create simple session token (in production, use JWT)
		const sessionToken = Buffer.from(`${admin.id}:${Date.now()}`).toString('base64');

		// Return success with session info
		return NextResponse.json({
			success: true,
			token: sessionToken,
			admin: {
				id: admin.id,
				username: admin.username,
			},
		});
	} catch (error) {
		console.error('Admin login error:', error);
		return NextResponse.json(
			{ error: '登录失败' },
			{ status: 500 }
		);
	}
}
