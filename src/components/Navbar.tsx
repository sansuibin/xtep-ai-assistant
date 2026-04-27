'use client';

import { useApp } from '@/contexts/AppContext';

export function Navbar() {
  const { state, logout, openLoginModal } = useApp();

  return (
    <header className="sticky top-0 z-40 h-16 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left: Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-xtep-gradient rounded-xl flex items-center justify-center shadow-xtep">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">特步AI生图助手</h1>
            <span className="px-2 py-0.5 text-xs font-medium text-white bg-xtep-gradient rounded-full">
              Beta
            </span>
          </div>
        </div>

        {/* Right: User Actions */}
        <div className="flex items-center gap-4">
          {/* 管理员后台入口 */}
          <a
            href="/admin/login"
            target="_blank"
            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-[#E53935] border border-gray-200 hover:border-[#E53935] rounded-lg transition-all"
          >
            管理后台
          </a>

          {state.user ? (
            <>
              {/* User Avatar */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#E53935] to-[#FF6D00] rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {state.user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {state.user.username}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all focus-ring"
              >
                退出
              </button>
            </>
          ) : (
            <button
              onClick={openLoginModal}
              className="px-5 py-2.5 text-sm font-medium text-white bg-xtep-gradient rounded-xl hover:shadow-xtep-hover transition-all btn-press focus-ring"
            >
              登录体验
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
