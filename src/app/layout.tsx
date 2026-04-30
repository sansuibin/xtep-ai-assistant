import type { Metadata } from 'next';
import './globals.css';

// Prevent Next.js automatic revalidation which causes page flicker every ~1 minute
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    default: '特步AI生图助手 | Xtep AI Image Assistant',
    template: '%s | 特步AI生图助手',
  },
  description:
    '特步AI生图助手 - 用AI驱动的运动装备设计工具，快速生成跑鞋、运动服、机能装备等创意设计图。',
  keywords: [
    '特步',
    'AI生图',
    '运动装备设计',
    '跑鞋设计',
    'AI绘图',
    '智能设计',
    'Xtep',
    '运动品牌',
  ],
  authors: [{ name: 'Xtep Innovation Lab' }],
  generator: 'Xtep AI',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚡</text></svg>',
  },
  openGraph: {
    title: '特步AI生图助手 | Xtep AI Image Assistant',
    description: '用AI驱动的运动装备设计工具，快速生成创意设计图',
    siteName: '特步AI生图助手',
    locale: 'zh_CN',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
