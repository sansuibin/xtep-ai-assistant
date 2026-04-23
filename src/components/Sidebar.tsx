'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Image, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { GeneratedImage } from '@/types';

type Tab = 'sessions' | 'gallery';

export function Sidebar() {
  const { state, createSession, updateSessionName, deleteSession, selectSession, setGalleryViewMode, openImagePreview } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('sessions');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Handle double click to edit
  const handleDoubleClick = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  // Save edited name
  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      updateSessionName(editingId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingName('');
    }
  };

  // Group images by session
  const groupedImages = state.gallery.reduce((acc, img) => {
    if (!acc[img.sessionId]) {
      acc[img.sessionId] = {
        sessionName: img.sessionName,
        images: [],
      };
    }
    acc[img.sessionId].images.push(img);
    return acc;
  }, {} as Record<string, { sessionName: string; images: GeneratedImage[] }>);

  // Toggle group expansion
  const toggleGroup = (sessionId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedGroups(newExpanded);
  };

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Truncate prompt
  const truncatePrompt = (prompt: string, maxLength: number = 30) => {
    return prompt.length > maxLength ? prompt.substring(0, maxLength) + '...' : prompt;
  };

  return (
    <aside className="w-80 bg-white border-r border-gray-100 flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all relative ${
            activeTab === 'sessions'
              ? 'text-[#E53935]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          会话记录
          {activeTab === 'sessions' && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-xtep-gradient rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all relative ${
            activeTab === 'gallery'
              ? 'text-[#E53935]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Image className="w-4 h-4" />
          我的图库
          {activeTab === 'gallery' && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-xtep-gradient rounded-full" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {activeTab === 'sessions' ? (
          <div className="p-3 space-y-2">
            {/* New Session Button */}
            <button
              onClick={() => createSession()}
              disabled={!state.user}
              className="w-full flex items-center justify-center gap-2 py-3 bg-xtep-gradient text-white font-medium rounded-xl hover:shadow-xtep-hover transition-all btn-press disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
            >
              <Plus className="w-4 h-4" />
              新建会话
            </button>

            {/* Session List */}
            {state.sessions.length === 0 ? (
              <div className="py-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-400">暂无会话记录</p>
                <p className="text-xs text-gray-400 mt-1">登录后即可开始创作</p>
              </div>
            ) : (
              <div className="space-y-1 mt-3">
                {state.sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => selectSession(session.id)}
                    className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      state.currentSessionId === session.id
                        ? 'bg-[#FFEBEE] border-l-2 border-[#E53935]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Session Name */}
                    {editingId === session.id ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={handleKeyDown}
                        className="flex-1 px-2 py-1 text-sm bg-white border border-[#E53935] rounded-lg focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        onDoubleClick={() => handleDoubleClick(session.id, session.name)}
                        className={`flex-1 text-sm truncate ${
                          state.currentSessionId === session.id
                            ? 'text-[#E53935] font-medium'
                            : 'text-gray-700'
                        }`}
                      >
                        {session.name}
                      </span>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3">
            {/* View Mode Toggle */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
              <button
                onClick={() => setGalleryViewMode('timeline')}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                  state.galleryViewMode === 'timeline'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                时间线
              </button>
              <button
                onClick={() => setGalleryViewMode('grouped')}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                  state.galleryViewMode === 'grouped'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                按会话分组
              </button>
            </div>

            {/* Gallery Content */}
            {state.gallery.length === 0 ? (
              <div className="py-12 text-center">
                <Image className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-400">暂无生成图片</p>
                <p className="text-xs text-gray-400 mt-1">开始创作后会显示在这里</p>
              </div>
            ) : state.galleryViewMode === 'timeline' ? (
              /* Timeline View */
              <div className="grid grid-cols-2 gap-2">
                {state.gallery.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => openImagePreview(img)}
                    className="group relative cursor-pointer img-zoom-container"
                  >
                    <img
                      src={img.url}
                      alt={img.prompt}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs text-white truncate">{truncatePrompt(img.prompt)}</p>
                      <p className="text-xs text-white/70">{img.sessionName}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Grouped View */
              <div className="space-y-3">
                {Object.entries(groupedImages).map(([sessionId, group]) => (
                  <div key={sessionId} className="bg-gray-50 rounded-xl p-3">
                    <button
                      onClick={() => toggleGroup(sessionId)}
                      className="w-full flex items-center justify-between py-1 text-sm font-medium text-gray-700"
                    >
                      <span>{group.sessionName}</span>
                      {expandedGroups.has(sessionId) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {expandedGroups.has(sessionId) && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {group.images.map((img) => (
                          <div
                            key={img.id}
                            onClick={() => openImagePreview(img)}
                            className="group relative cursor-pointer img-zoom-container"
                          >
                            <img
                              src={img.url}
                              alt={img.prompt}
                              className="w-full aspect-square object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-xs text-white truncate">{truncatePrompt(img.prompt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
