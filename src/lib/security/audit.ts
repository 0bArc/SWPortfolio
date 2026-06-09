import type { Pool } from "pg";
import { getPoolReady } from "@/database";

export type SecurityEventType =
  | "login_failed"
  | "login_success"
  | "signup"
  | "email_verify_failed"
  | "email_verify_success"
  | "rate_limited";

export async function logSecurityEvent(input: {
  type: SecurityEventType;
  ip?: string | null;
  accountId?: number | null;
  meta?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  try {
    const pool = await getPoolReady();
    await pool.query(
      `INSERT INTO security_events (event_type, ip_address, account_id, meta)
       VALUES ($1, $2::inet, $3, $4::jsonb)`,
      [
        input.type,
        input.ip ?? null,
        input.accountId ?? null,
        JSON.stringify(input.meta ?? {}),
      ]
    );
  } catch {
    // Never block auth flow on audit failure
  }
}

export async function purgeExpiredTokens(pool: Pool): Promise<void> {
  await pool.query(`DELETE FROM account_tokens WHERE expires_at < NOW()`);
  await pool.query(`DELETE FROM account_email_tokens WHERE expires_at < NOW()`);
}

export async function purgeOldSecurityEvents(pool: Pool): Promise<void> {
  await pool.query(
    `DELETE FROM security_events WHERE created_at < NOW() - INTERVAL '90 days'`
  );
}
