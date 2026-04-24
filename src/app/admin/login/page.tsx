'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
	const router = useRouter();
	const [username, setUsername] = useState('admin');
	const [password, setPassword] = useState('admin123');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const response = await fetch('/api/auth/admin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password }),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error || '登录失败');
				return;
			}

			// Store token in localStorage
			localStorage.setItem('admin_token', data.token);
			localStorage.setItem('admin_user', JSON.stringify(data.admin));

			// Redirect to dashboard
			router.push('/admin/dashboard');
		} catch {
			setError('网络错误，请重试');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-100 flex items-center justify-center">
			<div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
				{/* Header */}
				<div className="text-center mb-8">
					<div className="w-16 h-16 bg-xtep-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xtep">
						<svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
							<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
						</svg>
					</div>
					<h1 className="text-2xl font-bold text-gray-900">特步AI管理后台</h1>
					<p className="text-gray-500 mt-2">管理员登录</p>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-6">
					{error && (
						<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
							{error}
						</div>
					)}

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							用户名
						</label>
						<input
							type="text"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E53935] focus:border-transparent"
							placeholder="请输入用户名"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							密码
						</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E53935] focus:border-transparent"
							placeholder="请输入密码"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full py-3.5 bg-xtep-gradient text-white font-medium rounded-xl hover:shadow-xtep-hover transition-all disabled:opacity-50"
					>
						{loading ? '登录中...' : '登录'}
					</button>
				</form>

				{/* Footer */}
				<div className="mt-6 text-center">
					<Link href="/" className="text-sm text-gray-500 hover:text-[#E53935]">
						返回首页
					</Link>
				</div>
			</div>
		</div>
	);
}
