"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MailCheck, RefreshCw } from "lucide-react";

type UnverifiedItem = {
  id: number;
  username: string;
  displayName: string;
  createdAt: string;
};

export default function UnverifiedUsersPanel() {
  const [items, setItems] = useState<UnverifiedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users/unverified", { credentials: "same-origin" });
      const data = (await res.json()) as { users?: UnverifiedItem[] };
      setItems(data.users ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function forceVerify(username: string) {
    setActing(username);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(username)}/verify-email`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.username !== username));
      }
    } finally {
      setActing(null);
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="mb-8 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 animate-pulse h-20" />
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="mb-8 rounded-xl border border-sky-500/25 bg-sky-500/[0.06] overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-sky-500/20">
        <div>
          <h2 className="text-sm font-semibold text-sky-100">Unverified emails</h2>
          <p className="text-[11px] text-sky-200/70 mt-0.5">
            {items.length} waiting · force-verify as gesture for legacy users
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="p-2 rounded-lg border border-white/10 text-gray-400 hover:text-white"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <ul className="divide-y divide-white/[0.06]">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{item.displayName}</p>
              <Link
                href={`/u/${item.username}`}
                className="text-[11px] text-gray-500 hover:text-gray-300 font-mono"
              >
                @{item.username}
              </Link>
            </div>
            <button
              type="button"
              disabled={acting === item.username}
              onClick={() => void forceVerify(item.username)}
              className="h-8 px-3 rounded-lg bg-sky-600/80 text-white text-xs font-semibold hover:bg-sky-600 disabled:opacity-50 inline-flex items-center gap-1 shrink-0"
            >
              <MailCheck className="w-3.5 h-3.5" />
              Force verify
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
