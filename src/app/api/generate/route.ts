import { NextRequest, NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import { GeneratedImage, GenerationParams, RESOLUTION_MAP, ASPECT_RATIO_MAP } from '@/types';
import { generateId } from '@/lib/utils';

// Request body type
interface GenerateRequest {
  prompt: string;
  params: GenerationParams;
  sessionId?: string;
  sessionName?: string;
}

// Vertex AI client singleton
let vertexAIInstance: VertexAI | null = null;

function getVertexAIInstance(): VertexAI | null {
  const projectId = process.env.VERTEX_AI_PROJECT_ID;
  if (!projectId) {
    return null;
  }

  if (!vertexAIInstance) {
    vertexAIInstance = new VertexAI({
      project: projectId,
      location: process.env.VERTEX_AI_LOCATION || 'us-central1',
    });
  }
  return vertexAIInstance;
}

// Resolution to pixel mapping for API
function getResolutionForAPI(resolution: string): { width: number; height: number } {
  const baseResolution = RESOLUTION_MAP[resolution as keyof typeof RESOLUTION_MAP] || 1024;
  return {
    width: baseResolution,
    height: baseResolution,
  };
}

// Generate image using Vertex AI Imagen
async function generateWithVertexAI(
  prompt: string,
  params: GenerationParams,
  count: number
): Promise<GeneratedImage[]> {
  const vertexAI = getVertexAIInstance();
  
  if (!vertexAI) {
    throw new Error('Vertex AI not configured');
  }

  const generativeModel = vertexAI.getGenerativeModel({
    model: process.env.VERTEX_AI_IMAGE_MODEL || 'imagegeneration@006',
  });

  const images: GeneratedImage[] = [];
  const resolution = RESOLUTION_MAP[params.resolution];
  const ratio = ASPECT_RATIO_MAP[params.aspectRatio];
  const width = resolution;
  const height = Math.round(resolution * (ratio.height / ratio.width));

  for (let i = 0; i < count; i++) {
    try {
      const result = await generativeModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      });

      const response = result.response;
      
      // Extract image from response
      const base64Image = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (base64Image) {
        // Convert base64 to data URL
        const imageUrl = `data:image/png;base64,${base64Image}`;
        
        images.push({
          id: generateId(),
          url: imageUrl,
          width,
          height,
          prompt,
          sessionId: '',
          sessionName: '',
          params,
          timestamp: Date.now(),
        });
      } else {
        throw new Error('No image in response');
      }
    } catch (error) {
      console.error(`Error generating image ${i + 1}:`, error);
      // Continue with other images
    }
  }

  return images;
}

// Image generation API route
export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { prompt, params, sessionId, sessionName } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Validate params
    const resolution = RESOLUTION_MAP[params?.resolution || '1K'];
    const ratio = ASPECT_RATIO_MAP[params?.aspectRatio || '1:1'];
    const count = Math.min(Math.max(params?.count || 2, 1), 4);

    // Check if Vertex AI is enabled and configured
    const enableVertexAI = process.env.ENABLE_VERTEX_AI === 'true';
    const hasVertexAIConfig = !!process.env.VERTEX_AI_PROJECT_ID;

    if (enableVertexAI && hasVertexAIConfig) {
      // Use Vertex AI Imagen for image generation
      console.log('Using Vertex AI Imagen for image generation');
      
      const images = await generateWithVertexAI(prompt, params || { resolution: '1K', aspectRatio: '1:1', count: 2 }, count);
      
      // Add session info to images
      const processedImages = images.map(img => ({
        ...img,
        sessionId: sessionId || 'default',
        sessionName: sessionName || '默认会话',
      }));

      return NextResponse.json({
        success: true,
        images: processedImages,
        message: `Generated ${processedImages.length} images successfully using Vertex AI`,
        provider: 'vertex-ai',
      });
    } else {
      // Fallback: generate placeholder images using picsum.photos
      console.log('Vertex AI not configured, using placeholder images');
      
      const width = resolution;
      const height = Math.round(resolution * (ratio.height / ratio.width));

      const images: GeneratedImage[] = Array.from({ length: count }, (_, i) => ({
        id: generateId(),
        url: `https://picsum.photos/${width}/${height}?random=${Date.now()}-${i}`,
        width,
        height,
        prompt,
        sessionId: sessionId || 'default',
        sessionName: sessionName || '默认会话',
        params: {
          resolution: params?.resolution || '1K',
          aspectRatio: params?.aspectRatio || '1:1',
          count,
        },
        timestamp: Date.now(),
      }));

      // Simulate generation delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return NextResponse.json({
        success: true,
        images,
        message: `Generated ${count} placeholder images (configure Vertex AI for real generation)`,
        provider: 'placeholder',
      });
    }
  } catch (error) {
    console.error('Image generation error:', error);
    
    // If Vertex AI fails, try to fall back to placeholder
    try {
      const body = await request.clone().json();
      const { prompt, params, sessionId, sessionName } = body as GenerateRequest;
      
      const resolutionKey = (params?.resolution || '1K') as keyof typeof RESOLUTION_MAP;
      const aspectRatioKey = (params?.aspectRatio || '1:1') as keyof typeof ASPECT_RATIO_MAP;
      const resolution = RESOLUTION_MAP[resolutionKey];
      const ratio = ASPECT_RATIO_MAP[aspectRatioKey];
      const count = Math.min(Math.max(params?.count || 2, 1), 4);
      const width = resolution;
      const height = Math.round(resolution * (ratio.height / ratio.width));

      const images: GeneratedImage[] = Array.from({ length: count }, (_, i) => ({
        id: generateId(),
        url: `https://picsum.photos/${width}/${height}?random=${Date.now()}-${i}`,
        width,
        height,
        prompt: prompt || 'Generated image',
        sessionId: sessionId || 'default',
        sessionName: sessionName || '默认会话',
        params: {
          resolution: params?.resolution || '1K',
          aspectRatio: params?.aspectRatio || '1:1',
          count,
        },
        timestamp: Date.now(),
      }));

      return NextResponse.json({
        success: true,
        images,
        message: 'Fallback: Generated placeholder images due to API error',
        provider: 'fallback',
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to generate images' },
        { status: 500 }
      );
    }
  }
}

// GET request to check API health and configuration
export async function GET() {
  const projectId = process.env.VERTEX_AI_PROJECT_ID;
  const enableVertexAI = process.env.ENABLE_VERTEX_AI === 'true';
  const hasVertexAI = !!projectId && enableVertexAI;

  return NextResponse.json({
    status: 'ok',
    service: 'Xtep AI Image Generation',
    version: '1.0.0',
    vertexAI: {
      configured: hasVertexAI,
      projectId: projectId ? `${projectId.substring(0, 8)}...` : null,
      location: process.env.VERTEX_AI_LOCATION || 'us-central1',
      model: process.env.VERTEX_AI_IMAGE_MODEL || 'imagegeneration@006',
    },
    providers: {
      vertex_ai: hasVertexAI ? 'enabled' : 'not configured',
      placeholder: 'available as fallback',
    },
  });
}
