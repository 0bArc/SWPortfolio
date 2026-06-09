import { getPoolReady } from "@/database";
import { ACCOUNTS_TABLE, type AccountBanView } from "@/database/schema";

type BanRow = {
  banned_at: Date | null;
  ban_reason: string | null;
  banned_until: Date | null;
  banned_by_username: string | null;
  banned_by_display_name: string | null;
};

function toBanView(row: BanRow): AccountBanView | null {
  if (!row.banned_at) return null;
  return {
    reason: row.ban_reason?.trim() || null,
    bannedAt: row.banned_at.toISOString(),
    expiresAt: row.banned_until?.toISOString() ?? null,
    bannedBy: row.banned_by_username
      ? {
          username: row.banned_by_username,
          displayName: row.banned_by_display_name ?? row.banned_by_username,
        }
      : null,
  };
}

const BAN_SELECT = `
  a.banned_at, a.ban_reason, a.banned_until,
  staff.username AS banned_by_username,
  staff.display_name AS banned_by_display_name`;

export async function clearExpiredBan(accountId: number): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(
    `UPDATE ${ACCOUNTS_TABLE}
     SET banned_at = NULL, ban_reason = NULL, banned_until = NULL, banned_by_account_id = NULL, updated_at = NOW()
     WHERE id = $1 AND banned_at IS NOT NULL AND banned_until IS NOT NULL AND banned_until <= NOW()`,
    [accountId]
  );
}

export async function getAccountBan(accountId: number): Promise<AccountBanView | null> {
  await clearExpiredBan(accountId);
  const pool = await getPoolReady();
  const { rows } = await pool.query<BanRow>(
    `SELECT ${BAN_SELECT}
     FROM ${ACCOUNTS_TABLE} a
     LEFT JOIN ${ACCOUNTS_TABLE} staff ON staff.id = a.banned_by_account_id
     WHERE a.id = $1`,
    [accountId]
  );
  return toBanView(rows[0] ?? { banned_at: null, ban_reason: null, banned_until: null, banned_by_username: null, banned_by_display_name: null });
}

export async function banAccount(input: {
  accountId: number;
  reason?: string | null;
  until?: string | Date | null;
  bannedByAccountId?: number | null;
}): Promise<void> {
  const pool = await getPoolReady();
  const until =
    input.until == null || input.until === ""
      ? null
      : input.until instanceof Date
        ? input.until
        : new Date(input.until);
  if (until && Number.isNaN(until.getTime())) {
    throw new Error("Invalid ban expiry");
  }

  await pool.query(
    `UPDATE ${ACCOUNTS_TABLE}
     SET banned_at = NOW(),
         ban_reason = $2,
         banned_until = $3,
         banned_by_account_id = $4,
         updated_at = NOW()
     WHERE id = $1`,
    [input.accountId, input.reason?.trim() || null, until, input.bannedByAccountId ?? null]
  );
}

export async function unbanAccount(accountId: number): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(
    `UPDATE ${ACCOUNTS_TABLE}
     SET banned_at = NULL, ban_reason = NULL, banned_until = NULL, banned_by_account_id = NULL, updated_at = NOW()
     WHERE id = $1`,
    [accountId]
  );
}

export { BAN_SELECT };
