import { adminConfig } from "@api-config";
import { safeEqual } from "@/features/admin/services/auth";
import { SITE_OWNER } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/features/accounts/services/auth/password";
import { isValidUsername } from "@/features/accounts/services/validation/fields";
import { createAccount, getAccountByUsername } from "@/database/accounts";
import { getPoolReady } from "@/database";
import { ACCOUNTS_TABLE, type AccountRow } from "@/database/schema";

type AccountWithHash = AccountRow & { password_hash: string };

export function matchesAdminLogin(username: string, password: string): boolean {
  const adminUser = adminConfig.username.trim().toLowerCase();
  const adminPass = adminConfig.password.trim();
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
  const adminUser = adminConfig.username.trim().toLowerCase();
  if (!adminUser || !isValidUsername(adminUser)) return null;

  const passwordHash = await hashPassword(password);
  const existing = await getAccountByUsername(adminUser);

  if (!existing) {
    await createAccount({
      username: adminUser,
      displayName: SITE_OWNER || adminUser,
      passwordHash,
      signupIp: ip,
      emailVerified: true,
    });
    return getAccountByUsername(adminUser);
  }

  if (!(await verifyPassword(password, existing.password_hash))) {
    await updatePasswordHash(existing.id, passwordHash);
    return getAccountByUsername(adminUser);
  }

  return existing;
}
