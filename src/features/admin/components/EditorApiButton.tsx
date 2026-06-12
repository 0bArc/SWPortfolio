"use client";

import { useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EditorApiButtonProps {
  onUpload: (files: File[]) => Promise<void>;
  children: ReactNode;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  loadingLabel?: string;
}

/** File-picker button with loading/error state for editor API uploads. */
export default function EditorApiButton({
  onUpload,
  children,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  multiple = false,
  disabled = false,
  className,
  loadingLabel = "Uploading…",
}: EditorApiButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    setLoading(true);
    setError("");
    try {
      await onUpload(files);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("inline-flex flex-col items-start gap-1", className)}>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        multiple={multiple}
        onChange={handlePick}
      />
      <button
        type="button"
        className="admin-btn admin-btn--outline admin-btn--xs"
        disabled={disabled || loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading && <Loader2 className="w-3 h-3 animate-spin" aria-hidden />}
        {loading ? loadingLabel : children}
      </button>
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}

/** Upload images — returns url + alt per file. */
export async function uploadEditorImages(
  files: File[],
  uploadPath = "/api/admin/images"
): Promise<{ url: string; alt: string }[]> {
  const out: { url: string; alt: string }[] = [];
  for (const file of files) {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(uploadPath, { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error((data as { error?: string }).error ?? "Upload failed");
    }
    out.push({
      url: (data as { url: string }).url,
      alt: file.name.replace(/\.[^.]+$/, ""),
    });
  }
  return out;
}
