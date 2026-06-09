import { canModerateComments, listPermissions, resolvePermissions } from "@/features/accounts/services/permissions/resolve";
import { requireActiveAccount } from "@/features/accounts/services/auth/session";

export async function handleGetPermissions(): Promise<Response> {
  const auth = await requireActiveAccount();
  if (auth instanceof Response) return auth;

  const perms = await resolvePermissions(auth.accountId, auth.account.username);
  return Response.json({
    permissions: listPermissions(perms),
    canAwardBadges: perms.has("badges:award"),
    canGrantMod: perms.has("badges:grant:mod"),
    canGrantDev: perms.has("badges:grant:dev"),
    canGrantAdmin: perms.has("badges:grant:admin"),
    canGrantFounder: perms.has("badges:grant:founder"),
    canAdminUsers: perms.has("admin:users"),
    canModerateUsers: perms.has("users:moderate"),
    canAdminPanel: perms.has("admin:panel"),
    canModerateComments: canModerateComments(perms, auth.account.username),
  });
}
