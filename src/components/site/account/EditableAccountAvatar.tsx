"use client";

import { useRef } from "react";
import AccountAvatar from "./AccountAvatar";

type Props = {
  username: string;
  displayName: string;
  icon: string | null;
  size?: number;
  loading?: boolean;
  onFile: (file: File) => void;
};

export default function EditableAccountAvatar({
  username,
  displayName,
  icon,
  size = 72,
  loading = false,
  onFile,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        className="relative group shrink-0 rounded-full disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        aria-label="Change profile picture"
      >
        <AccountAvatar
          username={username}
          displayName={displayName}
          icon={icon}
          size={size}
          className="transition-opacity group-hover:opacity-80"
        />
        <span className="absolute inset-0 rounded-full bg-black/55 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 flex items-center justify-center text-[11px] font-semibold text-white transition-opacity">
          {loading ? "…" : "Change"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={loading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </>
  );
}
