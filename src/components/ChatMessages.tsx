'use client';

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Message, GenerationParams, RESOLUTION_MAP, ASPECT_RATIO_MAP } from '@/types';
import { formatDate } from '@/lib/utils';
import { ChevronDown, ChevronRight, Brain, Loader2 } from 'lucide-react';

interface ChatMessagesProps {
  messages: Message[];
}

function ReasoningBlock({ reasoning, isGenerating }: { reasoning: string; isGenerating: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!reasoning && !isGenerating) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-500 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <Brain className="w-3.5 h-3.5" />
        {isGenerating && !reasoning ? (
          <span className="flex items-center gap-1">
            思考中
            <Loader2 className="w-3 h-3 animate-spin" />
          </span>
        ) : (
          <span>思考过程</span>
        )}
      </button>
      {isExpanded && reasoning && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-500 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
          {reasoning}
        </div>
      )}
    </div>
  );
}

/**
 * Extract image URLs from text content.
 * Handles formats like:
 * - Image: [url]
 * - ![alt](url)
 * - Plain URLs ending in image extensions
 */
function extractImageUrlsFromText(text: string): { cleanText: string; urls: string[] } {
  const urls: string[] = [];

  // Pattern 1: Image: [url] or 图片: [url]
  const imgRefRegex = /(?:Image|图片)\s*[:：]\s*\[([^\]]+)\]/g;
  let match;
  let cleanText = text;

  while ((match = imgRefRegex.exec(text)) !== null) {
    const url = match[1].trim();
    if (url.startsWith('http') || url.startsWith('/')) {
      urls.push(url);
    }
    cleanText = cleanText.replace(match[0], '');
  }

  // Pattern 2: ![alt](url)
  const mdImageRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  while ((match = mdImageRegex.exec(text)) !== null) {
    const url = match[1].trim();
    if (url.startsWith('http') || url.startsWith('/')) {
      if (!urls.includes(url)) {
        urls.push(url);
      }
    }
    cleanText = cleanText.replace(match[0], '');
  }

  // Pattern 3: Standalone URLs to image files (not already captured)
  const standaloneUrlRegex = /(?:^|\s)(https?:\/\/[^\s<>]+\.(?:png|jpg|jpeg|webp|gif)(?:\?[^\s<>]*)?)/gi;
  while ((match = standaloneUrlRegex.exec(text)) !== null) {
    const url = match[1].trim();
    if (!urls.includes(url)) {
      urls.push(url);
    }
    cleanText = cleanText.replace(match[0], '');
  }

  // Clean up leftover artifacts
  cleanText = cleanText
    .replace(/\[\s*\]/g, '') // Empty brackets
    .replace(/^\s*[:：]\s*$/gm, '') // Lone colons
    .replace(/\n{3,}/g, '\n\n') // Excessive newlines
    .trim();

  return { cleanText, urls };
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const { openImagePreview, state } = useApp();

  // Format params display
  const formatParams = (params: GenerationParams) => {
    const resolution = RESOLUTION_MAP[params.resolution];
    const ratio = ASPECT_RATIO_MAP[params.aspectRatio];
    const ratioDisplay = `${ratio.width}:${ratio.height}`;
    return `${resolution}px · ${ratioDisplay}`;
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {messages.map((message, index) => {
        // Extract image URLs from text content as fallback
        const { cleanText, urls: textImageUrls } = extractImageUrlsFromText(message.content || '');

        // Merge images from message.images and text-extracted URLs
        const allImageUrls = new Set<string>();
        const messageImages = message.images || [];

        // Add images from message.images
        messageImages.forEach(img => allImageUrls.add(img.url));

        // Add images extracted from text
        textImageUrls.forEach(url => allImageUrls.add(url));

        // Build final image list with proper objects
        const finalImages = Array.from(allImageUrls).map(url => {
          // Check if this URL exists in message.images (has metadata)
          const existingImg = messageImages.find(img => img.url === url);
          if (existingImg) return existingImg;
          // Create a new image object for text-extracted URLs
          return {
            id: `extracted-${index}-${url.slice(-20)}`,
            url,
            width: 1024,
            height: 1024,
            prompt: message.content?.slice(0, 100) || '',
            sessionId: '',
            sessionName: '',
            params: message.params || { resolution: '1K', aspectRatio: '1:1', count: 1 },
            timestamp: message.timestamp || Date.now(),
          };
        });

        return (
          <div
            key={message.id}
            className={`animate-fade-in ${message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {message.role === 'user' ? (
              /* User Message */
              <div className="max-w-[70%]">
                <div className="bg-white rounded-2xl rounded-tr-sm px-5 py-4 shadow-soft">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</p>
                  {message.params && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 text-xs font-medium text-[#E53935] bg-[#FFEBEE] rounded-lg">
                          {RESOLUTION_MAP[message.params.resolution]}
                        </span>
                        <span className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">
                          {message.params.aspectRatio}
                        </span>
                        <span className="px-2.5 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">
                          ×{message.params.count}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-gray-400 text-right">
                  {formatDate(message.timestamp)}
                </p>
              </div>
            ) : (
              /* Assistant Message */
              <div className="max-w-[85%]">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-xtep-gradient rounded-xl flex items-center justify-center flex-shrink-0 shadow-xtep">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Single content bubble for the assistant */}
                    <div className="bg-white rounded-2xl rounded-tl-sm px-5 py-4 shadow-soft">
                      {/* Thinking/generating state: no content yet */}
                      {state.isGenerating && !message.content && !message.reasoning && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>正在连接模型...</span>
                        </div>
                      )}
                      {state.isGenerating && message.content === '正在思考...' && !message.reasoning && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>正在思考...</span>
                        </div>
                      )}
                      {state.isGenerating && message.content === '正在生成图片...' && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>正在生成图片，请耐心等待...</span>
                        </div>
                      )}

                      {/* Reasoning block - shown once */}
                      {(message.reasoning || (state.isGenerating && !message.content)) && (
                        <ReasoningBlock
                          reasoning={message.reasoning || ''}
                          isGenerating={state.isGenerating}
                        />
                      )}

                      {/* Divider between reasoning and content */}
                      {message.reasoning && cleanText && cleanText !== '正在思考...' && (
                        <div className="border-t border-gray-100 pt-3 mt-1" />
                      )}

                      {/* Main text content - use cleaned text without image references */}
                      {cleanText && cleanText !== '正在思考...' && cleanText !== '正在生成图片...' && cleanText !== '正在连接模型...' && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {cleanText}
                        </p>
                      )}
                    </div>

                    {/* Generated Images Grid - from both message.images and text-extracted URLs */}
                    {finalImages.length > 0 && (
                      <div className="mt-3">
                        <div className={`grid gap-3 ${
                          finalImages.length === 1
                            ? 'grid-cols-1 max-w-md'
                            : 'grid-cols-2'
                        }`}>
                          {finalImages.map((img) => (
                            <div
                              key={img.id}
                              onClick={() => openImagePreview(img)}
                              className="group relative cursor-pointer img-zoom-container rounded-xl overflow-hidden shadow-soft"
                            >
                              <img
                                src={img.url}
                                alt={img.prompt}
                                className="w-full object-cover"
                                style={{
                                  aspectRatio: message.params
                                    ? `${ASPECT_RATIO_MAP[message.params.aspectRatio].width}/${ASPECT_RATIO_MAP[message.params.aspectRatio].height}`
                                    : '1/1',
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg">
                                  查看大图
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                          {finalImages.length} 张图片 · 点击查看大图
                        </p>
                      </div>
                    )}

                    <p className="mt-1.5 text-xs text-gray-400">
                      {formatDate(message.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
