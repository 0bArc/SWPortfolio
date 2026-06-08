"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Grantable = { slug: string; label: string; description: string };

function BadgePicker({
  options,
  value,
  onChange,
}: {
  options: Grantable[];
  value: string;
  onChange: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.slug === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-8 flex items-center justify-between gap-2 rounded-md border border-white/10 bg-[#141414] px-2.5 text-xs text-gray-200 hover:border-white/20 transition-colors"
      >
        <span className="truncate">{selected?.label ?? "Select badge"}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-gray-500 transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      <ul
        role="listbox"
        className={`absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-48 overflow-y-auto rounded-md border border-white/10 bg-[#141414] shadow-[0_8px_24px_rgba(0,0,0,0.5)] origin-top transition-all duration-200 ease-out ${
          open
            ? "pointer-events-auto opacity-100 scale-100 translate-y-0"
            : "pointer-events-none opacity-0 scale-[0.98] -translate-y-1"
        }`}
      >
        {options.map((b) => (
          <li key={b.slug} role="option" aria-selected={b.slug === value}>
            <button
              type="button"
              onClick={() => {
                onChange(b.slug);
                setOpen(false);
              }}
              className={`w-full text-left px-2.5 py-2 text-xs transition-colors ${
                b.slug === value
                  ? "bg-white/[0.08] text-white"
                  : "text-gray-400 hover:bg-white/[0.05] hover:text-gray-200"
              }`}
            >
              {b.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BadgeAwardPanel({ targetUsername }: { targetUsername: string }) {
  const router = useRouter();
  const [grantable, setGrantable] = useState<Grantable[]>([]);
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/accounts/badges", { credentials: "same-origin" });
        const data = (await res.json()) as { grantable?: Grantable[] };
        if (cancelled) return;
        const list = data.grantable ?? [];
        setGrantable(list);
        setSlug(list[0]?.slug ?? "");
      } catch {
        if (!cancelled) setGrantable([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || grantable.length === 0) return null;

  async function onAward() {
    if (!slug) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/accounts/badges", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: targetUsername, slug }),
      });
      const data = (await res.json()) as { error?: string; badge?: { label: string } };
      if (!res.ok) {
        setError(data.error ?? "Could not award badge");
        return;
      }
      setMessage(data.badge ? `${data.badge.label} awarded` : "Badge awarded");
      router.refresh();
    } catch {
      setError("Could not award badge");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-500 leading-snug">Grant a badge to @{targetUsername}</p>
      <div className="flex items-center gap-2">
        <BadgePicker options={grantable} value={slug} onChange={setSlug} />
        <button
          type="button"
          disabled={submitting || !slug}
          onClick={() => void onAward()}
          className="h-8 shrink-0 px-3 rounded-md border border-white/10 bg-white/[0.04] text-xs text-gray-200 hover:text-white hover:border-white/20 disabled:opacity-50 transition-colors"
        >
          {submitting ? "…" : "Award"}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {message && <p className="text-[11px] text-gray-500">{message}</p>}
    </div>
  );
}
