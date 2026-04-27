'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, Plus, Edit2, Trash2, Users, Settings, LogOut } from 'lucide-react';

interface User {
	id: number;
	user_id: string;
	username: string;
	model_name: string;
	provider: string;
	is_active: boolean;
	usage_count: number;
	created_at: string;
}

export default function AdminDashboard() {
	const router = useRouter();
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [formData, setFormData] = useState({
		userId: '',
		username: '',
		password: '',
		apiKey: '',
		modelName: 'gemini-2.0-flash',
		provider: 'google',
	});
	const [adminUser, setAdminUser] = useState<{ id: number; username: string } | null>(null);

	const fetchUsers = useCallback(async (token?: string) => {
		const authToken = token || localStorage.getItem('admin_token');
		if (!authToken) return;

		setLoading(true);
		try {
			const response = await fetch('/api/admin/users', {
				headers: { Authorization: `Bearer ${authToken}` },
			});
			const data = await response.json();

			if (response.ok) {
				setUsers(data.users || []);
			} else if (response.status === 401) {
				router.push('/admin/login');
			}
		} catch (error) {
			console.error('Fetch users error:', error);
		} finally {
			setLoading(false);
		}
	}, [router]);

	// Check auth on mount
	useEffect(() => {
		const token = localStorage.getItem('admin_token');
		const userStr = localStorage.getItem('admin_user');

		if (!token || !userStr) {
			router.push('/admin/login');
			return;
		}

		setAdminUser(JSON.parse(userStr));
		fetchUsers(token);
	}, [router, fetchUsers]);


	const handleLogout = () => {
		localStorage.removeItem('admin_token');
		localStorage.removeItem('admin_user');
		router.push('/admin/login');
	};

	const openCreateModal = () => {
		setEditingUser(null);
		setFormData({
			userId: '',
			username: '',
			password: '',
			apiKey: '',
			modelName: 'gemini-2.0-flash',
			provider: 'google',
		});
		setShowModal(true);
	};

	const openEditModal = (user: User) => {
		setEditingUser(user);
		setFormData({
			userId: user.user_id,
			username: user.username,
			password: '', // Don't prefill password for security
			apiKey: '', // Don't prefill API key for security
			modelName: user.model_name,
			provider: user.provider,
		});
		setShowModal(true);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const token = localStorage.getItem('admin_token');
		if (!token) return;

		const url = editingUser
			? `/api/admin/users/${editingUser.id}`
			: '/api/admin/users';
		const method = editingUser ? 'PUT' : 'POST';

		try {
			const body: Record<string, string> = {
				userId: formData.userId,
				username: formData.username,
				modelName: formData.modelName,
				provider: formData.provider,
			};

			if (editingUser) {
				body.id = editingUser.id.toString();
				if (formData.password) {
					body.password = formData.password;
				}
				if (formData.apiKey) {
					body.apiKey = formData.apiKey;
				}
			} else {
				body.password = formData.password;
				body.apiKey = formData.apiKey;
			}

			const response = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(body),
			});

			if (response.ok) {
				setShowModal(false);
				fetchUsers(token);
			} else {
				const data = await response.json();
				alert(data.error || '操作失败');
			}
		} catch (error) {
			console.error('Submit error:', error);
			alert('操作失败');
		}
	};

	const handleDelete = async (user: User) => {
		if (!confirm(`确定删除用户 "${user.username}" 吗？`)) return;

		const token = localStorage.getItem('admin_token');
		if (!token) return;

		try {
			const response = await fetch(`/api/admin/users/${user.id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` },
			});

			if (response.ok) {
				fetchUsers(token);
			} else {
				alert('删除失败');
			}
		} catch (error) {
			console.error('Delete error:', error);
			alert('删除失败');
		}
	};

	const toggleUserStatus = async (user: User) => {
		const token = localStorage.getItem('admin_token');
		if (!token) return;

		try {
			const response = await fetch(`/api/admin/users/${user.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					id: user.id,
					isActive: !user.is_active,
				}),
			});

			if (response.ok) {
				fetchUsers(token);
			}
		} catch (error) {
			console.error('Toggle status error:', error);
		}
	};

	return (
		<div className="min-h-screen bg-gray-100">
			{/* Header */}
			<header className="bg-white shadow-sm">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 bg-xtep-gradient rounded-xl flex items-center justify-center">
								<svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
									<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
								</svg>
							</div>
							<div>
								<h1 className="text-lg font-bold text-gray-900">特步AI管理后台</h1>
								<p className="text-xs text-gray-500">用户管理</p>
							</div>
						</div>

						<div className="flex items-center gap-4">
							{adminUser && (
								<span className="text-sm text-gray-600">
									欢迎，{adminUser.username}
								</span>
							)}
						<Link href="/" className="text-sm text-gray-500 hover:text-[#E53935]">
								返回首页
							</Link>
							<button
								onClick={handleLogout}
								className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500"
							>
								<LogOut className="w-4 h-4" />
								退出
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<div className="bg-white rounded-xl p-6 shadow-sm">
						<div className="flex items-center gap-4">
							<div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
								<Users className="w-6 h-6 text-blue-600" />
							</div>
							<div>
								<p className="text-sm text-gray-500">总用户数</p>
								<p className="text-2xl font-bold text-gray-900">{users.length}</p>
							</div>
						</div>
					</div>
					<div className="bg-white rounded-xl p-6 shadow-sm">
						<div className="flex items-center gap-4">
							<div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
								<Settings className="w-6 h-6 text-green-600" />
							</div>
							<div>
								<p className="text-sm text-gray-500">活跃用户</p>
								<p className="text-2xl font-bold text-gray-900">
									{users.filter(u => u.is_active).length}
								</p>
							</div>
						</div>
					</div>
					<div className="bg-white rounded-xl p-6 shadow-sm">
						<div className="flex items-center gap-4">
							<div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
								<svg className="w-6 h-6 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
									<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
								</svg>
							</div>
							<div>
								<p className="text-sm text-gray-500">API 调用次数</p>
								<p className="text-2xl font-bold text-gray-900">
									{users.reduce((sum, u) => sum + (u.usage_count || 0), 0)}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Users Table */}
				<div className="bg-white rounded-xl shadow-sm">
					<div className="p-6 border-b border-gray-100 flex justify-between items-center">
						<h2 className="text-lg font-semibold text-gray-900">用户管理</h2>
						<button
							onClick={openCreateModal}
							className="flex items-center gap-2 px-4 py-2 bg-xtep-gradient text-white rounded-lg hover:shadow-xtep-hover transition-all"
						>
							<Plus className="w-4 h-4" />
							添加用户
						</button>
					</div>

					{loading ? (
						<div className="p-8 text-center text-gray-500">加载中...</div>
					) : users.length === 0 ? (
						<div className="p-8 text-center text-gray-500">
							暂无用户，点击上方按钮添加
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											用户名
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											用户ID
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											模型
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											服务商
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											状态
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											调用次数
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											创建时间
										</th>
										<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
											操作
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-100">
									{users.map((user) => (
										<tr key={user.id} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="font-medium text-gray-900">{user.username}</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{user.user_id}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
												{user.model_name}
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
													{user.provider}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<button
													onClick={() => toggleUserStatus(user)}
													className={`px-2 py-1 text-xs font-medium rounded ${
														user.is_active
															? 'bg-green-100 text-green-600'
															: 'bg-gray-100 text-gray-500'
													}`}
												>
													{user.is_active ? '启用' : '禁用'}
												</button>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
												{user.usage_count || 0}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
												{new Date(user.created_at).toLocaleDateString('zh-CN')}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-right">
												<button
													onClick={() => openEditModal(user)}
													className="p-2 text-gray-400 hover:text-blue-500"
												>
													<Edit2 className="w-4 h-4" />
												</button>
												<button
													onClick={() => handleDelete(user)}
													className="p-2 text-gray-400 hover:text-red-500"
												>
													<Trash2 className="w-4 h-4" />
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</main>

			{/* Modal */}
			{showModal && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
						<div className="flex justify-between items-center mb-6">
							<h3 className="text-lg font-semibold text-gray-900">
								{editingUser ? '编辑用户' : '添加用户'}
							</h3>
							<button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
								<X className="w-5 h-5 text-gray-500" />
							</button>
						</div>

						<form onSubmit={handleSubmit} className="space-y-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									用户ID <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.userId}
									onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
									disabled={!!editingUser}
									className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E53935] disabled:bg-gray-50"
									placeholder="唯一标识符"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									显示名称 <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									value={formData.username}
									onChange={(e) => setFormData({ ...formData, username: e.target.value })}
									className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E53935]"
									placeholder="用户显示名称"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									登录密码 <span className="text-red-500">{editingUser ? '' : '*'}</span>
								</label>
								<input
									type="password"
									value={formData.password}
									onChange={(e) => setFormData({ ...formData, password: e.target.value })}
									className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E53935]"
									placeholder={editingUser ? '留空则不修改密码' : '设置登录密码'}
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									API Key <span className="text-red-500">*</span>
								</label>
								<input
									type="password"
									value={formData.apiKey}
									onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
									className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E53935]"
									placeholder={editingUser ? '留空则不修改' : '输入API Key'}
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									模型名称 <span className="text-red-500">*</span>
								</label>
								<select
									value={formData.modelName}
									onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
									className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E53935]"
								>
									<option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
									<option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
									<option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
									<option value="imagen-3.0-generate-001">Imagen 3.0</option>
									<option value="imagegeneration@006">Imagen (旧版)</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									服务商
								</label>
								<select
									value={formData.provider}
									onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
									className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E53935]"
								>
									<option value="google">Google</option>
									<option value="openai">OpenAI</option>
									<option value="anthropic">Anthropic</option>
								</select>
							</div>

							<div className="flex gap-3 pt-4">
								<button
									type="button"
									onClick={() => setShowModal(false)}
									className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
								>
									取消
								</button>
								<button
									type="submit"
									className="flex-1 px-4 py-2 bg-xtep-gradient text-white rounded-lg hover:shadow-xtep-hover"
								>
									确定
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
}
