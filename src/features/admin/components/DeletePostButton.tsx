"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface Props {
  slug: string;
  apiBase?: string;
  onDeleted?: (slug: string) => void;
}

export default function DeletePostButton({ slug, apiBase = "/api/admin/posts", onDeleted }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setError("");
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 5000);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? `Delete failed (${res.status})`);
        return;
      }
      onDeleted?.(slug);
      router.refresh();
    } catch {
      setError("Delete failed");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        className={`admin-btn ${confirming ? "admin-btn--danger admin-btn--sm" : "admin-btn--icon admin-btn--outline"} ${confirming ? "px-2.5" : ""}`}
        onClick={() => void handleClick()}
        disabled={loading}
        title={confirming ? "Click again to confirm delete" : "Delete post"}
        aria-label={confirming ? "Confirm delete" : "Delete post"}
      >
        <Trash2 className="w-3.5 h-3.5" />
        {confirming && !loading && (
          <span className="text-[10px] font-bold uppercase tracking-wider ml-1.5">Confirm</span>
        )}
        {loading && <span className="text-[10px] font-bold uppercase tracking-wider ml-1.5">…</span>}
      </button>
      {error && (
        <span className="text-[10px] text-red-400 max-w-[8rem] text-right leading-tight">{error}</span>
      )}
    </div>
  );
}
