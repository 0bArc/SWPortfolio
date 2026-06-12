"use client";

import type { AccountBadge } from "@/database/schema";
import BadgeIcon from "@/features/accounts/components/BadgeIcon";

export default function PostAuthorBadge({
  badge,
  inLink = false,
}: {
  badge: AccountBadge;
  inLink?: boolean;
}) {
  const el = <BadgeIcon badge={badge} showLabel compact labelOnly />;

  if (!inLink) return el;

  return (
    <span
      className="relative z-10"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {el}
    </span>
  );
}
