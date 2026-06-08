import { Pool } from "pg";
import { ensureSchema } from "@/db/ensure-schema";

const g = global as typeof globalThis & { _pgPool?: Pool; _schemaReady?: Promise<void> };

export function getPool(): Pool {
  if (!g._pgPool) {
    g._pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
    g._schemaReady = ensureSchema(g._pgPool);
  }
  return g._pgPool;
}

export async function getPoolReady(): Promise<Pool> {
  const pool = getPool();
  await g._schemaReady;
  return pool;
}
