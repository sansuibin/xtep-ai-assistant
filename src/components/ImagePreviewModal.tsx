'use client';

import { useEffect, useCallback } from 'react';
import { X, Download } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { formatDate } from '@/lib/utils';
import { RESOLUTION_MAP, ASPECT_RATIO_MAP } from '@/types';

export function ImagePreviewModal() {
  const { state, closeImagePreview } = useApp();
  const { isImagePreviewOpen, previewImage } = state;

  // Handle ESC key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isImagePreviewOpen) {
        closeImagePreview();
      }
    },
    [isImagePreviewOpen, closeImagePreview]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Download image
  const handleDownload = async () => {
    if (!previewImage) return;

    try {
      const response = await fetch(previewImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `xtep-ai-${previewImage.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(previewImage.url, '_blank');
    }
  };

  if (!isImagePreviewOpen || !previewImage) {
    return null;
  }

  const resolution = RESOLUTION_MAP[previewImage.params.resolution];
  const ratio = ASPECT_RATIO_MAP[previewImage.params.aspectRatio];
  const ratioDisplay = `${ratio.width}:${ratio.height}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 modal-backdrop animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeImagePreview();
        }
      }}
    >
      {/* Close Button */}
      <button
        onClick={closeImagePreview}
        className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        aria-label="关闭"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Image Container */}
      <div className="relative max-w-[90vw] max-h-[90vh] animate-fade-in">
        <img
          src={previewImage.url}
          alt={previewImage.prompt}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />

        {/* Info Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg">
          <div className="flex items-end justify-between">
            <div className="flex-1">
              <p className="text-sm text-white line-clamp-2">{previewImage.prompt}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-white/70">
                  {resolution}px · {ratioDisplay}
                </span>
                <span className="text-xs text-white/70">·</span>
                <span className="text-xs text-white/70">{previewImage.sessionName}</span>
                <span className="text-xs text-white/70">·</span>
                <span className="text-xs text-white/70">{formatDate(previewImage.timestamp)}</span>
              </div>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="ml-4 flex items-center gap-2 px-4 py-2 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors focus-ring"
            >
              <Download className="w-4 h-4" />
              下载
            </button>
          </div>
        </div>
      </div>

      {/* Hint */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/50">
        按 ESC 键关闭
      </p>
    </div>
  );
}
