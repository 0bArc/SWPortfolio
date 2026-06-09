import { requireActiveAccount } from "@/features/accounts/services/auth/session";
import {
  canUseStaffPanel,
  hasPermission,
  resolvePermissions,
  type Permission,
} from "@/features/accounts/services/permissions/resolve";
import { jsonError } from "@/lib/network/http";

export async function requireStaffPermission(
  permission: Permission
): Promise<{ accountId: number; username: string } | Response> {
  const auth = await requireActiveAccount();
  if (auth instanceof Response) return auth;

  const perms = await resolvePermissions(auth.accountId, auth.account.username);
  if (!hasPermission(perms, permission)) {
    return jsonError("Not allowed", 403);
  }

  return { accountId: auth.accountId, username: auth.account.username };
}

/** Any staff-panel capability (mod, badge grant, admin users). */
export async function requireStaffPanel(): Promise<
  { accountId: number; username: string } | Response
> {
  const auth = await requireActiveAccount();
  if (auth instanceof Response) return auth;

  const perms = await resolvePermissions(auth.accountId, auth.account.username);
  if (!canUseStaffPanel(perms)) {
    return jsonError("Not allowed", 403);
  }

  return { accountId: auth.accountId, username: auth.account.username };
}
