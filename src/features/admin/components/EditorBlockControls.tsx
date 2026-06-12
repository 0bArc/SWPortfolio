"use client";

import EditorCarouselSlots from "@/features/admin/components/EditorCarouselSlots";
import { EditorSizeFields } from "@/features/admin/components/EditorSizeFields";
import type { ContentBlock } from "@/lib/markdown/render";
import {
  serializeImage,
  serializeCarousel,
  isPendingImage,
  emptyCarouselSlides,
} from "@/lib/markdown/render";

interface EditorBlockControlsProps {
  block: ContentBlock;
  onPatch: (raw: string) => void;
  onCarouselSlotUpload: (slotIndex: number, files: File[]) => Promise<void>;
  uploading?: boolean;
}

export default function EditorBlockControls({
  block,
  onPatch,
  onCarouselSlotUpload,
  uploading = false,
}: EditorBlockControlsProps) {
  if (block.type === "image") {
    return (
      <div className="px-3 py-2 border-t border-white/15 bg-black/30 shrink-0">
        <EditorSizeFields
          w={block.w}
          h={block.h}
          onW={(w) => onPatch(serializeImage(block.alt, block.url, w, block.h))}
          onH={(h) => onPatch(serializeImage(block.alt, block.url, block.w, h))}
        />
      </div>
    );
  }

  const slides = block.slides.length ? block.slides : emptyCarouselSlides();

  return (
    <div className="px-3 py-2 border-t border-white/15 bg-black/30 shrink-0 space-y-3">
      <EditorCarouselSlots
        block={{ ...block, slides }}
        uploading={uploading}
        onPatch={onPatch}
        onUploadSlot={onCarouselSlotUpload}
      />
      <EditorSizeFields
        label="Carousel size"
        w={block.w}
        h={block.h}
        onW={(w) => onPatch(serializeCarousel(slides, w, block.h))}
        onH={(h) => onPatch(serializeCarousel(slides, block.w, h))}
      />
      <p className="text-[11px] text-gray-500">
        {slides.filter((s) => !isPendingImage(s.alt, s.url)).length} of {slides.length} slides filled
      </p>
    </div>
  );
}
