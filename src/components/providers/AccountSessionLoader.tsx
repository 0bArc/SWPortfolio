import { getAccountSession } from "@/lib/accounts/auth";
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
  };
}

export default async function AccountSessionLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialAccount = toSessionAccount(await getAccountSession());
  return <AppProviders initialAccount={initialAccount}>{children}</AppProviders>;
}
