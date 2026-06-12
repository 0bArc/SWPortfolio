import type { AccountBadge } from "@/database/schema";
import { Award, type LucideIcon } from "lucide-react";
import { BADGE_BY_SLUG, BADGES } from "./definitions";
import type { BadgeDef, BadgeGroupId, BadgeTone } from "./types";

export type {
  BadgeTone,
  BadgeGroupId,
  BadgeAwardRules,
  BadgeRoleMeta,
  StackPolicy,
  BadgeDef,
} from "./types";
export { badgeCreator } from "./create";
export { BADGES, BADGE_BY_SLUG } from "./definitions";

export const BADGE_GROUPS: { id: BadgeGroupId; label: string }[] = [
  { id: "roles", label: "Roles" },
  { id: "community", label: "Community" },
  { id: "posting", label: "Posting" },
  { id: "recognition", label: "Recognition" },
];

export const BADGE_DEFS: Record<
  string,
  { label: string; description: string; tone: BadgeTone; auto?: boolean }
> = Object.fromEntries(
  BADGES.map((b) => [
    b.slug,
    { label: b.label, description: b.description, tone: b.tone, auto: b.award.auto },
  ])
);

export function badgeDef(slug: string): BadgeDef | undefined {
  return BADGE_BY_SLUG[slug];
}

export function badgeVisualFor(slug: string): BadgeDef["visual"] & { Icon: LucideIcon } {
  const def = BADGE_BY_SLUG[slug];
  if (def) return def.visual;
  return {
    Icon: Award,
    shell: "bg-[#2a2a2a] border border-white/35",
    iconClass: "text-gray-200",
  };
}

export function badgeSortKey(slug: string, awardedAt: string): string {
  const order = BADGE_BY_SLUG[slug]?.order ?? 99;
  return `${String(order).padStart(2, "0")}-${awardedAt}`;
}

export function grantKeyFor(slug: string, at: Date = new Date()): string {
  const def = BADGE_BY_SLUG[slug];
  if (!def) return slug;
  if (def.stack.kind === "year") return `${slug}:${at.getUTCFullYear()}`;
  if (def.stack.kind === "unlimited") return `${slug}:${at.getTime()}`;
  return slug;
}

export function isHiddenBadgeSlug(slug: string): boolean {
  return BADGE_BY_SLUG[slug]?.award.hidden === true;
}

export function visibleBadges(badges: AccountBadge[]): AccountBadge[] {
  return badges.filter((b) => !isHiddenBadgeSlug(b.slug));
}

export function resolveFeaturedBadge(
  badges: AccountBadge[],
  slug: string | null | undefined
): AccountBadge | null {
  if (slug) {
    const picked = badges.find((b) => b.slug === slug);
    if (picked) return picked;
  }
  return badges[0] ?? null;
}

/** Profile/post display — honors featured slug, skips legacy hidden badges. */
export function resolvePublicDisplayBadge(
  badges: AccountBadge[],
  featuredSlug: string | null | undefined
): AccountBadge | null {
  const visible = visibleBadges(badges);
  if (!visible.length) return null;
  if (featuredSlug) {
    const picked = visible.find((b) => b.slug === featuredSlug);
    if (picked) return picked;
  }
  return visible.sort((a, b) =>
    badgeSortKey(a.slug, a.awardedAt).localeCompare(badgeSortKey(b.slug, b.awardedAt))
  )[0];
}

export function stackSummary(def: BadgeDef, count: number): string | undefined {
  if (count <= 1) return undefined;
  if (def.stack.kind === "year") return `${count} years`;
  if (def.stack.kind === "unlimited") return `×${count}`;
  return undefined;
}
