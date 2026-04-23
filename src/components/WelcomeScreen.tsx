'use client';

import { Sparkles, Zap, Palette } from 'lucide-react';
import { EXAMPLE_PROMPTS } from '@/types';

interface WelcomeScreenProps {
  onSelectExample: (prompt: string) => void;
}

export function WelcomeScreen({ onSelectExample }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center max-w-2xl">
        {/* Animated Icon */}
        <div className="relative mx-auto mb-8">
          <div className="w-24 h-24 bg-xtep-gradient rounded-3xl flex items-center justify-center shadow-xtep animate-float">
            <svg className="w-14 h-14 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          {/* Decorative elements */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-lg opacity-60 animate-pulse-subtle" />
          <div className="absolute -bottom-1 -left-3 w-4 h-4 bg-blue-400 rounded-full opacity-60 animate-pulse-subtle delay-200" />
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          欢迎使用特步AI生图助手
        </h2>
        <p className="text-base text-gray-500 mb-10">
          用AI驱动的设计工具，快速生成运动装备创意图。描述你的想法，让创意成真。
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
            <Zap className="w-4 h-4 text-[#E53935]" />
            <span className="text-sm text-gray-600">极速生成</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
            <Sparkles className="w-4 h-4 text-[#FF6D00]" />
            <span className="text-sm text-gray-600">高品质渲染</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
            <Palette className="w-4 h-4 text-[#4CAF50]" />
            <span className="text-sm text-gray-600">多风格支持</span>
          </div>
        </div>

        {/* Example Prompts */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            试试这些示例
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {EXAMPLE_PROMPTS.map((example, index) => (
              <button
                key={index}
                onClick={() => onSelectExample(example.prompt)}
                className="group px-6 py-3.5 bg-white border border-gray-200 rounded-xl hover:border-[#E53935] hover:shadow-soft transition-all btn-press animate-fade-in focus-ring"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="text-sm font-medium text-gray-700 group-hover:text-[#E53935] transition-colors">
                  {example.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
