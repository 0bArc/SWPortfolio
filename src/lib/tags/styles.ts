import { cache } from "react";
import { getPool } from "@/lib/db";

export type { TagKeyframe, TagStyleConfig, TagStyleRecord, TagTextEffect } from "@/lib/tags/types";
import type { TagKeyframe, TagStyleConfig, TagStyleRecord, TagTextEffect } from "@/lib/tags/types";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

import { normalizeTagConfig } from "@/lib/tags/presets";

export { DEFAULT_KEYFRAMES, DEFAULT_TAG_STYLE, PRESET_TAG_STYLES, normalizeTagConfig } from "@/lib/tags/presets";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function parseKeyframe(raw: unknown): TagKeyframe | null {
  if (!raw || typeof raw !== "object") return null;
  const k = raw as Record<string, unknown>;
  if (typeof k.at !== "number") return null;
  return {
    at: clamp(k.at, 0, 100),
    bgX: clamp(Number(k.bgX) || 0, 0, 100),
    bgY: clamp(Number(k.bgY) || 50, 0, 100),
    glow: clamp(Number(k.glow) || 0, 0, 1),
  };
}

export function parseTagStyleConfig(raw: unknown): TagStyleConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.gradientFrom !== "string" ||
    typeof o.gradientTo !== "string" ||
    !HEX_RE.test(o.gradientFrom) ||
    !HEX_RE.test(o.gradientTo)
  ) {
    return null;
  }
  const glowColor = typeof o.glowColor === "string" && HEX_RE.test(o.glowColor) ? o.glowColor : o.gradientFrom;
  const textColor = typeof o.textColor === "string" && HEX_RE.test(o.textColor) ? o.textColor : "#ffffff";
  const keyframesRaw = Array.isArray(o.keyframes) ? o.keyframes : [];
  const keyframes = keyframesRaw.map(parseKeyframe).filter((k): k is TagKeyframe => k !== null);
  if (keyframes.length < 2) return null;

  const textEffects: TagTextEffect[] = ["none", "cryptic", "flicker", "pulse"];
  const textEffect: TagTextEffect =
    typeof o.textEffect === "string" && textEffects.includes(o.textEffect as TagTextEffect)
      ? (o.textEffect as TagTextEffect)
      : o.cryptic
        ? "cryptic"
        : "none";

  return {
    gradientFrom: o.gradientFrom,
    gradientTo: o.gradientTo,
    glowColor,
    textColor,
    textEffect,
    duration: clamp(Number(o.duration) || 4, 0.5, 30),
    easing: typeof o.easing === "string" && o.easing.length <= 64 ? o.easing : "ease-in-out",
    angle: clamp(Number(o.angle) || 90, 0, 360),
    bgSize: clamp(Number(o.bgSize) || 200, 100, 500),
    keyframes: keyframes.sort((a, b) => a.at - b.at),
  };
}

export function isValidTagSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= 50 && SLUG_RE.test(slug);
}

function rowToRecord(row: { slug: string; config: TagStyleConfig; updated_at: string }): TagStyleRecord {
  return { slug: row.slug, config: normalizeTagConfig(row.config), updated_at: row.updated_at };
}

export async function listTagStyles(): Promise<TagStyleRecord[]> {
  const { rows } = await getPool().query<{ slug: string; config: TagStyleConfig; updated_at: string }>(
    `SELECT slug, config, updated_at::text FROM tag_styles ORDER BY slug`
  );
  return rows.map(rowToRecord);
}

export const getTagStylesMap = cache(async (): Promise<Map<string, TagStyleRecord>> => {
  const styles = await listTagStyles();
  return new Map(styles.map((s) => [s.slug, s]));
});

export async function getTagStyle(slug: string): Promise<TagStyleRecord | null> {
  const map = await getTagStylesMap();
  return map.get(slug.toLowerCase()) ?? null;
}

export async function upsertTagStyle(slug: string, config: TagStyleConfig): Promise<TagStyleRecord> {
  const { rows } = await getPool().query<{ slug: string; config: TagStyleConfig; updated_at: string }>(
    `INSERT INTO tag_styles (slug, config)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (slug) DO UPDATE SET config = $2::jsonb, updated_at = NOW()
     RETURNING slug, config, updated_at::text`,
    [slug, JSON.stringify(config)]
  );
  return rowToRecord(rows[0]);
}

export async function deleteTagStyle(slug: string): Promise<boolean> {
  const { rowCount } = await getPool().query(`DELETE FROM tag_styles WHERE slug = $1`, [slug]);
  return (rowCount ?? 0) > 0;
}
