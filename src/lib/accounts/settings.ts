import type { AccountSettings } from "@/db/schema";

export const ACCOUNT_SETTINGS_DEFAULTS: AccountSettings = {
  profilePublic: true,
  showBadges: true,
  showCommentHistory: true,
  featuredBadgeSlug: null,
  badgeOrder: [],
  hiddenBadgeSlugs: [],
};

function parseStringArray(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((s) => s.trim());
}

export function parseAccountSettings(raw: unknown): AccountSettings {
  const base = { ...ACCOUNT_SETTINGS_DEFAULTS };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  if (typeof o.profilePublic === "boolean") base.profilePublic = o.profilePublic;
  if (typeof o.showBadges === "boolean") base.showBadges = o.showBadges;
  if (typeof o.showCommentHistory === "boolean") base.showCommentHistory = o.showCommentHistory;
  if (typeof o.featuredBadgeSlug === "string" && o.featuredBadgeSlug.trim()) {
    base.featuredBadgeSlug = o.featuredBadgeSlug.trim();
  } else if (o.featuredBadgeSlug === null) {
    base.featuredBadgeSlug = null;
  }
  const badgeOrder = parseStringArray(o.badgeOrder);
  if (badgeOrder) base.badgeOrder = badgeOrder;
  const hiddenBadgeSlugs = parseStringArray(o.hiddenBadgeSlugs);
  if (hiddenBadgeSlugs) base.hiddenBadgeSlugs = hiddenBadgeSlugs;
  return base;
}

export function settingsToJson(
  settings: AccountSettings
): Record<string, boolean | string | null | string[]> {
  return {
    profilePublic: settings.profilePublic,
    showBadges: settings.showBadges,
    showCommentHistory: settings.showCommentHistory,
    featuredBadgeSlug: settings.featuredBadgeSlug,
    badgeOrder: settings.badgeOrder,
    hiddenBadgeSlugs: settings.hiddenBadgeSlugs,
  };
}
