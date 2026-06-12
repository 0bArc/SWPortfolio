import { getPool } from "@/database";
import { getAccountSettings, listBadgesForAccount } from "@/database/accounts";
import { BADGE_BY_SLUG } from "@/features/accounts/services/badges/definitions";
import { roleIdFromBadgeSlug } from "@/features/accounts/services/badges/award";
import { resolvePublicDisplayBadge } from "@/features/accounts/services/badges/catalog";
import { mapBadges } from "@/features/accounts/services/badges/service";
import type { AccountBadge } from "@/database/schema";
import type { RoleId } from "@permissions-config";

/** Author badge, or staff at admin rank and above (founder, admin, dev). */
const STAFF_AUTHOR_ROLES = new Set<RoleId>(["founder", "admin", "dev"]);

export function isPostAuthorBadgeSlug(slug: string): boolean {
  if (slug === "author" || slug === "root") return true;
  const role = roleIdFromBadgeSlug(slug);
  return role ? STAFF_AUTHOR_ROLES.has(role) : false;
}

export const POST_AUTHOR_BADGE_SLUGS = Object.keys(BADGE_BY_SLUG).filter(isPostAuthorBadgeSlug);

export interface PostAuthorCandidate {
  id: number;
  username: string;
  displayName: string;
  icon: string | null;
}

export async function listPostAuthorCandidates(): Promise<PostAuthorCandidate[]> {
  if (POST_AUTHOR_BADGE_SLUGS.length === 0) return [];

  const { rows } = await getPool().query<PostAuthorCandidate>(
    `SELECT DISTINCT a.id, a.username, a.display_name AS "displayName", a.icon
     FROM accounts a
     INNER JOIN account_badges b ON b.account_id = a.id
     WHERE b.slug = ANY($1::text[])
       AND a.banned_at IS NULL
     ORDER BY a.display_name ASC, a.username ASC`,
    [POST_AUTHOR_BADGE_SLUGS]
  );
  return rows;
}

export async function resolvePostAuthorAccount(
  accountId: number
): Promise<PostAuthorCandidate | null> {
  const { rows } = await getPool().query<PostAuthorCandidate>(
    `SELECT a.id, a.username, a.display_name AS "displayName", a.icon
     FROM accounts a
     WHERE a.id = $1
       AND a.banned_at IS NULL
       AND EXISTS (
         SELECT 1 FROM account_badges b
         WHERE b.account_id = a.id AND b.slug = ANY($2::text[])
       )`,
    [accountId, POST_AUTHOR_BADGE_SLUGS]
  );
  return rows[0] ?? null;
}

export async function getPostAuthorDisplayBadge(
  accountId: number
): Promise<AccountBadge | null> {
  const [badgeRows, settings] = await Promise.all([
    listBadgesForAccount(accountId),
    getAccountSettings(accountId),
  ]);
  return resolvePublicDisplayBadge(mapBadges(badgeRows), settings.featuredBadgeSlug);
}

export async function getPostAuthorDisplayBadges(
  accountIds: number[]
): Promise<Map<number, AccountBadge | null>> {
  const unique = [...new Set(accountIds)];
  const entries = await Promise.all(
    unique.map(async (id) => [id, await getPostAuthorDisplayBadge(id)] as const)
  );
  return new Map(entries);
}

export function parsePostAccountId(raw: unknown): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}
