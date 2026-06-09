import type { AccountBadge } from "@/database/schema";
import BadgeIcon from "./BadgeIcon";

export default function ProfileBadges({ badges }: { badges: AccountBadge[] }) {
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5" role="list" aria-label="Badges">
      {badges.map((badge) => (
        <span key={badge.slug} role="listitem">
          <BadgeIcon badge={badge} />
        </span>
      ))}
    </div>
  );
}
