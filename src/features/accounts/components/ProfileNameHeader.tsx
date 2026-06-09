import type { ReactNode } from "react";
import type { AccountBadge } from "@/database/schema";
import PrimaryBadge from "./PrimaryBadge";

export default function ProfileNameHeader({
  name,
  badge,
}: {
  name: ReactNode;
  badge: AccountBadge | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
      <div className="min-w-0 shrink">{name}</div>
      {badge && <PrimaryBadge badge={badge} />}
    </div>
  );
}
