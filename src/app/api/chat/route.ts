import { NextRequest, NextResponse } from 'next/server';
import { generateId } from '@/lib/utils';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Request body type
interface ChatRequest {
  userId: string;
  prompt: string;
  sessionId: string;
  sessionName: string;
  history?: ChatMessage[];
  imageSize?: '1K' | '2K';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{
    text?: string;
    imageUrl?: string;
  }>;
}

// User config type
interface UserConfig {
  id: string;
  username: string;
  password: string;
  apiKey: string;
  model: string;
  isActive: boolean;
}

// Image storage directory
const IMAGE_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/chat-images'
  : path.join(process.cwd(), 'public/chat-images');

// User config file path
const USER_CONFIG_PATH = path.join(process.cwd(), 'users.json');

// Ensure image directory exists
async function ensureImageDir() {
  if (!existsSync(IMAGE_DIR)) {
    await mkdir(IMAGE_DIR, { recursive: true });
  }
}

// Load user configs from file
async function loadUserConfigs(): Promise<UserConfig[]> {
  try {
    if (!existsSync(USER_CONFIG_PATH)) {
      const defaultConfigs: UserConfig[] = [
        {
          id: 'demo',
          username: '测试用户',
          password: 'demo123',
          apiKey: process.env.EASYROUTER_API_KEY || '',
          model: 'gemini-3.1-flash-image-preview',
          isActive: true,
        },
      ];
      await writeFile(USER_CONFIG_PATH, JSON.stringify(defaultConfigs, null, 2), 'utf-8');
      return defaultConfigs;
    }
    const data = await readFile(USER_CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading user configs:', error);
    return [];
  }
}

// Get user by ID
async function getUserById(userId: string): Promise<UserConfig | null> {
  const configs = await loadUserConfigs();
  return configs.find(u => u.id === userId && u.isActive) || null;
}

// Convert local image URL to base64 data URL for API
async function imageUrlToDataUrl(imageUrl: string): Promise<string | null> {
  try {
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // Local file path
    if (imageUrl.startsWith('/chat-images/')) {
      const filepath = path.join(process.cwd(), 'public', imageUrl);
      if (existsSync(filepath)) {
        const buffer = await readFile(filepath);
        const base64 = buffer.toString('base64');
        return `data:image/png;base64,${base64}`;
      }
    }

    // HTTP URL
    if (imageUrl.startsWith('http')) {
      const response = await fetch(imageUrl);
      if (!response.ok) return null;
      const buffer = Buffer.from(await response.arrayBuffer());
      const base64 = buffer.toString('base64');
      const contentType = response.headers.get('content-type') || 'image/png';
      return `data:${contentType};base64,${base64}`;
    }

    return null;
  } catch (error) {
    console.error('Error converting image to data URL:', error);
    return null;
  }
}

// Save base64 image to file, return public URL
async function saveImageToFile(base64Data: string, sessionId: string): Promise<string> {
  await ensureImageDir();

  const filename = `${sessionId}-${generateId()}.png`;
  const filepath = path.join(IMAGE_DIR, filename);
  const buffer = Buffer.from(base64Data, 'base64');

  await writeFile(filepath, buffer);

  if (process.env.NODE_ENV === 'production') {
    return `/api/images/${filename}`;
  } else {
    return `/chat-images/${filename}`;
  }
}

// Chat API - Streaming with OpenAI format via EasyRouter
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { userId, prompt, sessionId, sessionName, history = [], imageSize = '1K', aspectRatio = '1:1' } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Get user config
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 });
    }

    const apiKey = user.apiKey || process.env.EASYROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured. Please set EASYROUTER_API_KEY or configure user API key.' },
        { status: 500 }
      );
    }

    const baseUrl = process.env.EASYROUTER_BASE_URL || 'https://easyrouter.io';
    const model = user.model || 'gemini-3.1-flash-image-preview';

    // Build OpenAI format messages
    const messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [];

    // Add history
    for (const msg of history) {
      const parts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

      for (const part of msg.parts) {
        if (part.text) {
          parts.push({ type: 'text', text: part.text });
        } else if (part.imageUrl) {
          const dataUrl = await imageUrlToDataUrl(part.imageUrl);
          if (dataUrl) {
            parts.push({ type: 'image_url', image_url: { url: dataUrl } });
          }
        }
      }

      if (parts.length > 0) {
        const content = parts.length === 1 && parts[0].type === 'text' && parts[0].text
          ? parts[0].text
          : parts;
        messages.push({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content,
        });
      }
    }

    // Add current prompt
    messages.push({ role: 'user', content: prompt });

    // Call EasyRouter with streaming (OpenAI format)
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 32768,
        temperature: 1,
        top_p: 0.95,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('EasyRouter API error:', response.status, errorText);
      return NextResponse.json(
        { error: `API call failed: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    // Process streaming response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let reasoningText = '';
    let contentText = '';
    let imageUrls: string[] = [];
    let hasImage = false;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;

              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                if (!delta) continue;

                // Handle reasoning content (thinking process)
                if (delta.reasoning_content) {
                  reasoningText += delta.reasoning_content;
                  controller.enqueue(encoder.encode(JSON.stringify({
                    type: 'reasoning',
                    content: delta.reasoning_content,
                  }) + '\n'));
                }

                // Handle main content
                if (delta.content) {
                  // Check if content contains base64 image
                  const contentStr = delta.content;

                  if (contentStr.includes('data:image')) {
                    // Accumulate image data - we'll process it at the end
                    contentText += contentStr;
                  } else {
                    contentText += contentStr;
                    controller.enqueue(encoder.encode(JSON.stringify({
                      type: 'text',
                      content: contentStr,
                    }) + '\n'));
                  }
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }

          // Process any accumulated content for images
          // Parse markdown image patterns: ![image](data:image/png;base64,...)
          const imageRegex = /!\[image\]\(data:image\/[^;]+;base64,([^)]+)\)/g;
          let match;
          let textWithoutImages = contentText;

          while ((match = imageRegex.exec(contentText)) !== null) {
            const base64Data = match[1];
            try {
              const imageUrl = await saveImageToFile(base64Data, sessionId);
              imageUrls.push(imageUrl);
              hasImage = true;
              // Replace image markdown with placeholder
              textWithoutImages = textWithoutImages.replace(match[0], `[图片${imageUrls.length}]`);
            } catch (e) {
              console.error('Error saving image:', e);
            }
          }

          // Also check for direct base64 in content without markdown wrapper
          const directBase64Regex = /data:image\/[^;]+;base64,([A-Za-z0-9+/=]{100,})/g;
          while ((match = directBase64Regex.exec(contentText)) !== null) {
            // Skip if already processed as markdown image
            if (contentText.includes(`![image](${match[0]})`)) continue;

            const base64Data = match[1];
            try {
              const imageUrl = await saveImageToFile(base64Data, sessionId);
              // Only add the last image (avoid duplicates from thinking)
              if (!imageUrls.includes(imageUrl)) {
                imageUrls.push(imageUrl);
                hasImage = true;
              }
            } catch (e) {
              console.error('Error saving image:', e);
            }
          }

          // Send final summary
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'done',
            data: {
              text: textWithoutImages.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]{100,}/g, '[图片]'),
              images: imageUrls,
              hasImage,
              reasoning: reasoningText,
            },
          }) + '\n'));

          controller.close();
        } catch (error) {
          console.error('Stream processing error:', error);
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'error',
            content: error instanceof Error ? error.message : 'Stream processing error',
          }) + '\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate content' },
      { status: 500 }
    );
  }
}

// GET - Check API status
export async function GET() {
  const baseUrl = process.env.EASYROUTER_BASE_URL || 'https://easyrouter.io';
  const defaultApiKey = process.env.EASYROUTER_API_KEY;

  return NextResponse.json({
    status: 'ok',
    service: '特步AI生图助手',
    provider: 'EasyRouter + Gemini (OpenAI Format)',
    model: 'gemini-3.1-flash-image-preview',
    baseUrl,
    defaultApiKeyConfigured: !!defaultApiKey,
    streamSupported: true,
    features: [
      'Streaming response',
      'Reasoning/thinking display',
      'Image generation',
      'Multi-turn conversation',
      'Per-user API Key',
    ],
  });
}
