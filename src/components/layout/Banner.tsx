"use client";

import { useState } from "react";
import { X, ShieldAlert } from "lucide-react";

const STRATWARE_URL = "https://stratware.win";

function linkify(text: string) {
  const parts = text.split(/(stratware\.win)/);
  return parts.map((part, i) =>
    part === "stratware.win" ? (
      <a
        key={i}
        href={STRATWARE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors"
      >
        stratware.win
      </a>
    ) : (
      part
    )
  );
}

export default function Banner({ message }: { message: string; height?: string }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-blue-500/30 bg-[#050505] px-6 py-4 shadow-[0_-4px_32px_rgba(59,130,246,0.12)]">
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0" />
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-400 mb-0.5">
            System Notice
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">{linkify(message)}</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 text-gray-600 hover:text-gray-300 transition-colors ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
