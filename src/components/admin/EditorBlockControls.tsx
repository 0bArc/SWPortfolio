"use client";

import EditorApiButton from "@/components/admin/EditorApiButton";
import type { ContentBlock } from "@/lib/markdown-render";
import {
  serializeImage,
  serializeCarousel,
  isPendingImage,
} from "@/lib/markdown-render";

export function EditorSizeFields({
  w,
  h,
  onW,
  onH,
  label = "Size",
}: {
  w?: number;
  h?: number;
  onW: (v: number | undefined) => void;
  onH: (v: number | undefined) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0">
        {label}
      </span>
      <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
        W
        <input
          type="number"
          min={1}
          className="admin-input w-16 py-1 text-xs"
          placeholder="auto"
          value={w ?? ""}
          onChange={(e) => onW(e.target.value ? Number(e.target.value) : undefined)}
        />
      </label>
      <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
        H
        <input
          type="number"
          min={1}
          className="admin-input w-16 py-1 text-xs"
          placeholder="auto"
          value={h ?? ""}
          onChange={(e) => onH(e.target.value ? Number(e.target.value) : undefined)}
        />
      </label>
    </div>
  );
}

interface EditorBlockControlsProps {
  block: ContentBlock;
  onPatch: (raw: string) => void;
  onAddCarouselSlides: (files: File[]) => Promise<void>;
  uploading?: boolean;
}

export default function EditorBlockControls({
  block,
  onPatch,
  onAddCarouselSlides,
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

  const filled = block.slides.filter((s) => !isPendingImage(s.alt, s.url));
  const pending =
    !block.slides.length || block.slides.every((s) => isPendingImage(s.alt, s.url));

  return (
    <div className="px-3 py-2 border-t border-white/15 bg-black/30 shrink-0 space-y-2">
      <EditorSizeFields
        label="Carousel size"
        w={block.w}
        h={block.h}
        onW={(w) =>
          onPatch(serializeCarousel(pending ? block.slides : filled, w, block.h))
        }
        onH={(h) =>
          onPatch(serializeCarousel(pending ? block.slides : filled, block.w, h))
        }
      />
      {!pending && (
        <div className="flex items-center gap-2 flex-wrap">
          <EditorApiButton
            multiple
            disabled={uploading}
            onUpload={onAddCarouselSlides}
            size="xs"
          >
            Add slide
          </EditorApiButton>
          <span className="text-[11px] text-gray-500">
            {filled.length} slide{filled.length === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </div>
  );
}
