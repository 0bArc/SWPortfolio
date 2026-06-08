import { canModerateComments, listPermissions, resolvePermissions } from "@/lib/accounts/permissions";
import { requireAccount } from "@/lib/accounts/auth";

export async function handleGetPermissions(): Promise<Response> {
  const auth = await requireAccount();
  if (auth instanceof Response) return auth;

  const perms = await resolvePermissions(auth.accountId, auth.account.username);
  return Response.json({
    permissions: listPermissions(perms),
    canAwardBadges: perms.has("badges:award"),
    canAwardPrivileged: perms.has("badges:award:privileged"),
    canAdminUsers: perms.has("admin:users"),
    canModerateComments: canModerateComments(perms, auth.account.username),
  });
}
