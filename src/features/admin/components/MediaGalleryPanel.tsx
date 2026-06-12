"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { connectAdminStream, onNetworkRefresh } from "@/lib/network/synchronize";

type MediaItem = {
  id: string;
  accountId: number | null;
  kind: "avatar" | "blog";
  status: "pending" | "approved" | "rejected" | "superseded";
  createdAt: string;
  username: string | null;
  displayName: string | null;
};

type MediaResponse = {
  items?: MediaItem[];
  total?: number;
  page?: number;
  pageCount?: number;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  rejected: "border-red-500/40 bg-red-500/10 text-red-200",
  superseded: "border-white/15 bg-white/[0.04] text-gray-500",
};

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

export default function MediaGalleryPanel() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [kind, setKind] = useState<"" | "avatar" | "blog">("");
  const [status, setStatus] = useState<"" | "pending" | "approved" | "rejected" | "superseded">("");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (kind) params.set("kind", kind);
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/media?${params}`, { credentials: "same-origin" });
      const data = (await res.json()) as MediaResponse;
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setPageCount(data.pageCount ?? 1);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, kind, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const stream = connectAdminStream();
    const offIcons = onNetworkRefresh("admin-icons", () => void load());
    const offMedia = onNetworkRefresh("admin-media", () => void load());
    return () => {
      offIcons();
      offMedia();
      stream.stop();
    };
  }, [load]);

  async function runAction(id: string, action: "approve" | "reject" | "delete") {
    if (actingId) return;
    const label = action === "delete" ? "Delete this image permanently?" : undefined;
    if (label && !window.confirm(label)) return;

    setActingId(id);
    try {
      const res = await fetch(`/api/admin/media/${id}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        credentials: "same-origin",
        headers: action === "delete" ? undefined : { "Content-Type": "application/json" },
        body: action === "delete" ? undefined : JSON.stringify({ action }),
      });
      if (!res.ok) return;
      if (action === "delete") {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, status: action === "approve" ? "approved" : "rejected" }
              : item
          )
        );
      }
    } finally {
      setActingId(null);
    }
  }

  return (
    <section className="mb-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">
            Media gallery
          </p>
          <p className="text-sm text-gray-500">{total} uploads tracked</p>
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
        {(["", "avatar", "blog"] as const).map((k) => (
          <button
            key={k || "all"}
            type="button"
            onClick={() => {
              setKind(k);
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
              kind === k ? "border-white/30 bg-white/10 text-white" : "border-white/10 text-gray-500"
            }`}
          >
            {k || "all kinds"}
          </button>
        ))}
        {(["", "pending", "approved", "rejected", "superseded"] as const).map((s) => (
          <button
            key={s || "all-status"}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
              status === s ? "border-white/30 bg-white/10 text-white" : "border-white/10 text-gray-500"
            }`}
          >
            {s || "all status"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-600">No media matches filters.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((item) => {
            const imageUrl = `/api/images/${item.id}`;
            const busy = actingId === item.id;

            return (
              <ContextMenu key={item.id}>
                <ContextMenuTrigger
                  render={
                    <article className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden cursor-context-menu" />
                  }
                >
                  <div className="aspect-square bg-black/40 relative">
                    <img
                      src={imageUrl}
                      alt=""
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <span
                      className={`absolute top-2 left-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${STATUS_STYLES[item.status] ?? ""}`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div className="p-2.5 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      {item.kind}
                    </p>
                    {item.username ? (
                      <Link
                        href={`/u/${item.username}`}
                        className="text-xs text-sky-300 hover:underline truncate block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        @{item.username}
                      </Link>
                    ) : (
                      <p className="text-xs text-gray-600">—</p>
                    )}
                    <p className="text-[10px] text-gray-600 font-mono truncate">{item.id.slice(0, 8)}…</p>
                    <p className="text-[10px] text-gray-600">
                      {new Date(item.createdAt).toLocaleString("en-GB")}
                    </p>
                  </div>
                </ContextMenuTrigger>

                <ContextMenuContent className="admin-ctx-menu !rounded-xl !p-1 !min-w-44 !bg-[#0a0a0a] !text-gray-400 !shadow-2xl !ring-0">
                  <ContextMenuGroup>
                    <ContextMenuLabel>{item.kind} · {item.status}</ContextMenuLabel>
                  </ContextMenuGroup>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    disabled={busy}
                    onClick={() => void copyText(imageUrl)}
                  >
                    <Copy className="size-3.5" />
                    Copy URL
                  </ContextMenuItem>
                  <ContextMenuItem
                    disabled={busy}
                    onClick={() => void copyText(item.id)}
                  >
                    <Copy className="size-3.5" />
                    Copy ID
                  </ContextMenuItem>
                  <ContextMenuItem
                    disabled={busy}
                    onClick={() => window.open(imageUrl, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="size-3.5" />
                    Open image
                  </ContextMenuItem>
                  {item.username && (
                    <ContextMenuItem
                      disabled={busy}
                      onClick={() => window.open(`/u/${item.username}`, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink className="size-3.5" />
                      View @{item.username}
                    </ContextMenuItem>
                  )}
                  <ContextMenuSeparator />
                  {item.status !== "approved" && (
                    <ContextMenuItem
                      disabled={busy}
                      onClick={() => void runAction(item.id, "approve")}
                    >
                      <Check className="size-3.5" />
                      Approve
                    </ContextMenuItem>
                  )}
                  {item.status !== "rejected" && (
                    <ContextMenuItem
                      disabled={busy}
                      variant="destructive"
                      onClick={() => void runAction(item.id, "reject")}
                    >
                      <X className="size-3.5" />
                      Reject
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem
                    disabled={busy}
                    variant="destructive"
                    onClick={() => void runAction(item.id, "delete")}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
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
