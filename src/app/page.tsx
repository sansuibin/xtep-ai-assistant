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
  RESOLUTION_MAP,
  ASPECT_RATIO_MAP,
} from '@/types';
import { generateId } from '@/lib/utils';

// Helper function to generate mock images
function generateMockImages(
  prompt: string,
  params: GenerationParams,
  sessionName: string,
  sessionId: string
): GeneratedImage[] {
  const resolution = RESOLUTION_MAP[params.resolution];
  const ratio = ASPECT_RATIO_MAP[params.aspectRatio];
  const width = resolution;
  const height = Math.round(resolution * (ratio.height / ratio.width));

  return Array.from({ length: params.count }, (_, i) => ({
    id: generateId(),
    url: `https://picsum.photos/${width}/${height}?random=${Date.now()}-${i}`,
    width,
    height,
    prompt,
    sessionId,
    sessionName,
    params,
    timestamp: Date.now(),
  }));
}

// Main App Component
function XtepAIApp() {
  const { state, getCurrentSession, addMessage, addGeneratedImages, setGenerating } = useApp();
  const [prompt, setPrompt] = useState('');

  // Handle example prompt selection
  const handleSelectExample = (examplePrompt: string) => {
    setPrompt(examplePrompt);
  };

  // Generate images
  const handleGenerate = async () => {
    if (!prompt.trim() || !state.user || !state.currentSessionId) return;

    const session = getCurrentSession();
    if (!session) return;

    const params: GenerationParams = {
      resolution: '1K',
      aspectRatio: '1:1',
      count: 2,
    };

    // Add user message
    addMessage(state.currentSessionId, {
      role: 'user',
      content: prompt,
      params,
    });

    setPrompt('');
    setGenerating(true);

    try {
      // Call API to generate images
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          params,
          sessionId: state.currentSessionId,
          sessionName: session.name,
        }),
      });

      const data = await response.json();

      if (data.images && data.images.length > 0) {
        // Add assistant message with generated images
        addMessage(state.currentSessionId, {
          role: 'assistant',
          content: `✨ 生成 ${data.images.length} 张图片成功`,
          params,
          images: data.images,
        });

        // Add to gallery
        addGeneratedImages(data.images);
      } else {
        // Fallback: generate mock images if API fails
        const mockImages = generateMockImages(
          prompt,
          params,
          session.name,
          state.currentSessionId
        );
        addMessage(state.currentSessionId, {
          role: 'assistant',
          content: `✨ 生成 ${mockImages.length} 张图片成功`,
          params,
          images: mockImages,
        });
        addGeneratedImages(mockImages);
      }
    } catch {
      // Fallback: generate mock images
      const mockImages = generateMockImages(
        prompt,
        params,
        session.name,
        state.currentSessionId
      );
      addMessage(state.currentSessionId, {
        role: 'assistant',
        content: `✨ 生成 ${mockImages.length} 张图片成功`,
        params,
        images: mockImages,
      });
      addGeneratedImages(mockImages);
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
