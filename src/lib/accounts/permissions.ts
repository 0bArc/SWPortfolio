import { BADGE_BY_SLUG, type Permission } from "@/lib/accounts/badges";
import { distinctBadgeSlugs } from "@/lib/db/accounts";

export type { Permission };

const ENV_ADMIN_PERMS: Permission[] = [
  "badges:award",
  "badges:award:privileged",
  "admin:users",
  "comments:moderate",
];

export function isEnvAdmin(username: string): boolean {
  const admin = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  return !!admin && username.toLowerCase() === admin;
}

export function permissionsFromBadgeSlugs(
  slugs: Iterable<string>,
  username: string
): Set<Permission> {
  const perms = new Set<Permission>();
  if (isEnvAdmin(username)) {
    for (const p of ENV_ADMIN_PERMS) perms.add(p);
  }
  for (const slug of slugs) {
    for (const p of BADGE_BY_SLUG[slug]?.grants ?? []) perms.add(p);
  }
  return perms;
}

export async function resolvePermissions(
  accountId: number,
  username: string
): Promise<Set<Permission>> {
  const slugs = await distinctBadgeSlugs(accountId);
  return permissionsFromBadgeSlugs(slugs, username);
}

export function hasPermission(perms: Set<Permission>, perm: Permission): boolean {
  return perms.has(perm);
}

export function canGrantBadge(perms: Set<Permission>, slug: string): boolean {
  const def = BADGE_BY_SLUG[slug];
  if (!def || def.grant.auto) return false;

  const required = def.grant.requires ?? (["badges:award"] as Permission[]);
  if (!required.every((p) => perms.has(p))) return false;
  if (def.grant.privileged && !perms.has("badges:award:privileged")) return false;
  return true;
}

export function listPermissions(perms: Set<Permission>): Permission[] {
  return [...perms].sort();
}

export function canModerateComments(perms: Set<Permission>, username: string): boolean {
  return isEnvAdmin(username) || perms.has("comments:moderate") || perms.has("admin:users");
}
