"use client";

import { Plus, X } from "lucide-react";
import {
  CAROUSEL_DEFAULT_SLOTS,
  emptyCarouselSlides,
  isPendingImage,
  serializeCarousel,
  type CarouselBlockData,
} from "@/lib/markdown/render";

const slotCls =
  "relative aspect-[4/3] rounded-lg border-2 border-dashed border-white/20 bg-white/[0.04] overflow-hidden flex items-center justify-center text-[11px] text-gray-500 hover:border-white/35 hover:bg-white/[0.06] transition-colors";

interface Props {
  block: CarouselBlockData;
  uploading?: boolean;
  onPatch: (raw: string) => void;
  onUploadSlot: (slotIndex: number, files: File[]) => Promise<void>;
}

export default function EditorCarouselSlots({
  block,
  uploading = false,
  onPatch,
  onUploadSlot,
}: Props) {
  const slots =
    block.slides.length > 0 ? block.slides : emptyCarouselSlides(CAROUSEL_DEFAULT_SLOTS);

  function pickSlot(index: number) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif";
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      if (!files.length) return;
      void onUploadSlot(index, files);
    };
    input.click();
  }

  function removeSlot(index: number) {
    const next = slots.filter((_, i) => i !== index);
    const body = next.length ? next : emptyCarouselSlides(1);
    onPatch(serializeCarousel(body, block.w, block.h));
  }

  function addSlot() {
    onPatch(
      serializeCarousel(
        [...slots, ...emptyCarouselSlides(1)],
        block.w,
        block.h
      )
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {slots.map((slide, index) => {
          const pending = isPendingImage(slide.alt, slide.url);
          return (
            <div key={`${block.start}-slot-${index}`} className="relative group">
              {pending ? (
                <button
                  type="button"
                  className={`${slotCls} w-full`}
                  disabled={uploading}
                  onClick={() => pickSlot(index)}
                >
                  <span className="flex flex-col items-center gap-1">
                    <Plus className="w-4 h-4 text-gray-600" />
                    Slide {index + 1}
                  </span>
                </button>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.url}
                    alt={slide.alt}
                    className="w-full aspect-[4/3] object-cover rounded-lg border border-white/15"
                  />
                  <button
                    type="button"
                    title="Replace slide"
                    className={`${slotCls} absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/50`}
                    disabled={uploading}
                    onClick={() => pickSlot(index)}
                  >
                    Replace
                  </button>
                </>
              )}
              {slots.length > 1 && (
                <button
                  type="button"
                  title="Remove slide"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#1a1a1a] border border-white/20 text-gray-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removeSlot(index)}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="admin-btn admin-btn--outline admin-btn--xs"
        disabled={uploading}
        onClick={addSlot}
      >
        <Plus className="w-3 h-3" />
        Add slide slot
      </button>
    </div>
  );
}
