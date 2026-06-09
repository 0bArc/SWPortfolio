"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import {
  connectAdminStream,
  onNetworkRefresh,
} from "@/lib/network/synchronize";

type PendingItem = {
  id: number;
  username: string;
  displayName: string;
  iconPending: string;
  createdAt: string;
};

type PendingResponse = {
  pending?: PendingItem[];
  total?: number;
  page?: number;
  pageCount?: number;
};

export default function IconReviewPanel() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/icons/pending?page=${targetPage}`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as PendingResponse;
      setItems(data.pending ?? []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? targetPage);
      setPageCount(data.pageCount ?? 1);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [page, load]);

  useEffect(() => {
    const stream = connectAdminStream();
    const off = onNetworkRefresh("admin-icons", () => void load(page));
    return () => {
      stream.stop();
      off();
    };
  }, [load, page]);

  async function review(username: string, action: "approve" | "reject") {
    setActing(username);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(username)}/icon`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const nextPage = items.length === 1 && page > 1 ? page - 1 : page;
        if (nextPage !== page) setPage(nextPage);
        else await load(page);
      }
    } finally {
      setActing(null);
    }
  }

  if (loading && items.length === 0 && total === 0) {
    return (
      <div className="mb-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 animate-pulse h-24" />
    );
  }

  if (!loading && total === 0) return null;

  return (
    <section className="mb-8 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-amber-500/20">
        <div>
          <h2 className="text-sm font-semibold text-amber-100">Profile photos pending review</h2>
          <p className="text-[11px] text-amber-200/70 mt-0.5">
            {total} awaiting approval
            {pageCount > 1 && ` · page ${page} of ${pageCount}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load(page)}
          className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <ul className="divide-y divide-white/[0.06]">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 px-5 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.iconPending}
              alt=""
              className="w-14 h-14 rounded-full object-cover border border-white/10 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{item.displayName}</p>
              <Link
                href={`/u/${item.username}`}
                className="text-[11px] text-gray-500 hover:text-gray-300"
              >
                @{item.username}
              </Link>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                disabled={acting === item.username}
                onClick={() => void review(item.username, "approve")}
                className="h-8 px-3 rounded-lg bg-emerald-600/80 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Approve
              </button>
              <button
                type="button"
                disabled={acting === item.username}
                onClick={() => void review(item.username, "reject")}
                className="h-8 px-3 rounded-lg border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-500/10 disabled:opacity-50 inline-flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Reject
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && !loading && (
          <li className="px-5 py-6 text-sm text-gray-400 text-center">No items on this page.</li>
        )}
      </ul>
      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-amber-500/20">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 text-xs text-gray-300 hover:text-white disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-[11px] text-gray-500">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount || loading}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            className="inline-flex items-center gap-1 text-xs text-gray-300 hover:text-white disabled:opacity-40"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
}
