import "server-only";

import type { AccountBadge } from "@/db/schema";
import {
  BADGE_BY_SLUG,
  badgeDef,
  badgeSortKey,
  grantKeyFor,
  stackSummary,
} from "@/lib/accounts/badges";

export type { BadgeDef } from "@/lib/accounts/badges";
export { BADGES, BADGE_BY_SLUG, BADGE_DEFS } from "@/lib/accounts/badges";

export function mapBadges(rows: { slug: string; awarded_at: Date }[]): AccountBadge[] {
  const grouped = new Map<string, Date[]>();

  for (const row of rows) {
    const dates = grouped.get(row.slug);
    if (dates) dates.push(row.awarded_at);
    else grouped.set(row.slug, [row.awarded_at]);
  }

  const mapped: AccountBadge[] = [];
  for (const [slug, dates] of grouped.entries()) {
    const def = BADGE_BY_SLUG[slug];
    if (!def) continue;
    dates.sort((a, b) => b.getTime() - a.getTime());
    const count = dates.length;
    const badge: AccountBadge = {
      slug,
      label: def.label,
      description: def.description,
      tone: def.tone,
      awardedAt: dates[0].toISOString(),
    };
    if (count > 1) {
      badge.count = count;
      badge.stackLabel = stackSummary(def, count);
    }
    mapped.push(badge);
  }
  return mapped.sort((a, b) =>
    badgeSortKey(a.slug, a.awardedAt).localeCompare(badgeSortKey(b.slug, b.awardedAt))
  );
}

export async function syncBadgesForAccount(accountId: number, username: string): Promise<void> {
  const { ensureBadge, countCommentsForAccount } = await import("@/lib/db/accounts");
  await ensureBadge(accountId, "member");

  const adminUser = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  if (adminUser && username === adminUser) {
    await ensureBadge(accountId, "founder");
    await ensureBadge(accountId, "developer");
  }

  const commentCount = await countCommentsForAccount(accountId);
  if (commentCount >= 1) await ensureBadge(accountId, "commenter");
  if (commentCount >= 10) await ensureBadge(accountId, "conversationalist");
}

export async function syncBadgesForUsername(username: string): Promise<AccountBadge[]> {
  const { getAccountByUsername, listBadgesForAccount } = await import("@/lib/db/accounts");
  const row = await getAccountByUsername(username);
  if (!row) return [];
  await syncBadgesForAccount(row.id, row.username);
  return mapBadges(await listBadgesForAccount(row.id));
}

export function resolveGrantKey(slug: string, at: Date = new Date()): string | null {
  if (!badgeDef(slug)) return null;
  return grantKeyFor(slug, at);
}
