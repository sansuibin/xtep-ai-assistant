import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { generateId } from '@/lib/utils';
import { writeFile, mkdir } from 'fs/promises';
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

// Image storage directory
const IMAGE_DIR = process.env.NODE_ENV === 'production' 
  ? '/tmp/chat-images' 
  : path.join(process.env.COZE_WORKSPACE_PATH || '/workspace/projects', 'public/chat-images');

// Ensure image directory exists
async function ensureImageDir() {
  if (!existsSync(IMAGE_DIR)) {
    await mkdir(IMAGE_DIR, { recursive: true });
  }
}

// Get API key from environment
function getApiKey(): string | null {
  // 优先使用 GOOGLE_CLOUD_API_KEY（用于 @google/genai SDK）
  return process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_API_KEY || null;
}

// Convert local image URL to base64
async function imageUrlToBase64(imageUrl: string): Promise<string | null> {
  try {
    // If it's already a base64 data URL, extract the base64 part
    if (imageUrl.startsWith('data:')) {
      return imageUrl.split(',')[1];
    }
    
    // If it's a local file path
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
  
  // Return public URL
  if (process.env.NODE_ENV === 'production') {
    return `/api/images/${filename}`;
  } else {
    return `/chat-images/${filename}`;
  }
}

// Image generation API route with Gemini multimodal model
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

    // Get API key
    const apiKey = getApiKey();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured. Please set GOOGLE_CLOUD_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Initialize Gemini client with new SDK
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    // Build contents
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

    // Configure generation
    const generationConfig = {
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
    };

    // Generate content stream
    const streamingResp = await ai.models.generateContentStream({
      model: 'gemini-3.1-flash-image-preview',
      contents,
      config: generationConfig,
    });

    // Collect response
    const responseParts: { text?: string; imageUrl?: string }[] = [];
    let hasImage = false;

    for await (const chunk of streamingResp) {
      if (chunk.text) {
        responseParts.push({ text: chunk.text });
      } else if (chunk.candidates?.[0]?.content?.parts) {
        for (const part of chunk.candidates[0].content.parts) {
          if (part.text) {
            responseParts.push({ text: part.text });
          } else if (part.inlineData) {
            const imageUrl = await saveImageToFile(part.inlineData.data || '', sessionId);
            responseParts.push({ imageUrl });
            hasImage = true;
          }
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
      provider: 'gemini-multimodal',
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
  const apiKey = getApiKey();

  return NextResponse.json({
    status: 'ok',
    service: 'Xtep AI Multimodal Chat',
    model: 'gemini-3.1-flash-image-preview',
    apiKeyConfigured: !!apiKey,
    apiKeyPreview: apiKey ? apiKey.substring(0, 8) + '...' : null,
    features: [
      'Text generation',
      'Image generation',
      'Multi-turn conversation',
      'Image input support',
    ],
  });
}
