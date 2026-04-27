import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Content, Part } from '@google/generative-ai';
import { generateId } from '@/lib/utils';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { queryOne } from '@/lib/db';

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

// Get user's API key from database
async function getUserApiKey(userId: string): Promise<string | null> {
  try {
    const user = await queryOne<{ api_key: string; is_active: boolean }>(
      'SELECT api_key, is_active FROM api_configs WHERE user_id = $1 AND is_active = true LIMIT 1',
      [userId]
    );
    return user?.api_key || null;
  } catch (error) {
    console.error('Error fetching user API key:', error);
    return null;
  }
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
    // In production, return a route that serves the file
    return `/api/images/${filename}`;
  } else {
    return `/chat-images/${filename}`;
  }
}

// Convert history to Gemini format
async function convertHistoryToGemini(history: ChatMessage[]): Promise<Content[]> {
  const contents: Content[] = [];
  
  for (const msg of history) {
    const parts: Part[] = [];
    
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
  
  return contents;
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

    // Get user's API key
    let apiKey = process.env.GOOGLE_API_KEY; // Fallback to env var
    
    if (userId) {
      const userApiKey = await getUserApiKey(userId);
      if (userApiKey) {
        apiKey = userApiKey;
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured. Please set GOOGLE_API_KEY environment variable or add API key in admin panel.' },
        { status: 500 }
      );
    }

    // Initialize Gemini client
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.1-flash-image-preview',
    });

    // Build contents with history
    const contents: Content[] = await convertHistoryToGemini(history);
    
    // Add current prompt
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    // Configure generation
    const generationConfig = {
      thinkingConfig: {
        thinkingBudget: 1024, // Enable thinking
      },
      responseModalities: ['TEXT', 'IMAGE'] as string[],
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: imageSize,
        outputMimeType: 'image/png',
      },
    };

    // Generate content stream
    const result = await model.generateContentStream({
      contents,
      generationConfig,
    });

    // Collect response
    const responseParts: { text?: string; imageUrl?: string }[] = [];
    let hasImage = false;

    for await (const chunk of result.stream) {
      const candidate = chunk.candidates?.[0];
      if (!candidate?.content?.parts) continue;

      for (const part of candidate.content.parts) {
        if (part.text) {
          responseParts.push({ text: part.text });
        } else if (part.inlineData) {
          // Save image to file
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
        ? `Generated ${imageUrls.length} image(s)`
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
  const apiKey = process.env.GOOGLE_API_KEY;

  return NextResponse.json({
    status: 'ok',
    service: 'Xtep AI Multimodal Chat',
    model: 'gemini-3.1-flash-image-preview',
    apiKeyConfigured: !!apiKey,
    apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : null,
    features: [
      'Text generation',
      'Image generation',
      'Multi-turn conversation',
      'Image input support',
    ],
  });
}
