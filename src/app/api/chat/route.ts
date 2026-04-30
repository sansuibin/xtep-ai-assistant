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
async function saveImageToFile(base64Data: string, sessionId: string, mimeType?: string): Promise<string> {
  await ensureImageDir();

  const ext = mimeType === 'jpeg' || mimeType === 'jpg' ? 'jpg'
    : mimeType === 'webp' ? 'webp'
    : mimeType === 'gif' ? 'gif'
    : 'png';
  const filename = `${sessionId}-${generateId()}.${ext}`;
  const filepath = path.join(IMAGE_DIR, filename);
  const buffer = Buffer.from(base64Data, 'base64');

  console.log('[chat] Saving image:', filename, 'size:', buffer.length, 'bytes');

  await writeFile(filepath, buffer);

  // Return URL path accessible from browser
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

              // Handle main content - accumulate ALL content, don't try to detect images mid-stream
              if (delta.content) {
                contentText += delta.content;

                // Only forward text content that is clearly NOT base64 data
                // Base64 image data is typically very long and contains only A-Za-z0-9+/=
                const contentStr = delta.content;
                const isLikelyBase64 = /^[A-Za-z0-9+/=\s]{50,}$/.test(contentStr.trim());

                if (!isLikelyBase64 && !contentStr.includes('data:image')) {
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

          // Stream ended - extract images from accumulated content
          console.log('[chat] Stream ended. Total content length:', contentText.length);
          console.log('[chat] Content preview (first 500 chars):', contentText.substring(0, 500));
          console.log('[chat] Content contains data:image:', contentText.includes('data:image'));
          console.log('[chat] Content contains base64,:', contentText.includes(';base64,'));

          let textWithoutImages = contentText;

          // Extract base64 images from content using a robust approach
          // Find all occurrences of data:image/...;base64, and extract the base64 data
          const base64Marker = ';base64,';
          let searchPos = 0;
          const processedRanges: Array<{ start: number; end: number; url: string }> = [];

          while (true) {
            const markerIndex = contentText.indexOf(base64Marker, searchPos);
            if (markerIndex === -1) break;

            // Find the start of the data:image/ prefix (go back to find 'data:')
            let dataImageStart = contentText.lastIndexOf('data:image/', markerIndex);
            if (dataImageStart === -1 || dataImageStart < searchPos - 200) {
              // data:image/ prefix is too far back, skip
              searchPos = markerIndex + base64Marker.length;
              continue;
            }

            // Find the MIME type
            const mimeStart = dataImageStart + 'data:image/'.length;
            const mimeEnd = contentText.indexOf(';', mimeStart);
            if (mimeEnd !== markerIndex) {
              // MIME type doesn't match, skip
              searchPos = markerIndex + base64Marker.length;
              continue;
            }
            const mimeType = contentText.substring(mimeStart, mimeEnd);

            // Extract base64 data - find the end of base64 content
            const base64Start = markerIndex + base64Marker.length;
            let base64End = base64Start;

            // Skip any leading whitespace/newlines
            while (base64End < contentText.length && /\s/.test(contentText[base64End])) {
              base64End++;
            }

            // Collect base64 characters
            while (base64End < contentText.length && /[A-Za-z0-9+/=]/.test(contentText[base64End])) {
              base64End++;
            }

            const base64Data = contentText.substring(base64Start, base64End).replace(/\s/g, '');

            if (base64Data.length < 100) {
              // Too short to be a real image, skip
              searchPos = base64End;
              continue;
            }

            // Find the full extent of this image reference (including markdown wrapper if any)
            let refStart = dataImageStart;
            let refEnd = base64End;

            // Check if wrapped in markdown: ![alt](data:image/...)
            if (refStart > 0) {
              const beforeRef = contentText.substring(Math.max(0, refStart - 50), refStart);
              const mdMatch = beforeRef.match(/!\[[^\]]*\]\($/);
              if (mdMatch) {
                refStart = refStart - mdMatch[0].length;
              }
            }

            // Check for closing parenthesis after base64 data
            let closeCheck = base64End;
            while (closeCheck < contentText.length && /\s/.test(contentText[closeCheck])) {
              closeCheck++;
            }
            if (closeCheck < contentText.length && contentText[closeCheck] === ')') {
              refEnd = closeCheck + 1;
            }

            // Skip if this range overlaps with an already processed one
            const overlaps = processedRanges.some(r =>
              (refStart >= r.start && refStart < r.end) || (r.start >= refStart && r.start < refEnd)
            );
            if (overlaps) {
              searchPos = refEnd;
              continue;
            }

            try {
              const imageUrl = await saveImageToFile(base64Data, sessionId, mimeType);
              imageUrls.push(imageUrl);
              processedRanges.push({ start: refStart, end: refEnd, url: imageUrl });
              console.log('[chat] Saved base64 image:', imageUrl, 'size:', base64Data.length, 'type:', mimeType);
            } catch (e) {
              console.error('[chat] Error saving base64 image:', e);
            }

            searchPos = refEnd;
          }

          // Also check for HTTP/HTTPS image URLs from the model (not base64)
          // Pattern: ![alt](https://...) or Image: [https://...]
          const httpImageRegex = /!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g;
          let httpMatch;
          while ((httpMatch = httpImageRegex.exec(contentText)) !== null) {
            const url = httpMatch[1];
            if (!imageUrls.includes(url)) {
              imageUrls.push(url);
              console.log('[chat] Found HTTP image URL:', url);
            }
          }

          // Remove all image references from text
          for (const range of processedRanges) {
            textWithoutImages = textWithoutImages.replace(
              contentText.substring(range.start, range.end),
              ''
            );
          }
          // Clean up remaining patterns
          textWithoutImages = textWithoutImages
            .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
            .replace(/Image:\s*\[https?:\/\/[^\]]+\]/g, '')
            .replace(/\[图片\d*\]/g, '')
            .trim();

          console.log('[chat] Extracted', imageUrls.length, 'images');
          console.log('[chat] Image URLs:', imageUrls);
          console.log('[chat] Final text (first 300 chars):', textWithoutImages.substring(0, 300));

          // Send final summary
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'done',
            data: {
              text: textWithoutImages,
              images: imageUrls,
              hasImage: imageUrls.length > 0,
              reasoning: reasoningText,
            },
          }) + '\n'));

          controller.close();
        } catch (error) {
          console.error('[chat] Stream processing error:', error);
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
