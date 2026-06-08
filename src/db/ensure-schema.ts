import type { Pool } from "pg";
import { SCHEMA_STATEMENTS } from "./schema";

let ensured: Promise<void> | null = null;

export function ensureSchema(pool: Pool): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      for (const sql of SCHEMA_STATEMENTS) {
        await pool.query(sql);
      }
    })().catch((err) => {
      ensured = null;
      throw err;
    });
  }
  return ensured;
}
