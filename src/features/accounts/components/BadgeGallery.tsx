import type { AccountBadge } from "@/database/schema";
import { BADGE_BY_SLUG, BADGE_GROUPS, badgeVisualFor } from "@/features/accounts/services/badges/catalog";

function formatAwarded(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function BadgeCard({ badge }: { badge: AccountBadge }) {
  const { Icon, shell, iconClass } = badgeVisualFor(badge.slug);

  return (
    <div className="flex items-start gap-4 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3.5">
      <span
        className={`shrink-0 inline-flex items-center justify-center rounded-full w-[3.75rem] h-[3.75rem] ${shell}`}
        aria-hidden
      >
        <Icon className={`w-[1.55rem] h-[1.55rem] ${iconClass}`} strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[15px] font-semibold text-white">
          {badge.label}
          {badge.stackLabel && (
            <span className="ml-1.5 text-sm font-normal text-gray-500">{badge.stackLabel}</span>
          )}
        </p>
        <p className="text-[13px] text-gray-500 mt-1 leading-snug">{badge.description}</p>
        <p className="text-[11px] text-gray-600 mt-2">Awarded {formatAwarded(badge.awardedAt)}</p>
      </div>
    </div>
  );
}

export default function BadgeGallery({ badges }: { badges: AccountBadge[] }) {
  if (badges.length === 0) {
    return <p className="text-sm text-gray-500">No badges yet.</p>;
  }

  return (
    <div className="space-y-7">
      {BADGE_GROUPS.map((group) => {
        const items = badges.filter((b) => BADGE_BY_SLUG[b.slug]?.group === group.id);
        if (items.length === 0) return null;
        return (
          <section key={group.id}>
            <h3 className="text-sm font-semibold text-gray-400 mb-3">{group.label}</h3>
            <div className="flex flex-col gap-2">
              {items.map((badge) => (
                <BadgeCard key={badge.slug} badge={badge} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
