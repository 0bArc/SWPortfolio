"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import StyledTagBadge from "@/features/blog/components/StyledTagBadge";
import type { TagKeyframe, TagStyleConfig, TagStyleRecord, TagTextEffect } from "@/lib/tags/types";
import { DEFAULT_TAG_STYLE, normalizeTagConfig } from "@/lib/tags/presets";
import { MOTION_PRESETS } from "@/lib/tags/motion-presets";

const EASING_PRESETS = [
  { label: "Ease in-out", value: "ease-in-out" },
  { label: "Ease", value: "ease" },
  { label: "Linear", value: "linear" },
  { label: "Smooth", value: "cubic-bezier(0.45, 0, 0.55, 1)" },
  { label: "Snappy", value: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  { label: "Custom", value: "custom" },
];

const TEXT_EFFECTS: { value: TagTextEffect; label: string; hint: string }[] = [
  { value: "none", label: "Static", hint: "Plain uppercase label" },
  { value: "cryptic", label: "Cryptic", hint: "Binary glitch decode" },
  { value: "flicker", label: "Flicker", hint: "Neon opacity stutter" },
  { value: "pulse", label: "Pulse", hint: "Soft scale breathe" },
];

const ANGLE_PRESETS = [0, 45, 90, 135, 180, 225, 270, 315];

type CurveField = "bgX" | "bgY" | "glow";

function cloneConfig(c: TagStyleConfig): TagStyleConfig {
  const n = normalizeTagConfig(c);
  return { ...n, keyframes: n.keyframes.map((k) => ({ ...k })) };
}

function KeyframeCurve({
  keyframes,
  field,
  label,
  onChange,
}: {
  keyframes: TagKeyframe[];
  field: CurveField;
  label: string;
  onChange: (next: TagKeyframe[]) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 360;
  const H = 88;
  const pad = 14;

  const sorted = useMemo(() => [...keyframes].sort((a, b) => a.at - b.at), [keyframes]);

  const toX = (at: number) => pad + (at / 100) * (W - pad * 2);
  const toY = (v: number) => {
    const norm = field === "glow" ? v : v / 100;
    return pad + (1 - norm) * (H - pad * 2);
  };

  const line = sorted.map((k) => `${toX(k.at)},${toY(k[field])}`).join(" ");

  const drag = useCallback(
    (idx: number, clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * W;
      const y = ((clientY - rect.top) / rect.height) * H;
      const at = Math.round(Math.min(100, Math.max(0, ((x - pad) / (W - pad * 2)) * 100)));
      const raw = 1 - (y - pad) / (H - pad * 2);
      const val =
        field === "glow"
          ? Math.min(1, Math.max(0, Math.round(raw * 100) / 100))
          : Math.round(Math.min(100, Math.max(0, raw * 100)));
      const next = sorted.map((k, i) => (i === idx ? { ...k, at, [field]: val } : k));
      onChange(next.sort((a, b) => a.at - b.at));
    },
    [field, onChange, sorted]
  );

  const stroke = field === "bgX" ? "#a855f7" : field === "bgY" ? "#06b6d4" : "#f59e0b";

  return (
    <div>
      <p className="text-[11px] text-gray-500 mb-1.5">{label}</p>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-[88px] rounded-lg bg-black/40 border border-white/10">
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(255,255,255,0.08)" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="rgba(255,255,255,0.08)" />
        <polyline points={line} fill="none" stroke={stroke} strokeWidth="2" />
        {sorted.map((k, i) => (
          <circle
            key={`${k.at}-${i}`}
            cx={toX(k.at)}
            cy={toY(k[field])}
            r="6"
            fill={stroke}
            stroke="#fff"
            strokeWidth="1.5"
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              const move = (ev: PointerEvent) => drag(i, ev.clientX, ev.clientY);
              const up = () => {
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", up);
            }}
          />
        ))}
      </svg>
    </div>
  );
}

function LivePreviewPanel({
  slug,
  config,
}: {
  slug: string;
  config: TagStyleConfig;
}) {
  const previewTag = slug || "preview";

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Live preview</p>

      <div className="rounded-xl border border-white/10 bg-black/60 p-8 flex flex-col items-center justify-center min-h-[120px] gap-4">
        {slug ? (
          <StyledTagBadge tag={previewTag} config={config} />
        ) : (
          <span className="text-xs text-gray-600">Enter slug to preview</span>
        )}
        <p className="text-[10px] text-gray-700 uppercase tracking-wider">On dark background</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider">Blog card context</p>
        <div className="flex items-center gap-2 flex-wrap">
          {slug ? (
            <>
              <StyledTagBadge tag={previewTag} config={config} />
              <span className="text-[10px] text-gray-700 font-bold uppercase">+ plain tag</span>
            </>
          ) : (
            <span className="text-xs text-gray-600">—</span>
          )}
        </div>
      </div>

      <MotionPathPreview keyframes={config.keyframes} />

      <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 text-[11px] font-mono text-gray-500 space-y-1">
        <p>{config.keyframes.length} keyframes · {config.duration}s · {config.bgSize}% bg</p>
        <p className="text-gray-700">{config.textEffect} · {config.angle}° · {config.easing}</p>
      </div>
    </div>
  );
}

function MotionPathPreview({ keyframes }: { keyframes: TagKeyframe[] }) {
  const sorted = [...keyframes].sort((a, b) => a.at - b.at);
  const pad = 10;
  const S = 120;
  const toX = (v: number) => pad + (v / 100) * (S - pad * 2);
  const toY = (v: number) => pad + (v / 100) * (S - pad * 2);
  const line = sorted.map((k) => `${toX(k.bgX)},${toY(k.bgY)}`).join(" ");

  return (
    <div className="w-full">
      <p className="text-[11px] text-gray-500 mb-1.5">Gradient path (X × Y)</p>
      <svg viewBox={`0 0 ${S} ${S}`} className="w-full aspect-square max-w-[200px] mx-auto rounded-lg bg-black/40 border border-white/10">
        {[25, 50, 75].map((g) => (
          <line key={`h${g}`} x1={pad} y1={toY(g)} x2={S - pad} y2={toY(g)} stroke="rgba(255,255,255,0.04)" />
        ))}
        {[25, 50, 75].map((g) => (
          <line key={`v${g}`} x1={toX(g)} y1={pad} x2={toX(g)} y2={S - pad} stroke="rgba(255,255,255,0.04)" />
        ))}
        <text x={pad} y={pad + 8} fill="rgba(255,255,255,0.2)" fontSize="7">↑ Y</text>
        <text x={S - pad - 16} y={S - 4} fill="rgba(255,255,255,0.2)" fontSize="7">X →</text>
        <polyline points={line} fill="none" stroke="#d946ef" strokeWidth="1.5" strokeDasharray="3 2" />
        {sorted.map((k, i) => (
          <circle key={i} cx={toX(k.bgX)} cy={toY(k.bgY)} r="4" fill="#e879f9" stroke="#fff" strokeWidth="1" />
        ))}
      </svg>
    </div>
  );
}

export default function TagStyleEditor({ initial }: { initial: TagStyleRecord[] }) {
  const [styles, setStyles] = useState(initial);
  const [slug, setSlug] = useState(initial[0]?.slug ?? "");
  const [config, setConfig] = useState<TagStyleConfig>(
    cloneConfig(initial[0]?.config ?? DEFAULT_TAG_STYLE)
  );
  const [easingMode, setEasingMode] = useState(
    EASING_PRESETS.some((p) => p.value === config.easing) ? config.easing : "custom"
  );
  const [customEasing, setCustomEasing] = useState(
    EASING_PRESETS.some((p) => p.value === config.easing) ? "cubic-bezier(0.4, 0, 0.2, 1)" : config.easing
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectSlug = (s: string) => {
    const rec = styles.find((x) => x.slug === s);
    setSlug(s);
    if (rec) {
      const c = cloneConfig(rec.config);
      setConfig(c);
      setEasingMode(EASING_PRESETS.some((p) => p.value === c.easing) ? c.easing : "custom");
      if (!EASING_PRESETS.some((p) => p.value === c.easing)) setCustomEasing(c.easing);
    }
    setError("");
  };

  const patch = (partial: Partial<TagStyleConfig>) => setConfig((c) => ({ ...c, ...partial }));

  const effectiveEasing = easingMode === "custom" ? customEasing : easingMode;
  const previewConfig = useMemo(() => ({ ...config, easing: effectiveEasing }), [config, effectiveEasing]);

  async function save() {
    const s = slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) {
      setError("Slug: lowercase letters, numbers, hyphens");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const method = styles.some((x) => x.slug === s) ? "PUT" : "POST";
      const url = method === "PUT" ? `/api/admin/tags/${s}` : "/api/admin/tags";
      const body = method === "PUT" ? { config: previewConfig } : { slug: s, config: previewConfig };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setStyles((prev) => {
        const rest = prev.filter((x) => x.slug !== data.slug);
        return [...rest, data].sort((a, b) => a.slug.localeCompare(b.slug));
      });
      setSlug(data.slug);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: string) {
    if (!confirm(`Delete style for "${s}"?`)) return;
    const res = await fetch(`/api/admin/tags/${s}`, { method: "DELETE" });
    if (!res.ok) return;
    const next = styles.filter((x) => x.slug !== s);
    setStyles(next);
    if (slug === s) {
      setSlug(next[0]?.slug ?? "");
      if (next[0]) setConfig(cloneConfig(next[0].config));
    }
  }

  function addKeyframe() {
    const last = config.keyframes[config.keyframes.length - 1];
    patch({
      keyframes: [
        ...config.keyframes,
        { at: Math.min(100, (last?.at ?? 0) + 25), bgX: last?.bgX ?? 50, bgY: last?.bgY ?? 50, glow: last?.glow ?? 0.5 },
      ].sort((a, b) => a.at - b.at),
    });
  }

  function removeKeyframe(idx: number) {
    if (config.keyframes.length <= 2) return;
    patch({ keyframes: config.keyframes.filter((_, i) => i !== idx) });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] xl:grid-cols-[200px_minmax(0,1fr)_260px] gap-6">
      <aside className="space-y-2 lg:row-span-1 xl:row-span-full">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-2">Tags</p>
        {styles.map((s) => (
          <div key={s.slug} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => selectSlug(s.slug)}
              className={`flex-1 text-left px-3 py-2 rounded-lg text-sm font-mono transition-colors ${
                slug === s.slug ? "bg-white/10 text-white" : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
              }`}
            >
              #{s.slug}
            </button>
            <button
              type="button"
              onClick={() => remove(s.slug)}
              className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10"
              aria-label={`Delete ${s.slug}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setSlug("");
            setConfig(cloneConfig(DEFAULT_TAG_STYLE));
            setError("");
          }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-300 hover:bg-white/5"
        >
          <Plus className="w-4 h-4" />
          New tag
        </button>
      </aside>

      <div className="space-y-5 min-w-0">
        <div className="xl:hidden glass rounded-xl p-4">
          <LivePreviewPanel slug={slug} config={previewConfig} />
        </div>

        <div className="glass rounded-xl p-5 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Identity</p>
          <div>
            <label className="admin-label">Tag slug</label>
            <input
              className="admin-input font-mono"
              placeholder="development"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
            />
          </div>
        </div>

        <div className="glass rounded-xl p-5 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Colors</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(
              [
                ["gradientFrom", "Gradient start"],
                ["gradientTo", "Gradient end"],
                ["glowColor", "Glow"],
                ["textColor", "Text"],
              ] as const
            ).map(([key, lbl]) => (
              <div key={key}>
                <label className="admin-label">{lbl}</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={config[key]}
                    onChange={(e) => patch({ [key]: e.target.value })}
                    className="h-9 w-12 rounded cursor-pointer bg-transparent border border-white/10"
                  />
                  <input
                    className="admin-input font-mono flex-1"
                    value={config[key]}
                    onChange={(e) => patch({ [key]: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Gradient angle</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
                {ANGLE_PRESETS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => patch({ angle: a })}
                    className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
                      config.angle === a
                        ? "border-white/30 bg-white/10 text-white"
                        : "border-white/10 text-gray-600 hover:border-white/20"
                    }`}
                  >
                    {a}°
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={config.angle}
                onChange={(e) => patch({ angle: Number(e.target.value) })}
                className="w-full accent-fuchsia-500"
              />
            </div>
            <div>
              <label className="admin-label">Gradient size ({config.bgSize}%)</label>
              <input
                type="range"
                min={100}
                max={400}
                step={10}
                value={config.bgSize}
                onChange={(e) => patch({ bgSize: Number(e.target.value) })}
                className="w-full accent-cyan-500 mt-3"
              />
              <p className="text-[10px] text-gray-700 mt-1">Bigger = more travel room for motion</p>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Text effect</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TEXT_EFFECTS.map(({ value, label, hint }) => (
              <button
                key={value}
                type="button"
                onClick={() => patch({ textEffect: value })}
                className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  config.textEffect === value
                    ? "border-fuchsia-500/40 bg-fuchsia-500/10 text-white"
                    : "border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300"
                }`}
              >
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-[10px] text-gray-600 mt-0.5 leading-tight">{hint}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-5 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Motion presets</p>
          <p className="text-[11px] text-gray-600 -mt-2">One-click gradient travel direction. Tweak curves after.</p>
          <div className="flex flex-wrap gap-2">
            {MOTION_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.hint}
                onClick={() => patch({ keyframes: p.keyframes.map((k) => ({ ...k })) })}
                className="h-9 min-w-[2.25rem] px-2 rounded-lg border border-white/10 text-sm font-mono text-gray-400 hover:border-white/25 hover:text-white hover:bg-white/5 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="admin-label">Duration ({config.duration}s)</label>
              <input
                type="range"
                min={0.5}
                max={15}
                step={0.5}
                value={config.duration}
                onChange={(e) => patch({ duration: Number(e.target.value) })}
                className="w-full accent-fuchsia-500"
              />
            </div>
            <div>
              <label className="admin-label">Easing</label>
              <select className="admin-input" value={easingMode} onChange={(e) => setEasingMode(e.target.value)}>
                {EASING_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              {easingMode === "custom" && (
                <input
                  className="admin-input font-mono mt-2"
                  placeholder="cubic-bezier(0.4, 0, 0.2, 1)"
                  value={customEasing}
                  onChange={(e) => setCustomEasing(e.target.value)}
                />
              )}
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Keyframe curves</p>
            <button type="button" onClick={addKeyframe} className="admin-btn admin-btn--ghost admin-btn--xs">
              <Plus className="w-3 h-3 mr-1" />
              Add
            </button>
          </div>

          <div className="space-y-4 min-w-0">
              <KeyframeCurve
                keyframes={config.keyframes}
                field="bgX"
                label="Horizontal (left ↔ right)"
                onChange={(keyframes) => patch({ keyframes })}
              />
              <KeyframeCurve
                keyframes={config.keyframes}
                field="bgY"
                label="Vertical (up ↔ down)"
                onChange={(keyframes) => patch({ keyframes })}
              />
              <KeyframeCurve
                keyframes={config.keyframes}
                field="glow"
                label="Glow intensity"
                onChange={(keyframes) => patch({ keyframes })}
              />
          </div>

          <div className="flex flex-wrap gap-2">
            {config.keyframes.map((k, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-[10px] font-mono text-gray-500 bg-white/5 pl-2 pr-1 py-1 rounded"
              >
                {k.at}% x{k.bgX} y{k.bgY} g{k.glow.toFixed(1)}
                {config.keyframes.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeKeyframe(i)}
                    className="p-0.5 rounded hover:text-red-400 hover:bg-red-500/10"
                    aria-label="Remove keyframe"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saving || !slug.trim()}
            onClick={() => void save()}
            className="admin-btn admin-btn--primary admin-btn--md"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving…" : "Save style"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-6 glass rounded-xl p-5">
          <LivePreviewPanel slug={slug} config={previewConfig} />
        </div>
      </aside>
    </div>
  );
}
