import { adminConfig } from "@api-config";

import {

  ALL_PERMISSIONS,

  PROTECTED_ACCOUNT_USERNAMES,

  PERMISSIONS,

  type Permission,

} from "@permissions-config";

import {

  canActorGrantBadge,

  permissionsFromBadgeDefs,

  roleIdFromBadgeSlug,

  roleRankFromSlugs,

} from "@/features/accounts/services/badges/award";

import { BADGE_BY_SLUG } from "@/features/accounts/services/badges/definitions";

import { distinctBadgeSlugs } from "@/database/accounts";



export type { Permission };



const ENV_ADMIN_PERMS = new Set<Permission>(ALL_PERMISSIONS);



export { roleIdFromBadgeSlug, roleRankFromSlugs };



export function isEnvAdmin(username: string): boolean {

  const admin = adminConfig.username.trim().toLowerCase();

  return !!admin && username.toLowerCase() === admin;

}



export function isProtectedAccount(username: string): boolean {

  const u = username.toLowerCase();

  if (isEnvAdmin(u)) return true;

  return PROTECTED_ACCOUNT_USERNAMES.some((p) => p.toLowerCase() === u);

}



export function permissionsFromBadgeSlugs(

  slugs: Iterable<string>,

  username: string

): Set<Permission> {

  if (isEnvAdmin(username)) {

    return new Set(ENV_ADMIN_PERMS);

  }

  return permissionsFromBadgeDefs(slugs);

}



export async function resolvePermissions(

  accountId: number,

  username: string

): Promise<Set<Permission>> {

  const slugs = await distinctBadgeSlugs(accountId);

  return permissionsFromBadgeSlugs(slugs, username);

}



export async function resolveBadgeSlugs(accountId: number): Promise<string[]> {

  return distinctBadgeSlugs(accountId);

}



export function hasPermission(perms: Set<Permission>, perm: Permission): boolean {

  return perms.has(perm);

}



export function canGrantBadge(
  perms: Set<Permission>,
  slug: string,
  actorRank = 99
): boolean {
  return canActorGrantBadge(actorRank, perms, slug);
}



export function canAccessAdminPanel(perms: Set<Permission>, username: string): boolean {

  if (isEnvAdmin(username)) return true;

  return perms.has("admin:panel");

}



export function canModerateComments(perms: Set<Permission>, username: string): boolean {

  return (

    isEnvAdmin(username) ||

    perms.has("comments:moderate") ||

    perms.has("admin:users")

  );

}



export function canUseStaffPanel(perms: Set<Permission>): boolean {

  return (

    perms.has("users:moderate") ||

    perms.has("admin:users") ||

    perms.has("badges:award") ||

    perms.has("badges:grant:mod") ||

    perms.has("badges:grant:dev") ||

    perms.has("badges:grant:admin") ||

    perms.has("badges:grant:founder")

  );

}



/** Target moderation / badge edit — actor must outrank target; protected accounts = founder only. */

export function canActOnUser(input: {

  actorUsername: string;

  actorSlugs: string[];

  targetUsername: string;

  targetSlugs: string[];

}): { ok: true } | { ok: false; error: string } {

  const target = input.targetUsername.toLowerCase();

  const actorRank = roleRankFromSlugs(input.actorSlugs);

  const targetRank = roleRankFromSlugs(input.targetSlugs);



  if (isProtectedAccount(target) && actorRank !== 0) {

    return { ok: false, error: "Only the founder can modify this account" };

  }



  if (isEnvAdmin(input.actorUsername) && !isEnvAdmin(target)) {

    return { ok: true };

  }



  if (actorRank === 99) {

    return { ok: false, error: "Not allowed" };

  }



  if (targetRank <= actorRank && target !== input.actorUsername.toLowerCase()) {

    return { ok: false, error: "Cannot modify a user at your rank or above" };

  }



  return { ok: true };

}



export function listPermissions(perms: Set<Permission>): Permission[] {

  return [...perms].sort();

}



export { PERMISSIONS };


