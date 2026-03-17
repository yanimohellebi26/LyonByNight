"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface PhotoGalleryProps {
  readonly photos: readonly string[];
  readonly alt: string;
}

export function PhotoGallery({ photos, alt }: PhotoGalleryProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (photos.length <= 1) return null;

  return (
    <>
      {/* Thumbnail strip */}
      <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
        {photos.map((photo, idx) => (
          <button
            key={idx}
            onClick={() => setLightboxIdx(idx)}
            className="relative h-28 w-40 shrink-0 overflow-hidden rounded-xl transition-opacity hover:opacity-80"
          >
            <Image
              src={photo}
              alt={`${alt} photo ${idx + 1}`}
              fill
              className="object-cover"
              sizes="160px"
              unoptimized
            />
          </button>
        ))}
      </div>

      {/* Lightbox overlay */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxIdx(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Previous */}
          {lightboxIdx > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx(lightboxIdx - 1);
              }}
              className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Image */}
          <div
            className="relative h-[80vh] w-[90vw] max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[lightboxIdx]}
              alt={`${alt} photo ${lightboxIdx + 1}`}
              fill
              className="object-contain"
              sizes="90vw"
              unoptimized
              priority
            />
          </div>

          {/* Next */}
          {lightboxIdx < photos.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIdx(lightboxIdx + 1);
              }}
              className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Counter */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/70">
            {lightboxIdx + 1} / {photos.length}
          </p>
        </div>
      )}
    </>
  );
}
