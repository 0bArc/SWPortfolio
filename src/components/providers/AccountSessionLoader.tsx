import { getAccountSession } from "@/features/accounts/services/auth/session";
import type { SessionAccount } from "@/providers/AccountSessionProvider";
import AppProviders from "./AppProviders";

function toSessionAccount(
  row: Awaited<ReturnType<typeof getAccountSession>>
): SessionAccount | null {
  if (!row) return null;
  return {
    username: row.username,
    displayName: row.displayName,
    icon: row.icon,
    iconPending: row.iconPending,
    emailVerified: row.emailVerified,
    email: row.email,
    ban: row.ban ?? null,
  };
}

export default async function AccountSessionLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialAccount: SessionAccount | null = null;
  try {
    initialAccount = toSessionAccount(await getAccountSession());
  } catch {
    // DB down or unreachable — render site without session instead of crashing
  }
  return <AppProviders initialAccount={initialAccount}>{children}</AppProviders>;
}
