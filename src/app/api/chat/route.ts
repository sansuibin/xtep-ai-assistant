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
const USER_CONFIG_PATH = path.join(
  process.cwd(), 
  'users.json'
);

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
      // Create default config
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

// Convert local image URL to base64
async function imageUrlToBase64(imageUrl: string): Promise<string | null> {
  try {
    if (imageUrl.startsWith('data:')) {
      return imageUrl.split(',')[1];
    }
    
    if (imageUrl.startsWith('/') || imageUrl.startsWith('http')) {
      const response = await fetch(imageUrl);
      if (!response.ok) return null;
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer).toString('base64');
    }
    
    return null;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

// Save base64 image to file
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

// Chat API route using EasyRouter with Gemini native format
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { userId, prompt, sessionId, sessionName, history = [], imageSize = '1K', aspectRatio = '1:1' } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get user config
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      );
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

    // Build Gemini native format contents
    const contents: Array<{
      role: string;
      parts: Array<{
        text?: string;
        inlineData?: { mimeType: string; data: string };
      }>;
    }> = [];
    
    // Add history
    for (const msg of history) {
      const parts: Array<{
        text?: string;
        inlineData?: { mimeType: string; data: string };
      }> = [];
      
      for (const part of msg.parts) {
        if (part.text) {
          parts.push({ text: part.text });
        } else if (part.imageUrl) {
          const base64 = await imageUrlToBase64(part.imageUrl);
          if (base64) {
            parts.push({
              inlineData: {
                mimeType: 'image/png',
                data: base64,
              },
            });
          }
        }
      }
      
      if (parts.length > 0) {
        contents.push({
          role: msg.role === 'model' ? 'model' : 'user',
          parts,
        });
      }
    }
    
    // Add current prompt
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    // Build Gemini native format request body
    const requestBody = {
      contents,
      generationConfig: {
        maxOutputTokens: 32768,
        temperature: 1,
        topP: 0.95,
        responseModalities: ['TEXT', 'IMAGE'],
        thinkingConfig: {
          thinkingLevel: 'HIGH',
        },
        imageConfig: {
          aspectRatio: aspectRatio || '1:1',
          imageSize: imageSize || '1K',
          outputMimeType: 'image/png',
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' },
        ],
      },
    };

    // Call EasyRouter API (Gemini native format)
    const response = await fetch(
      `${baseUrl}/v1beta/models/${model}:generateContent/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('EasyRouter API error:', response.status, errorText);
      return NextResponse.json(
        { error: `API call failed: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    // Parse response
    const responseParts: { text?: string; imageUrl?: string }[] = [];
    let hasImage = false;

    if (result.candidates?.[0]?.content?.parts) {
      for (const part of result.candidates[0].content.parts) {
        if (part.text) {
          responseParts.push({ text: part.text });
        } else if (part.inlineData) {
          const imageUrl = await saveImageToFile(part.inlineData.data || '', sessionId);
          responseParts.push({ imageUrl });
          hasImage = true;
        }
      }
    }

    // Extract text response
    const textResponse = responseParts
      .filter(p => p.text)
      .map(p => p.text)
      .join('');

    // Extract image URLs
    const imageUrls = responseParts
      .filter(p => p.imageUrl)
      .map(p => p.imageUrl!);

    return NextResponse.json({
      success: true,
      sessionId,
      response: {
        text: textResponse,
        images: imageUrls,
        hasImage,
      },
      message: hasImage 
        ? 'Generated ' + imageUrls.length + ' image(s)'
        : 'Response generated (no image)',
      provider: 'easyrouter-gemini',
    });

  } catch (error) {
    console.error('Chat generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate content' },
      { status: 500 }
    );
  }
}

// GET request to check API status
export async function GET() {
  const baseUrl = process.env.EASYROUTER_BASE_URL || 'https://easyrouter.io';
  const defaultApiKey = process.env.EASYROUTER_API_KEY;

  return NextResponse.json({
    status: 'ok',
    service: '特步AI生图助手',
    provider: 'EasyRouter + Gemini',
    model: 'gemini-3.1-flash-image-preview',
    baseUrl,
    defaultApiKeyConfigured: !!defaultApiKey,
    features: [
      'Text generation',
      'Image generation',
      'Multi-turn conversation',
      'Image input support',
      'Per-user API Key',
    ],
  });
}
