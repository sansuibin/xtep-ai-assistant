'use client';

import { useState } from 'react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { ChatMessages } from '@/components/ChatMessages';
import { InputArea } from '@/components/InputArea';
import { LoginModal } from '@/components/LoginModal';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import {
  GeneratedImage,
  GenerationParams,
} from '@/types';
import { generateId } from '@/lib/utils';

// Main App Component
function XtepAIApp() {
  const { state, getCurrentSession, addMessage, updateMessage, addGeneratedImages, setGenerating } = useApp();
  const [prompt, setPrompt] = useState('');

  // Handle example prompt selection
  const handleSelectExample = (examplePrompt: string) => {
    setPrompt(examplePrompt);
  };

  // Generate images using Gemini multimodal model (streaming)
  const handleGenerate = async () => {
    if (!prompt.trim() || !state.user || !state.currentSessionId) return;

    const session = getCurrentSession();
    if (!session) return;

    const params: GenerationParams = {
      resolution: '1K',
      aspectRatio: '1:1',
      count: 1,
    };

    // Add user message
    addMessage(state.currentSessionId, {
      role: 'user',
      content: prompt,
      params,
    });

    // Calculate the index of the assistant message BEFORE adding it
    // (React batches state updates, so getCurrentSession() would return stale data)
    const assistantMsgIndex = session.messages.length + 1;

    // Add placeholder assistant message for streaming
    addMessage(state.currentSessionId, {
      role: 'assistant',
      content: '',
      params,
      images: [],
      reasoning: '',
    });

    const currentPrompt = prompt;
    setPrompt('');
    setGenerating(true);

    try {
      // Build conversation history for context
      const history = session.messages.map(msg => ({
        role: msg.role,
        parts: [
          { text: msg.content },
          ...(msg.images?.map(img => ({ imageUrl: img.url })) || []),
        ],
      }));

      // Call streaming chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: state.user.id,
          prompt: currentPrompt,
          sessionId: state.currentSessionId,
          sessionName: session.name,
          history: history,
          imageSize: '1K',
          aspectRatio: '1:1',
        }),
      });

      if (!response.ok) {
        let errorMsg = 'API 调用失败';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          // ignore parse error
        }
        throw new Error(errorMsg);
      }

      // Process streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let fullReasoning = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line);

            if (parsed.type === 'reasoning') {
              fullReasoning += parsed.content;
              // Update the existing assistant message in-place
              updateMessage(state.currentSessionId!, assistantMsgIndex, {
                content: fullText || '正在思考...',
                reasoning: fullReasoning,
              });
            } else if (parsed.type === 'text') {
              fullText += parsed.content;
              updateMessage(state.currentSessionId!, assistantMsgIndex, {
                content: fullText,
                reasoning: fullReasoning,
              });
            } else if (parsed.type === 'done') {
              const doneData = parsed.data;
              const finalText = doneData.text || fullText;
              const imageUrls: string[] = doneData.images || [];

              // Final update with all images
              const images: GeneratedImage[] = imageUrls.map((url: string) => ({
                id: generateId(),
                url,
                width: 1024,
                height: 1024,
                prompt: currentPrompt,
                sessionId: state.currentSessionId!,
                sessionName: session.name,
                params,
                timestamp: Date.now(),
              }));

              updateMessage(state.currentSessionId!, assistantMsgIndex, {
                content: finalText || (images.length > 0 ? '生成完成' : '未生成图片'),
                images: images.length > 0 ? images : undefined,
                reasoning: doneData.reasoning || fullReasoning,
              });

              // Add to gallery
              if (images.length > 0) {
                addGeneratedImages(images);
              }
            } else if (parsed.type === 'error') {
              throw new Error(parsed.content || '流式响应错误');
            }
          } catch (parseError) {
            // Skip non-JSON lines
          }
        }
      }
    } catch (error) {
      console.error('Generation error:', error);
      // Update the assistant message with error
      updateMessage(state.currentSessionId!, assistantMsgIndex, {
        content: `生成失败: ${error instanceof Error ? error.message : '请检查 API 配置'}`,
        reasoning: undefined,
      });
    } finally {
      setGenerating(false);
    }
  };

  // Get current session messages
  const currentSession = getCurrentSession();
  const messages = currentSession?.messages || [];

  return (
    <div className="h-screen flex flex-col bg-[#F9FAFB]">
      {/* Navbar */}
      <Navbar />

      {/* Login Modal */}
      <LoginModal />

      {/* Image Preview Modal */}
      <ImagePreviewModal />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Chat Area */}
        <main className="flex-1 flex flex-col">
          {/* Messages or Welcome */}
          {state.user && messages.length > 0 ? (
            <ChatMessages messages={messages} />
          ) : (
            <WelcomeScreen onSelectExample={handleSelectExample} />
          )}

          {/* Input Area */}
          <InputArea
            prompt={prompt}
            onPromptChange={setPrompt}
            onGenerate={handleGenerate}
          />
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <XtepAIApp />
    </AppProvider>
  );
}
