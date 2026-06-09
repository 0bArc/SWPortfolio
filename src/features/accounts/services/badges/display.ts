import type { AccountBadge, AccountSettings } from "@/database/schema";

export type BadgeLayout = Pick<AccountSettings, "badgeOrder" | "hiddenBadgeSlugs">;

export function buildOrderedSlugs(badges: AccountBadge[], order: string[]): string[] {
  const owned = badges.map((b) => b.slug);
  const ownedSet = new Set(owned);
  const result: string[] = [];
  for (const slug of order) {
    if (ownedSet.has(slug)) result.push(slug);
  }
  for (const slug of owned) {
    if (!result.includes(slug)) result.push(slug);
  }
  return result;
}

export function orderBadges(badges: AccountBadge[], order: string[]): AccountBadge[] {
  const bySlug = new Map(badges.map((b) => [b.slug, b]));
  return buildOrderedSlugs(badges, order)
    .map((slug) => bySlug.get(slug))
    .filter((b): b is AccountBadge => !!b);
}

export function applyBadgeLayout(
  badges: AccountBadge[],
  layout: BadgeLayout,
  options?: { includeHidden?: boolean }
): AccountBadge[] {
  const ordered = orderBadges(badges, layout.badgeOrder);
  if (options?.includeHidden) return ordered;
  const hidden = new Set(layout.hiddenBadgeSlugs);
  return ordered.filter((b) => !hidden.has(b.slug));
}

export function reorderSlugs(slugs: string[], fromSlug: string, toSlug: string): string[] {
  const from = slugs.indexOf(fromSlug);
  const to = slugs.indexOf(toSlug);
  if (from < 0 || to < 0 || from === to) return slugs;
  const next = [...slugs];
  next.splice(from, 1);
  next.splice(to, 0, fromSlug);
  return next;
}

export function toggleHiddenSlug(hidden: string[], slug: string): string[] {
  const set = new Set(hidden);
  if (set.has(slug)) set.delete(slug);
  else set.add(slug);
  return [...set];
}
