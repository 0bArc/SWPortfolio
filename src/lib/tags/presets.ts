import type { TagKeyframe, TagStyleConfig, TagTextEffect } from "@/lib/tags/types";

export const DEFAULT_KEYFRAMES: TagKeyframe[] = [
  { at: 0, bgX: 0, bgY: 50, glow: 0.5 },
  { at: 50, bgX: 100, bgY: 50, glow: 1 },
  { at: 100, bgX: 0, bgY: 50, glow: 0.5 },
];

export const DEFAULT_TAG_STYLE: TagStyleConfig = {
  gradientFrom: "#d946ef",
  gradientTo: "#2563eb",
  glowColor: "#c026d3",
  textColor: "#ffffff",
  textEffect: "cryptic",
  duration: 4,
  easing: "ease-in-out",
  angle: 90,
  bgSize: 200,
  keyframes: DEFAULT_KEYFRAMES,
};

/** Migrate legacy `cryptic` boolean configs from DB. */
export function normalizeTagConfig(
  c: TagStyleConfig & { cryptic?: boolean }
): TagStyleConfig {
  const textEffects: TagTextEffect[] = ["none", "cryptic", "flicker", "pulse"];
  const textEffect =
    c.textEffect && textEffects.includes(c.textEffect) ? c.textEffect : c.cryptic ? "cryptic" : "none";
  return {
    ...c,
    textEffect,
    bgSize: c.bgSize ?? 200,
    keyframes: c.keyframes?.length >= 2 ? c.keyframes : DEFAULT_KEYFRAMES,
  };
}

export const PRESET_TAG_STYLES: Record<string, TagStyleConfig> = {
  development: {
    gradientFrom: "#e879f9",
    gradientTo: "#2563eb",
    glowColor: "#d946ef",
    textColor: "#ffffff",
    textEffect: "cryptic",
    duration: 4,
    easing: "ease-in-out",
    angle: 90,
    bgSize: 200,
    keyframes: DEFAULT_KEYFRAMES,
  },
  update: {
    gradientFrom: "#a855f7",
    gradientTo: "#06b6d4",
    glowColor: "#8b5cf6",
    textColor: "#ffffff",
    textEffect: "flicker",
    duration: 3.5,
    easing: "cubic-bezier(0.45, 0, 0.55, 1)",
    angle: 120,
    bgSize: 220,
    keyframes: [
      { at: 0, bgX: 0, bgY: 30, glow: 0.4 },
      { at: 35, bgX: 80, bgY: 70, glow: 0.9 },
      { at: 70, bgX: 20, bgY: 50, glow: 0.7 },
      { at: 100, bgX: 100, bgY: 30, glow: 0.5 },
    ],
  },
};
