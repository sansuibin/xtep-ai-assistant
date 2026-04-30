'use client';

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Message, GenerationParams, RESOLUTION_MAP, ASPECT_RATIO_MAP } from '@/types';
import { formatDate } from '@/lib/utils';
import { Image, ChevronDown, ChevronRight, Brain, Loader2 } from 'lucide-react';

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
      {messages.map((message, index) => (
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
                    {/* Thinking state: no content yet */}
                    {state.isGenerating && !message.content && !message.reasoning && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>正在思考...</span>
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
                    {message.reasoning && message.content && message.content !== '正在思考...' && (
                      <div className="border-t border-gray-100 pt-3 mt-1" />
                    )}

                    {/* Main text content */}
                    {message.content && message.content !== '正在思考...' && (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
                  </div>

                  {/* Generated Images Grid */}
                  {message.images && message.images.length > 0 && (
                    <div className="mt-3">
                      <div className={`grid gap-3 ${
                        message.images.length === 1
                          ? 'grid-cols-1 max-w-md'
                          : 'grid-cols-2'
                      }`}>
                        {message.images.map((img) => (
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
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-xs text-white line-clamp-2">{img.prompt}</p>
                            </div>
                            {/* Download indicator */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="px-2 py-1 bg-white/90 rounded-lg">
                                <Image className="w-4 h-4 text-gray-700" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <p className="mt-2 ml-12 text-xs text-gray-400">
                {formatDate(message.timestamp)}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
