import { Pool } from "pg";
import { ensureSchema, schemaFingerprint } from "@/db/ensure-schema";

const g = global as typeof globalThis & {
  _pgPool?: Pool;
  _schemaReady?: Promise<void>;
  _schemaFp?: number;
};

export function getPool(): Pool {
  if (!g._pgPool) {
    g._pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return g._pgPool;
}

export async function getPoolReady(): Promise<Pool> {
  const pool = getPool();
  const fp = schemaFingerprint();
  if (g._schemaFp !== fp || !g._schemaReady) {
    g._schemaFp = fp;
    g._schemaReady = ensureSchema(pool);
  }
  await g._schemaReady;
  return pool;
}
