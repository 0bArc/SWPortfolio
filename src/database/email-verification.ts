import { randomBytes } from "node:crypto";
import { getPoolReady } from "@/database";
import { ACCOUNTS_TABLE, ACCOUNT_EMAIL_TOKENS_TABLE } from "@/database/schema";
import { hashToken } from "@/lib/crypto";
import {
  normalizeEmail,
  prepareEmailStorage,
  readStoredEmail,
} from "@/database/emails";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export { normalizeEmail };

export async function emailExists(email: string): Promise<boolean> {
  const pool = await getPoolReady();
  const { lookupHash } = prepareEmailStorage(email);
  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM ${ACCOUNTS_TABLE} WHERE email_hash = $1) AS exists`,
    [lookupHash]
  );
  return rows[0]?.exists === true;
}

export async function isAccountEmailVerified(accountId: number): Promise<boolean> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ email: string | null; email_verified_at: Date | null }>(
    `SELECT email, email_verified_at FROM ${ACCOUNTS_TABLE} WHERE id = $1`,
    [accountId]
  );
  const row = rows[0];
  if (!row) return false;
  if (!row.email) return true;
  return row.email_verified_at != null;
}

export async function getAccountEmail(accountId: number): Promise<string | null> {
  const pool = await getPoolReady();
  const { rows } = await pool.query<{ email: string | null }>(
    `SELECT email FROM ${ACCOUNTS_TABLE} WHERE id = $1`,
    [accountId]
  );
  return readStoredEmail(rows[0]?.email ?? null);
}

export async function markEmailVerified(accountId: number): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(
    `UPDATE ${ACCOUNTS_TABLE} SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [accountId]
  );
  await pool.query(`DELETE FROM ${ACCOUNT_EMAIL_TOKENS_TABLE} WHERE account_id = $1`, [accountId]);
}

/** Invalidates prior tokens. Returns raw token for email link (never stored). */
export async function createEmailVerificationToken(accountId: number): Promise<string> {
  const pool = await getPoolReady();
  const raw = randomBytes(32).toString("hex");
  const tokenHash = hashToken(raw, "email_verify");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await pool.query(`DELETE FROM ${ACCOUNT_EMAIL_TOKENS_TABLE} WHERE account_id = $1`, [accountId]);
  await pool.query(
    `INSERT INTO ${ACCOUNT_EMAIL_TOKENS_TABLE} (account_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [accountId, tokenHash, expiresAt]
  );

  return raw;
}

export async function consumeEmailVerificationToken(
  raw: string
): Promise<{ accountId: number; username: string } | null> {
  const pool = await getPoolReady();
  const tokenHash = hashToken(raw, "email_verify");
  const { rows } = await pool.query<{ account_id: number; username: string }>(
    `SELECT t.account_id, a.username
     FROM ${ACCOUNT_EMAIL_TOKENS_TABLE} t
     JOIN ${ACCOUNTS_TABLE} a ON a.id = t.account_id
     WHERE t.token_hash = $1 AND t.expires_at > NOW()`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row) return null;

  await markEmailVerified(row.account_id);
  return { accountId: row.account_id, username: row.username };
}
