import type { Pool } from "pg";
import { SCHEMA_STATEMENTS } from "./schema";
import { PRESET_TAG_STYLES } from "@/lib/tags/presets";

let ensured: Promise<void> | null = null;

export function ensureSchema(pool: Pool): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      for (const sql of SCHEMA_STATEMENTS) {
        await pool.query(sql);
      }
      for (const [slug, config] of Object.entries(PRESET_TAG_STYLES)) {
        await pool.query(
          `INSERT INTO tag_styles (slug, config) VALUES ($1, $2::jsonb) ON CONFLICT (slug) DO NOTHING`,
          [slug, JSON.stringify(config)]
        );
      }
    })().catch((err) => {
      ensured = null;
      throw err;
    });
  }
  return ensured;
}
