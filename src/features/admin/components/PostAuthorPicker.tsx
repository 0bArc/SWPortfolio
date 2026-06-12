"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import AccountAvatar from "@/features/accounts/components/AccountAvatar";
import type { PostAuthorCandidate } from "@/features/blog/services/post-authors";

interface Props {
  value: number | null;
  label: string;
  initialName?: string;
  onChange: (author: PostAuthorCandidate) => void;
  fetchPath?: string;
}

export default function PostAuthorPicker({
  value,
  label,
  initialName,
  onChange,
  fetchPath = "/api/admin/posts/authors",
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [authors, setAuthors] = useState<PostAuthorCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch(fetchPath, { credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load authors (${res.status})`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Invalid authors response");
        return data as PostAuthorCandidate[];
      })
      .then((rows) => {
        if (!cancelled) setAuthors(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load authors");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPath]);

  useEffect(() => {
    if (value != null || !initialName || authors.length === 0) return;
    const key = initialName.trim().toLowerCase();
    const match =
      authors.find((a) => a.displayName.toLowerCase() === key) ??
      authors.find((a) => a.username.toLowerCase() === key);
    if (match) onChange(match);
  }, [authors, initialName, onChange, value]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = authors.find((a) => a.id === value);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={loading || authors.length === 0}
        onClick={() => setOpen((v) => !v)}
        className="admin-input w-full flex items-center gap-2.5 text-left disabled:opacity-50"
      >
        {selected ? (
          <AccountAvatar
            username={selected.username}
            displayName={selected.displayName}
            icon={selected.icon}
            size={22}
          />
        ) : (
          <span className="w-[22px] h-[22px] rounded-full border border-white/15 bg-white/[0.06] shrink-0" />
        )}
        <span className="truncate flex-1 text-sm">
          {loading
            ? "Loading authors…"
            : selected?.displayName ?? initialName ?? label}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}

      {open && authors.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-full max-h-56 overflow-y-auto py-1 rounded-xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md shadow-xl shadow-black/40"
        >
          {authors.map((author) => {
            const active = author.id === value;
            return (
              <li key={author.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(author);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                    active
                      ? "bg-white/[0.08] text-white"
                      : "text-gray-300 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <AccountAvatar
                    username={author.username}
                    displayName={author.displayName}
                    icon={author.icon}
                    size={22}
                  />
                  <span className="truncate">{author.displayName}</span>
                  <span className="text-[10px] text-gray-600 ml-auto">@{author.username}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
