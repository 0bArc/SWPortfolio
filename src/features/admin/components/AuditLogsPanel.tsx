"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { connectAdminStream, onNetworkRefresh } from "@/lib/network/synchronize";

type AuditItem = {
  id: number;
  eventType: string;
  category: string;
  summary: string;
  createdAt: string;
  actor: { username: string; displayName: string } | null;
  target: { username: string; displayName: string } | null;
  targetResourceType: string | null;
  targetResourceId: string | null;
};

type AuditResponse = {
  items?: AuditItem[];
  total?: number;
  page?: number;
  pageCount?: number;
  categories?: string[];
};

const CATEGORY_STYLES: Record<string, string> = {
  user: "text-sky-300 border-sky-500/30 bg-sky-500/10",
  badge: "text-violet-300 border-violet-500/30 bg-violet-500/10",
  role: "text-fuchsia-300 border-fuchsia-500/30 bg-fuchsia-500/10",
  media: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  blog: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  api_key: "text-orange-300 border-orange-500/30 bg-orange-500/10",
  account: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10",
  content: "text-rose-300 border-rose-500/30 bg-rose-500/10",
  admin: "text-gray-300 border-white/20 bg-white/5",
};

export default function AuditLogsPanel() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (category) params.set("category", category);
      const res = await fetch(`/api/admin/audit-logs?${params}`, { credentials: "same-origin" });
      const data = (await res.json()) as AuditResponse;
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setPageCount(data.pageCount ?? 1);
      if (data.categories?.length) setCategories(data.categories);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, category]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const stream = connectAdminStream();
    const off = onNetworkRefresh("admin-audit", () => void load());
    return () => {
      off();
      stream.stop();
    };
  }, [load]);

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">
            Audit logs
          </p>
          <p className="text-sm text-gray-500">{total} recorded actions</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="admin-btn admin-btn--ghost admin-btn--sm inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => {
            setCategory("");
            setPage(1);
          }}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
            !category ? "border-white/30 bg-white/10 text-white" : "border-white/10 text-gray-500"
          }`}
        >
          all
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setCategory(c);
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
              category === c ? "border-white/30 bg-white/10 text-white" : "border-white/10 text-gray-500"
            }`}
          >
            {c.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-600">No audit entries yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
            >
              <span
                className={`shrink-0 self-start text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                  CATEGORY_STYLES[item.category] ?? CATEGORY_STYLES.admin
                }`}
              >
                {item.category}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-200">{item.summary}</p>
                <p className="text-[10px] text-gray-600 mt-0.5 font-mono">{item.eventType}</p>
              </div>
              <div className="text-xs text-gray-500 shrink-0 text-left sm:text-right space-y-0.5">
                <p>{new Date(item.createdAt).toLocaleString("en-GB")}</p>
                {item.actor && (
                  <p>
                    by{" "}
                    <Link href={`/u/${item.actor.username}`} className="text-gray-400 hover:text-white">
                      @{item.actor.username}
                    </Link>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="admin-btn admin-btn--ghost admin-btn--sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
            className="admin-btn admin-btn--ghost admin-btn--sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
}
