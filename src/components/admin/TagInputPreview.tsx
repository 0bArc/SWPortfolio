"use client";

import { useEffect, useState } from "react";
import StyledTagBadge from "@/components/site/blog/StyledTagBadge";
import type { TagStyleRecord } from "@/lib/tags/types";
import { getTagVariant } from "@/lib/tags/variants";

const FALLBACK_CLS: Record<string, string> = {
  glass: "text-gray-500 bg-white/[0.04] border border-white/10",
  hacker: "text-green-400 font-mono badge-hacker",
  rainbow: "text-white bg-indigo-600",
  purple: "text-white bg-violet-600",
  blue: "text-white bg-sky-600",
  fire: "text-white bg-orange-600",
  cyan: "text-white bg-cyan-600",
};

export default function TagInputPreview({ tags }: { tags: string }) {
  const [styleMap, setStyleMap] = useState<Map<string, TagStyleRecord>>(new Map());

  useEffect(() => {
    fetch("/api/admin/tags")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: TagStyleRecord[]) => setStyleMap(new Map(list.map((s) => [s.slug, s]))))
      .catch(() => {});
  }, []);

  const parsed = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (parsed.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {parsed.map((tag) => {
        const custom = styleMap.get(tag.toLowerCase());
        if (custom) {
          return <StyledTagBadge key={tag} tag={tag} config={custom.config} />;
        }
        const v = getTagVariant(tag);
        return (
          <span
            key={tag}
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${FALLBACK_CLS[v]}`}
          >
            #{tag}
          </span>
        );
      })}
    </div>
  );
}
