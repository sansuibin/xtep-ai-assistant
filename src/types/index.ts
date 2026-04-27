// Types for Xtep AI Image Assistant

export interface User {
  id: string;
  username: string;
  avatar?: string;
  modelName?: string;
  provider?: string;
}

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  params?: GenerationParams;
  images?: GeneratedImage[];
  timestamp: number;
}

export interface GenerationParams {
  resolution: Resolution;
  aspectRatio: AspectRatio;
  count: number;
  positivePrompt?: string;
  negativePrompt?: string;
}

export type Resolution = '512' | '1K' | '2K' | '4K';
export type AspectRatio = '1:1' | '3:2' | '4:3' | '16:9' | '9:16' | '4:5';

export interface GeneratedImage {
  id: string;
  url: string;
  width: number;
  height: number;
  prompt: string;
  sessionId: string;
  sessionName: string;
  params: GenerationParams;
  timestamp: number;
}

export interface ImageGallery {
  images: GeneratedImage[];
  viewMode: 'timeline' | 'grouped';
}

// Resolution to pixel mapping
export const RESOLUTION_MAP: Record<Resolution, number> = {
  '512': 512,
  '1K': 1024,
  '2K': 2048,
  '4K': 4096,
};

// Aspect ratio dimensions (base width is 1024)
export const ASPECT_RATIO_MAP: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1, height: 1 },
  '3:2': { width: 3, height: 2 },
  '4:3': { width: 4, height: 3 },
  '16:9': { width: 16, height: 9 },
  '9:16': { width: 9, height: 16 },
  '4:5': { width: 4, height: 5 },
};

// Example prompts
export const EXAMPLE_PROMPTS = [
  {
    title: '竞速跑鞋',
    prompt: '专业竞速跑鞋设计，碳纤维板技术，轻量化透气网面，霓虹红渐变配色，高性能运动鞋，工业设计渲染图',
  },
  {
    title: '国潮运动服',
    prompt: '国潮风格运动套装，传统文化元素与现代运动服结合，中国红与金色刺绣，传统纹样，时尚运动装',
  },
  {
    title: '未来机能',
    prompt: '未来机能风格运动外套，银色金属质感，LED灯带装饰，智能可穿戴设备，科技感运动装备，高达设计风格',
  },
];

// Common positive prompts
export const POSITIVE_PROMPTS = [
  '专业运动设计，高品质渲染',
  '工业设计风格，细节精致',
  '工作室灯光，光影效果出色',
  '白色背景，商业摄影风格',
];

// Common negative prompts
export const NEGATIVE_PROMPTS = [
  '低质量，模糊，噪点',
  '水印，文字，logo',
  '变形，失真，比例失调',
  '色情内容，暴力元素',
];
