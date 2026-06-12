import { listStaffAwardableSlugs, roleRankFromSlugs } from "@/features/accounts/services/badges/award";
import { canModerateComments, listPermissions, resolvePermissions } from "@/features/accounts/services/permissions/resolve";
import { requireActiveAccount } from "@/features/accounts/services/auth/session";
import { distinctBadgeSlugs } from "@/database/accounts";

export async function handleGetPermissions(): Promise<Response> {
  const auth = await requireActiveAccount();
  if (auth instanceof Response) return auth;

  const perms = await resolvePermissions(auth.accountId, auth.account.username);
  const actorSlugs = await distinctBadgeSlugs(auth.accountId);
  const actorRank = roleRankFromSlugs(actorSlugs);
  const grantableBadgeSlugs = listStaffAwardableSlugs(actorRank, perms);
  return Response.json({
    permissions: listPermissions(perms),
    grantableBadgeSlugs,
    canAwardBadges: perms.has("badges:award"),
    canGrantMod: perms.has("badges:grant:mod"),
    canGrantDev: perms.has("badges:grant:dev"),
    canGrantAdmin: perms.has("badges:grant:admin"),
    canGrantFounder: perms.has("badges:grant:founder"),
    canAdminUsers: perms.has("admin:users"),
    canModerateUsers: perms.has("users:moderate"),
    canAdminPanel: perms.has("admin:panel"),
    canWritePosts: perms.has("posts:write"),
    canModerateComments: canModerateComments(perms, auth.account.username),
  });
}
