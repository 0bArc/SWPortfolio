"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Users } from "lucide-react";
import AccountAvatar from "@/features/accounts/components/AccountAvatar";
import { blogListHref, type BlogAuthor } from "@/features/blog/utils/authors";

interface Props {
  authors: BlogAuthor[];
  activeAuthor?: string;
  activeTag?: string;
  everyoneLabel: string;
}

export default function BlogAuthorSelect({
  authors,
  activeAuthor,
  activeTag,
  everyoneLabel,
}: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = authors.find((a) => a.key === activeAuthor);
  const label = selected?.name ?? everyoneLabel;

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

  function pick(authorKey?: string) {
    setOpen(false);
    router.push(
      blogListHref({
        author: authorKey,
        tag: activeTag,
        page: 1,
      })
    );
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="glass flex items-center gap-2 rounded-lg pl-2.5 pr-2 py-2 text-xs font-medium text-gray-200 hover:text-white cursor-pointer transition-colors min-w-[10rem] max-w-[14rem] border border-white/10 hover:border-white/20 focus:outline-none focus:border-white/25"
      >
        {selected ? (
          <AccountAvatar
            username={selected.username ?? selected.key}
            displayName={selected.name}
            icon={selected.icon}
            size={20}
          />
        ) : (
          <span className="w-5 h-5 rounded-full border border-white/15 bg-white/[0.06] flex items-center justify-center shrink-0">
            <Users className="w-3 h-3 text-gray-400" />
          </span>
        )}
        <span className="truncate flex-1 text-left">{label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+0.35rem)] z-50 min-w-full w-max max-w-[16rem] py-1 rounded-xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md shadow-xl shadow-black/40"
        >
          <li role="option" aria-selected={!activeAuthor}>
            <button
              type="button"
              onClick={() => pick(undefined)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition-colors ${
                !activeAuthor
                  ? "bg-white/[0.08] text-white"
                  : "text-gray-300 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <span className="w-5 h-5 rounded-full border border-white/15 bg-white/[0.06] flex items-center justify-center shrink-0">
                <Users className="w-3 h-3 text-gray-400" />
              </span>
              <span>{everyoneLabel}</span>
            </button>
          </li>

          {authors.map((author) => {
            const active = activeAuthor === author.key;
            return (
              <li key={author.key} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => pick(author.key)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition-colors ${
                    active
                      ? "bg-white/[0.08] text-white"
                      : "text-gray-300 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <AccountAvatar
                    username={author.username ?? author.key}
                    displayName={author.name}
                    icon={author.icon}
                    size={20}
                  />
                  <span className="truncate">{author.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
