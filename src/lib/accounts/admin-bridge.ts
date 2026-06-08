import { safeEqual } from "@/lib/admin/auth";
import { SITE_OWNER } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/accounts/password";
import { isValidUsername } from "@/lib/accounts/validation";
import { createAccount, getAccountByUsername } from "@/lib/db/accounts";
import { getPoolReady } from "@/lib/db";
import { ACCOUNTS_TABLE, type AccountRow } from "@/db/schema";

type AccountWithHash = AccountRow & { password_hash: string };

export function matchesAdminLogin(username: string, password: string): boolean {
  const adminUser = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD?.trim();
  if (!adminUser || !adminPass) return false;
  return safeEqual(username, adminUser) && safeEqual(password, adminPass);
}

async function updatePasswordHash(accountId: number, passwordHash: string): Promise<void> {
  const pool = await getPoolReady();
  await pool.query(
    `UPDATE ${ACCOUNTS_TABLE} SET password_hash = $2, updated_at = NOW() WHERE id = $1`,
    [accountId, passwordHash]
  );
}

/** Site admin env creds → visitor account (auto-create on first login). */
export async function ensureAdminVisitorAccount(
  password: string,
  ip: string | null
): Promise<AccountWithHash | null> {
  const adminUser = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  if (!adminUser || !isValidUsername(adminUser)) return null;

  const passwordHash = await hashPassword(password);
  const existing = await getAccountByUsername(adminUser);

  if (!existing) {
    await createAccount({
      username: adminUser,
      displayName: SITE_OWNER || adminUser,
      passwordHash,
      signupIp: ip,
    });
    return getAccountByUsername(adminUser);
  }

  if (!(await verifyPassword(password, existing.password_hash))) {
    await updatePasswordHash(existing.id, passwordHash);
    return getAccountByUsername(adminUser);
  }

  return existing;
}
