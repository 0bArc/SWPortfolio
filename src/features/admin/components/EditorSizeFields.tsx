"use client";

export function EditorSizeFields({
  w,
  h,
  onW,
  onH,
  label = "Size",
}: {
  w?: number;
  h?: number;
  onW: (v: number | undefined) => void;
  onH: (v: number | undefined) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0">
        {label}
      </span>
      <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
        W
        <input
          type="number"
          min={1}
          className="admin-input w-16 py-1 text-xs"
          placeholder="auto"
          value={w ?? ""}
          onChange={(e) => onW(e.target.value ? Number(e.target.value) : undefined)}
        />
      </label>
      <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
        H
        <input
          type="number"
          min={1}
          className="admin-input w-16 py-1 text-xs"
          placeholder="auto"
          value={h ?? ""}
          onChange={(e) => onH(e.target.value ? Number(e.target.value) : undefined)}
        />
      </label>
    </div>
  );
}
