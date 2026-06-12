import { getAccountByUsername } from "@/database/accounts";
import {
  canAccessAdminPanel,
  resolvePermissions,
} from "@/features/accounts/services/permissions/resolve";
import { getAccountSession } from "@/features/accounts/services/auth/session";

export type AdminBridgeInfo =
  | { canBridge: false }
  | { canBridge: true; username: string; displayName: string };

export async function getAdminBridgeInfo(): Promise<AdminBridgeInfo> {
  const session = await getAccountSession();
  if (!session) return { canBridge: false };

  const row = await getAccountByUsername(session.username);
  if (!row || row.banned_at) return { canBridge: false };

  const perms = await resolvePermissions(row.id, row.username);
  if (!canAccessAdminPanel(perms, row.username)) return { canBridge: false };

  return {
    canBridge: true,
    username: session.username,
    displayName: session.displayName,
  };
}
