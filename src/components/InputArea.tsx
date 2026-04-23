'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Upload, ChevronDown } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import {
  Resolution,
  AspectRatio,
  POSITIVE_PROMPTS,
  NEGATIVE_PROMPTS,
  RESOLUTION_MAP,
  ASPECT_RATIO_MAP,
} from '@/types';

interface InputAreaProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
}

export function InputArea({ prompt, onPromptChange, onGenerate }: InputAreaProps) {
  const { state } = useApp();
  const [resolution, setResolution] = useState<Resolution>('1K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [count, setCount] = useState<number>(2);
  const [showResolutionPanel, setShowResolutionPanel] = useState(false);
  const [showAspectRatioPanel, setShowAspectRatioPanel] = useState(false);
  const [showCountPanel, setShowCountPanel] = useState(false);
  const [showPositivePanel, setShowPositivePanel] = useState(false);
  const [showNegativePanel, setShowNegativePanel] = useState(false);

  const resolutionRef = useRef<HTMLDivElement>(null);
  const aspectRatioRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLDivElement>(null);
  const positiveRef = useRef<HTMLDivElement>(null);
  const negativeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (resolutionRef.current && !resolutionRef.current.contains(e.target as Node)) {
        setShowResolutionPanel(false);
      }
      if (aspectRatioRef.current && !aspectRatioRef.current.contains(e.target as Node)) {
        setShowAspectRatioPanel(false);
      }
      if (countRef.current && !countRef.current.contains(e.target as Node)) {
        setShowCountPanel(false);
      }
      if (positiveRef.current && !positiveRef.current.contains(e.target as Node)) {
        setShowPositivePanel(false);
      }
      if (negativeRef.current && !negativeRef.current.contains(e.target as Node)) {
        setShowNegativePanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [prompt]);

  // Add prompt to textarea
  const appendPrompt = (text: string) => {
    onPromptChange(prompt ? `${prompt}\n${text}` : text);
    setShowPositivePanel(false);
    setShowNegativePanel(false);
  };

  // Get params for generation
  const getParams = () => ({
    resolution,
    aspectRatio,
    count,
  });

  const isDisabled = !state.user || state.isGenerating;

  return (
    <div className="bg-white border-t border-gray-100 px-6 py-4">
      {/* Parameter Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Positive Prompt */}
        <div ref={positiveRef} className="relative">
          <button
            onClick={() => setShowPositivePanel(!showPositivePanel)}
            disabled={isDisabled}
            className="px-3 py-1.5 text-xs font-medium text-[#E53935] bg-[#FFEBEE] rounded-lg hover:bg-[#FFCDD2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            正向提示词
          </button>
          {showPositivePanel && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-2 animate-fade-in z-10">
              {POSITIVE_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => appendPrompt(p)}
                  className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Negative Prompt */}
        <div ref={negativeRef} className="relative">
          <button
            onClick={() => setShowNegativePanel(!showNegativePanel)}
            disabled={isDisabled}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            反向提示词
          </button>
          {showNegativePanel && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-2 animate-fade-in z-10">
              {NEGATIVE_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => appendPrompt(`!${p}`)}
                  className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aspect Ratio */}
        <div ref={aspectRatioRef} className="relative">
          <button
            onClick={() => setShowAspectRatioPanel(!showAspectRatioPanel)}
            disabled={isDisabled}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            比例
            <span className="font-medium text-gray-800">{aspectRatio}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showAspectRatioPanel && (
            <div className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-xl shadow-lg border border-gray-100 p-2 animate-fade-in z-10">
              {(Object.keys(ASPECT_RATIO_MAP) as AspectRatio[]).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => {
                    setAspectRatio(ratio);
                    setShowAspectRatioPanel(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${
                    aspectRatio === ratio
                      ? 'bg-[#FFEBEE] text-[#E53935] font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Resolution */}
        <div ref={resolutionRef} className="relative">
          <button
            onClick={() => setShowResolutionPanel(!showResolutionPanel)}
            disabled={isDisabled}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            分辨率
            <span className="font-medium text-gray-800">{resolution}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showResolutionPanel && (
            <div className="absolute bottom-full left-0 mb-2 w-32 bg-white rounded-xl shadow-lg border border-gray-100 p-2 animate-fade-in z-10">
              {(['512', '1K', '2K', '4K'] as Resolution[]).map((res) => (
                <button
                  key={res}
                  onClick={() => {
                    setResolution(res);
                    setShowResolutionPanel(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${
                    resolution === res
                      ? 'bg-[#FFEBEE] text-[#E53935] font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {res} ({RESOLUTION_MAP[res]}px)
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Count */}
        <div ref={countRef} className="relative">
          <button
            onClick={() => setShowCountPanel(!showCountPanel)}
            disabled={isDisabled}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            数量
            <span className="font-medium text-gray-800">{count}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showCountPanel && (
            <div className="absolute bottom-full left-0 mb-2 w-24 bg-white rounded-xl shadow-lg border border-gray-100 p-2 animate-fade-in z-10">
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setCount(num);
                    setShowCountPanel(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${
                    count === num
                      ? 'bg-[#FFEBEE] text-[#E53935] font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {num} 张
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="flex gap-3">
        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (prompt.trim() && !isDisabled) {
                  onGenerate();
                }
              }
            }}
            disabled={isDisabled}
            placeholder="描述你想要的运动装备设计，例如：红色渐变跑鞋，轻量化，科技感..."
            className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#E53935] focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
            rows={1}
          />
        </div>

        {/* Right Actions */}
        <div className="flex flex-col gap-2">
          {/* Upload Button (UI only) */}
          <button
            disabled={isDisabled}
            className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="上传图片（仅UI演示）"
          >
            <Upload className="w-5 h-5" />
          </button>

          {/* Generate Button */}
          <button
            onClick={onGenerate}
            disabled={isDisabled || !prompt.trim()}
            className="px-6 py-3 bg-xtep-gradient text-white font-medium rounded-xl hover:shadow-xtep-hover transition-all btn-press disabled:opacity-50 disabled:cursor-not-allowed focus-ring flex items-center gap-2"
          >
            {state.isGenerating ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                生成中
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                生成
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hint */}
      <p className="mt-2 text-xs text-gray-400 text-right">
        按 Enter 发送，Shift + Enter 换行
      </p>
    </div>
  );
}
