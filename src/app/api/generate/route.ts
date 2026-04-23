import { NextRequest, NextResponse } from 'next/server';
import { GeneratedImage, GenerationParams, RESOLUTION_MAP, ASPECT_RATIO_MAP } from '@/types';
import { generateId } from '@/lib/utils';

// Request body type
interface GenerateRequest {
  prompt: string;
  params: GenerationParams;
  sessionId?: string;
  sessionName?: string;
}

// Image generation API route
// This route handles image generation requests
// For production, you would integrate with an AI image generation service
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

    // Calculate image dimensions based on resolution and aspect ratio
    const width = resolution;
    const height = Math.round(resolution * (ratio.height / ratio.width));

    // For production, you would call your AI image generation API here
    // Example with a service like OpenAI DALL-E, Midjourney, Stable Diffusion, etc.
    
    // Check if user has provided API key for external service
    const apiKey = process.env.IMAGE_GENERATION_API_KEY;
    
    if (apiKey) {
      // If you have a real image generation API configured
      // You would make the API call here
      // const response = await fetch('YOUR_API_ENDPOINT', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     prompt,
      //     num_images: count,
      //     width,
      //     height,
      //   }),
      // });
      // const data = await response.json();
      // Return the generated images
    }

    // For demo purposes, generate placeholder images using picsum.photos
    // In production, replace this with actual AI-generated images
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
      message: `Generated ${count} images successfully`,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate images' },
      { status: 500 }
    );
  }
}

// GET request to check API health
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Xtep AI Image Generation',
    version: '1.0.0',
  });
}
