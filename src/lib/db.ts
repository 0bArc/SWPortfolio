import { Pool } from "pg";

const g = global as typeof globalThis & { _pgPool?: Pool };

export function getPool(): Pool {
  if (!g._pgPool) {
    g._pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return g._pgPool;
}
