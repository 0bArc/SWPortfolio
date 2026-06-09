import { Pool, type PoolConfig } from "pg";
import { ensureSchema, schemaFingerprint } from "@/database/ensure-schema";

const g = global as typeof globalThis & {
  _pgPool?: Pool;
  _schemaReady?: Promise<void>;
  _schemaFp?: number;
};

function buildPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const useSsl =
    process.env.DATABASE_SSL === "true" ||
    (process.env.NODE_ENV === "production" && process.env.DATABASE_SSL !== "false");

  return {
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: useSsl ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined,
    application_name: process.env.APP_NAME ?? "kristiansen",
  };
}

export function getPool(): Pool {
  if (!g._pgPool) {
    g._pgPool = new Pool(buildPoolConfig());
    g._pgPool.on("connect", (client) => {
      void client.query("SET statement_timeout = 30000");
    });
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
