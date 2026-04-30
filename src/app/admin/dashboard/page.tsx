'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { X, Plus, Edit2, Trash2, Users, Settings, LogOut, Key } from 'lucide-react';

interface User {
  id: string;
  username: string;
  apiKey: string;
  apiKeyFull: string;
  model: string;
  isActive: boolean;
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
		model: 'gemini-3.1-flash-image-preview',
	});

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

	useEffect(() => {
		const token = localStorage.getItem('admin_token');
		if (!token) {
			router.push('/admin/login');
			return;
		}
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
			model: 'gemini-3.1-flash-image-preview',
		});
		setShowModal(true);
	};

	const openEditModal = (user: User) => {
		setEditingUser(user);
		setFormData({
			userId: user.id,
			username: user.username,
			password: '',
			apiKey: user.apiKeyFull || '',
			model: user.model,
		});
		setShowModal(true);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const token = localStorage.getItem('admin_token');
		if (!token) return;

		try {
			if (editingUser) {
				const body: Record<string, string> = {
					username: formData.username,
					model: formData.model,
				};
				if (formData.password) body.password = formData.password;
				if (formData.apiKey) body.apiKey = formData.apiKey;

				const response = await fetch(`/api/admin/users/${editingUser.id}`, {
					method: 'PUT',
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
			} else {
				const response = await fetch('/api/admin/users', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						id: formData.userId,
						username: formData.username,
						password: formData.password,
						apiKey: formData.apiKey,
						model: formData.model,
					}),
				});

				if (response.ok) {
					setShowModal(false);
					fetchUsers(token);
				} else {
					const data = await response.json();
					alert(data.error || '操作失败');
				}
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
				body: JSON.stringify({ isActive: !user.isActive }),
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
								<p className="text-xs text-gray-500">用户与API Key管理</p>
							</div>
						</div>

						<div className="flex items-center gap-4">
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
								<Key className="w-6 h-6 text-green-600" />
							</div>
							<div>
								<p className="text-sm text-gray-500">已配置API Key</p>
								<p className="text-2xl font-bold text-gray-900">
									{users.filter(u => u.apiKey).length}
								</p>
							</div>
						</div>
					</div>
					<div className="bg-white rounded-xl p-6 shadow-sm">
						<div className="flex items-center gap-4">
							<div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
								<Settings className="w-6 h-6 text-purple-600" />
							</div>
							<div>
								<p className="text-sm text-gray-500">活跃用户</p>
								<p className="text-2xl font-bold text-gray-900">
									{users.filter(u => u.isActive).length}
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
											用户ID
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											显示名称
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											API Key
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											模型
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											状态
										</th>
										<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
											操作
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-100">
									{users.map((user) => (
										<tr key={user.id} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
												{user.id}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
												{user.username}
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className={`text-xs font-mono ${user.apiKey ? 'text-green-600' : 'text-gray-400'}`}>
													{user.apiKey || '未配置'}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded">
													{user.model}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<button
													onClick={() => toggleUserStatus(user)}
													className={`px-2 py-1 text-xs font-medium rounded ${
														user.isActive
															? 'bg-green-100 text-green-600'
															: 'bg-gray-100 text-gray-500'
													}`}
												>
													{user.isActive ? '启用' : '禁用'}
												</button>
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

				{/* Info Box */}
				<div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
					<h3 className="text-sm font-medium text-blue-800 mb-2">使用说明</h3>
					<ul className="text-sm text-blue-700 space-y-1">
						<li>• 每个用户可以配置独立的 EasyRouter API Key</li>
						<li>• API Key 以 <code className="bg-blue-100 px-1 rounded">sk-</code> 开头，从 EasyRouter 控制台获取</li>
						<li>• 未配置 API Key 的用户将使用环境变量中的默认 Key</li>
						<li>• 用户登录后使用其配置的 API Key 调用 Gemini 模型</li>
					</ul>
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
									placeholder="唯一标识符，如 user001"
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
									EasyRouter API Key
								</label>
								<input
									type="password"
									value={formData.apiKey}
									onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
									className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E53935]"
									placeholder="sk-xxxxx（留空则使用默认Key）"
								/>
								<p className="mt-1 text-xs text-gray-400">
									从 EasyRouter 控制台获取，以 sk- 开头
								</p>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									模型 <span className="text-red-500">*</span>
								</label>
								<select
									value={formData.model}
									onChange={(e) => setFormData({ ...formData, model: e.target.value })}
									className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E53935]"
								>
									<option value="gemini-3.1-flash-image-preview">Gemini 3.1 Flash (图片生成)</option>
									<option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
									<option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
									<option value="gpt-4o">GPT-4o</option>
									<option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
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
