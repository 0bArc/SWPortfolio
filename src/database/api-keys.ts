import { randomBytes } from "node:crypto";
import { getPool } from "@/database";
import { hashToken } from "@/lib/crypto";

const TABLE = "account_api_keys";
const MAX_KEYS_PER_ACCOUNT = 5;
const KEY_PREFIX = "kn_";

export type ApiKeyRow = {
  id: number;
  accountId: number;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

type Row = {
  id: number;
  account_id: number;
  name: string;
  key_prefix: string;
  last_used_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
};

function mapRow(row: Row): ApiKeyRow {
  return {
    id: row.id,
    accountId: row.account_id,
    name: row.name,
    keyPrefix: row.key_prefix,
    lastUsedAt: row.last_used_at?.toISOString() ?? null,
    revokedAt: row.revoked_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

export function generateApiKeyRaw(): string {
  return `${KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export function apiKeyPrefix(raw: string): string {
  return raw.slice(0, 12);
}

export async function listApiKeysForAccount(accountId: number): Promise<ApiKeyRow[]> {
  const { rows } = await getPool().query<Row>(
    `SELECT id, account_id, name, key_prefix, last_used_at, revoked_at, created_at
     FROM ${TABLE}
     WHERE account_id = $1 AND revoked_at IS NULL
     ORDER BY created_at DESC`,
    [accountId]
  );
  return rows.map(mapRow);
}

export async function countActiveApiKeys(accountId: number): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${TABLE} WHERE account_id = $1 AND revoked_at IS NULL`,
    [accountId]
  );
  return Number(rows[0]?.count ?? 0);
}

export async function createApiKey(
  accountId: number,
  name: string
): Promise<{ key: ApiKeyRow; raw: string } | { error: string }> {
  const active = await countActiveApiKeys(accountId);
  if (active >= MAX_KEYS_PER_ACCOUNT) {
    return { error: `Maximum ${MAX_KEYS_PER_ACCOUNT} active keys` };
  }

  const raw = generateApiKeyRaw();
  const tokenHash = hashToken(raw, "api_key");
  const prefix = apiKeyPrefix(raw);
  const trimmedName = name.trim().slice(0, 64) || "Default";

  const { rows } = await getPool().query<Row>(
    `INSERT INTO ${TABLE} (account_id, name, key_prefix, token_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, account_id, name, key_prefix, last_used_at, revoked_at, created_at`,
    [accountId, trimmedName, prefix, tokenHash]
  );

  return { key: mapRow(rows[0]!), raw };
}

export async function revokeApiKey(accountId: number, keyId: number): Promise<boolean> {
  const { rowCount } = await getPool().query(
    `UPDATE ${TABLE} SET revoked_at = NOW() WHERE id = $1 AND account_id = $2 AND revoked_at IS NULL`,
    [keyId, accountId]
  );
  return (rowCount ?? 0) > 0;
}

export async function resolveApiKeyAccount(raw: string): Promise<number | null> {
  if (!raw.startsWith(KEY_PREFIX) || raw.length < 20) return null;
  const tokenHash = hashToken(raw, "api_key");
  const { rows } = await getPool().query<{ account_id: number }>(
    `UPDATE ${TABLE}
     SET last_used_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL
     RETURNING account_id`,
    [tokenHash]
  );
  return rows[0]?.account_id ?? null;
}
