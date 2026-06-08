import type { AccountBadge } from "@/db/schema";
import { badgeVisualFor, resolveFeaturedBadge } from "@/lib/accounts/badges";

export { resolveFeaturedBadge as featuredBadge, resolveFeaturedBadge as primaryBadge };

/** Subdued rank beside display name — name stays primary. */
export default function PrimaryBadge({ badge }: { badge: AccountBadge }) {
  const { Icon, shell, iconClass } = badgeVisualFor(badge.slug);

  return (
    <span
      className="inline-flex items-center gap-2 shrink-0"
      title={badge.description}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full w-7 h-7 ring-1 ring-white/10 ${shell}`}
        aria-hidden
      >
        <Icon className={`w-3.5 h-3.5 ${iconClass}`} strokeWidth={2.25} aria-hidden />
      </span>
      <span className="text-sm font-medium text-gray-300">{badge.label}</span>
    </span>
  );
}
