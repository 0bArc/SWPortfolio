import type { Permission, RoleId } from "@permissions-config";
import type { BadgeDef } from "./types";
import { BADGE_BY_SLUG, BADGES } from "./definitions";

const NO_ROLE_RANK = 99;

/** Legacy slugs → canonical role id */
const SLUG_ROLE_ALIASES: Record<string, RoleId> = {
  staff: "admin",
  developer: "dev",
  moderator: "mod",
};

export function roleIdFromBadgeSlug(slug: string): RoleId | null {
  const def = BADGE_BY_SLUG[slug];
  if (def?.role) return def.role.id;
  return SLUG_ROLE_ALIASES[slug] ?? null;
}

export function roleRankFromSlugs(slugs: Iterable<string>): number {
  let best = NO_ROLE_RANK;
  for (const slug of slugs) {
    const def = BADGE_BY_SLUG[slug];
    if (def?.role && def.role.rank < best) best = def.role.rank;
    else {
      const alias = SLUG_ROLE_ALIASES[slug];
      if (alias) {
        const canonical = BADGES.find((b) => b.role?.id === alias);
        if (canonical?.role && canonical.role.rank < best) best = canonical.role.rank;
      }
    }
  }
  return best;
}

export function roleLabelFromSlugs(slugs: Iterable<string>): string | null {
  let bestRank = NO_ROLE_RANK;
  let label: string | null = null;
  for (const slug of slugs) {
    const def = BADGE_BY_SLUG[slug];
    if (!def?.role || def.award.hidden) continue;
    if (def.role.rank < bestRank) {
      bestRank = def.role.rank;
      label = def.label;
    }
  }
  return label;
}

export function permissionsFromBadgeDefs(slugs: Iterable<string>): Set<Permission> {
  const perms = new Set<Permission>();
  for (const slug of slugs) {
    const def = BADGE_BY_SLUG[slug];
    if (!def) continue;
    for (const p of def.permissions) perms.add(p);
  }
  return perms;
}

export function isAutoGranted(def: BadgeDef): boolean {
  return def.award.auto;
}

export function isStaffAwardable(def: BadgeDef): boolean {
  return def.award.staffAwardable && !def.award.hidden;
}

/** @deprecated use isStaffAwardable */
export function isManuallyGrantable(def: BadgeDef): boolean {
  return isStaffAwardable(def);
}

export function grantPermissionFor(slug: string): Permission | "badges:award" | "auto" {
  const def = BADGE_BY_SLUG[slug];
  if (!def) return "badges:award";
  return def.award.grantPermission;
}

/**
 * Rank-based grant rules:
 * - founder (0): any badge
 * - admin (1): dev, mod, basic (not founder/admin)
 * - dev (2): mod + basic (not founder/admin/dev)
 * - mod (3): basic only (no role badges)
 */
export function canActorGrantBadge(
  actorRank: number,
  _perms: Set<Permission>,
  slug: string
): boolean {
  const def = BADGE_BY_SLUG[slug];
  if (!def || !isStaffAwardable(def)) return false;
  if (actorRank >= NO_ROLE_RANK) return false;
  if (actorRank === 0) return true;

  const badgeRoleRank = def.role?.rank;

  // Community / posting / recognition — any staff rank
  if (badgeRoleRank === undefined) return true;

  // Role badge — actor must outrank target role (lower rank number = more power)
  return actorRank < badgeRoleRank;
}

export function listStaffAwardableSlugs(
  actorRank: number,
  perms: Set<Permission> = new Set()
): string[] {
  return BADGES.filter((b) => isStaffAwardable(b) && canActorGrantBadge(actorRank, perms, b.slug))
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
    .map((b) => b.slug);
}
