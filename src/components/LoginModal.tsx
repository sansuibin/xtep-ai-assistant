'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export function LoginModal() {
  const { state, login } = useApp();
  const [username, setUsername] = useState('特步设计师');
  const [password, setPassword] = useState('123456');

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.isLoginModalOpen) {
        // Close handled by backdrop
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isLoginModalOpen]);

  if (!state.isLoginModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      login(username.trim());
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 modal-backdrop animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // Close handled by context
        }
      }}
    >
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl animate-fade-in">
        {/* Close button */}
        <button
          onClick={() => {}}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="关闭"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 bg-xtep-gradient rounded-xl flex items-center justify-center shadow-xtep">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">登录特步AI</h2>
          <p className="mt-2 text-sm text-gray-500">
            体验AI驱动的运动装备设计
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-8">
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                用户名
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E53935] focus:border-transparent transition-all"
                placeholder="请输入用户名"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                密码
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E53935] focus:border-transparent transition-all"
                placeholder="请输入密码"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-6 py-3.5 bg-xtep-gradient text-white font-medium rounded-xl hover:shadow-xtep-hover transition-all btn-press focus-ring"
          >
            开始创作
          </button>

          <p className="mt-4 text-xs text-center text-gray-400">
            任意用户名和密码即可登录
          </p>
        </form>
      </div>
    </div>
  );
}
