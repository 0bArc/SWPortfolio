import type { AccountBadge } from "@/db/schema";
import {
  Award,
  CalendarCheck,
  Code2,
  Crown,
  MessageCircle,
  MessagesSquare,
  Shield,
  User,
  Globe,
  type LucideIcon,
} from "lucide-react";

/** Permissions badges (or env admin) can grant to a user. */
export type Permission =
  | "badges:award"
  | "badges:award:privileged"
  | "admin:users"
  | "comments:moderate";

export type BadgeTone = "neutral" | "accent" | "staff";
export type BadgeGroupId = "roles" | "community" | "posting" | "recognition";

/** How many times one user can hold the same badge slug. */
export type StackPolicy =
  | { kind: "once" }
  | { kind: "year" }
  | { kind: "unlimited" };

export type BadgeGrantRules = {
  /** Sync-only — hidden from staff award UI */
  auto?: boolean;
  /** Needs badges:award:privileged */
  privileged?: boolean;
  /** All required to grant (defaults to badges:award) */
  requires?: Permission[];
};

export type BadgeDef = {
  slug: string;
  label: string;
  description: string;
  tone: BadgeTone;
  group: BadgeGroupId;
  /** Lower = higher rank (primary badge, gallery order) */
  order: number;
  stack: StackPolicy;
  grant: BadgeGrantRules;
  /** Permissions granted while badge is held */
  grants?: Permission[];
  visual: {
    Icon: LucideIcon;
    shell: string;
    iconClass: string;
  };
};

export const BADGE_GROUPS: { id: BadgeGroupId; label: string }[] = [
  { id: "roles", label: "Roles" },
  { id: "community", label: "Community" },
  { id: "posting", label: "Posting" },
  { id: "recognition", label: "Recognition" },
];

/**
 * Single source of truth for badges.
 * Add a row here — visuals, permissions, stacking, and groups follow.
 */
export const BADGES: BadgeDef[] = [
  {
    slug: "founder",
    label: "Founder",
    description: "Founded this site",
    tone: "staff",
    group: "roles",
    order: 0,
    stack: { kind: "once" },
    grant: { privileged: true },
    grants: ["badges:award", "badges:award:privileged", "admin:users", "comments:moderate"],
    visual: {
      Icon: Crown,
      shell: "bg-[#2d1818] border border-red-500/60",
      iconClass: "text-red-300",
    },
  },
  {
    slug: "developer",
    label: "Developer",
    description: "Built and maintains this site",
    tone: "accent",
    group: "roles",
    order: 1,
    stack: { kind: "once" },
    grant: { privileged: true },
    grants: ["badges:award", "comments:moderate"],
    visual: {
      Icon: Code2,
      shell: "bg-[#1a2d3d] border border-sky-500/60",
      iconClass: "text-sky-300",
    },
  },
  {
    slug: "stratware",
    label: "Stratware.win",
    description: "Team member of Stratware.win",
    tone: "accent",
    group: "roles",
    order: 1,
    stack: { kind: "once" },
    grant: { privileged: true },
    grants: ["badges:award"],
    visual: {
      Icon: Globe,
      shell: "bg-white/80 border border-white/60",
      iconClass: "text-black",
    },
  },
  {
    slug: "staff",
    label: "Staff",
    description: "Site team member",
    tone: "staff",
    group: "roles",
    order: 2,
    stack: { kind: "once" },
    grant: { privileged: true },
    grants: ["badges:award", "badges:award:privileged", "comments:moderate"],
    visual: {
      Icon: Shield,
      shell: "bg-[#2a1f3d] border border-violet-500/60",
      iconClass: "text-violet-300",
    },
  },
  {
    slug: "member",
    label: "Member",
    description: "Joined the community",
    tone: "neutral",
    group: "community",
    order: 5,
    stack: { kind: "once" },
    grant: { auto: true },
    visual: {
      Icon: User,
      shell: "bg-[#2a2a2a] border border-white/35",
      iconClass: "text-gray-200",
    },
  },
  {
    slug: "annual_member",
    label: "Annual Member",
    description: "Active member for another year",
    tone: "accent",
    group: "recognition",
    order: 6,
    stack: { kind: "year" },
    grant: {},
    visual: {
      Icon: CalendarCheck,
      shell: "bg-[#1f2a1a] border border-lime-500/55",
      iconClass: "text-lime-300",
    },
  },
  {
    slug: "commenter",
    label: "Commenter",
    description: "Left a comment on a post",
    tone: "accent",
    group: "posting",
    order: 10,
    stack: { kind: "once" },
    grant: { auto: true },
    visual: {
      Icon: MessageCircle,
      shell: "bg-[#1a2d33] border border-cyan-500/55",
      iconClass: "text-cyan-300",
    },
  },
  {
    slug: "conversationalist",
    label: "Conversationalist",
    description: "Left 10 or more comments",
    tone: "accent",
    group: "posting",
    order: 11,
    stack: { kind: "once" },
    grant: { auto: true },
    visual: {
      Icon: MessagesSquare,
      shell: "bg-[#1a3328] border border-emerald-500/55",
      iconClass: "text-emerald-300",
    },
  },
];

export const BADGE_BY_SLUG: Record<string, BadgeDef> = Object.fromEntries(
  BADGES.map((b) => [b.slug, b])
);

/** @deprecated Use BADGE_BY_SLUG — kept for admin UI toggles */
export const BADGE_DEFS: Record<
  string,
  { label: string; description: string; tone: BadgeTone; auto?: boolean }
> = Object.fromEntries(
  BADGES.map((b) => [
    b.slug,
    { label: b.label, description: b.description, tone: b.tone, auto: b.grant.auto },
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

/** Unique DB key per grant — drives stack policy. */
export function grantKeyFor(slug: string, at: Date = new Date()): string {
  const def = BADGE_BY_SLUG[slug];
  if (!def) return slug;
  if (def.stack.kind === "year") return `${slug}:${at.getUTCFullYear()}`;
  if (def.stack.kind === "unlimited") return `${slug}:${at.getTime()}`;
  return slug;
}

export function isManuallyGrantable(def: BadgeDef): boolean {
  return !def.grant.auto;
}

/** Badge beside display name — explicit pick or highest rank. */
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

export function stackSummary(def: BadgeDef, count: number): string | undefined {
  if (count <= 1) return undefined;
  if (def.stack.kind === "year") return `${count} years`;
  if (def.stack.kind === "unlimited") return `×${count}`;
  return undefined;
}
