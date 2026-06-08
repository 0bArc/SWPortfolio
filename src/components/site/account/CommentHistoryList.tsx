"use client";

import Link from "next/link";
import { useState } from "react";
import type { CommentHistoryItem } from "@/lib/db/comments";

const PAGE_SIZE = 3;

type Props = {
  items: CommentHistoryItem[];
  compact?: boolean;
};

export default function CommentHistoryList({ items, compact = false }: Props) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const slice = items.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (items.length === 0) return null;

  return (
    <div>
      <ul className={compact ? "space-y-2" : "space-y-3"}>
        {slice.map((item) => (
          <li
            key={item.id}
            className={compact ? "text-sm" : "rounded-lg border border-white/[0.08] bg-white/[0.02] p-3"}
          >
            <Link
              href={`/blog/${item.postSlug}`}
              className={compact ? "text-gray-200 hover:text-white font-medium" : "text-sm font-medium text-gray-200 hover:text-white"}
            >
              {item.postTitle}
            </Link>
            <p className={`text-xs text-gray-400 ${compact ? "inline ml-2" : "mt-0.5"}`}>
              {fmtDate(item.createdAt)}
            </p>
            {!compact && (
              <p className="text-sm text-gray-400 mt-2 line-clamp-3">{item.content}</p>
            )}
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 mt-2">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="h-8 px-3 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-[11px] text-gray-600">
            Page {safePage + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="h-8 px-3 rounded-lg border border-white/10 text-xs text-gray-400 hover:text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
