"use client";

import type { AccountBadge } from "@/database/schema";
import { badgeVisualFor } from "@/features/accounts/services/badges/catalog";

type Props = {
  badge: AccountBadge;
  size?: "sm" | "md";
  /** No tooltip/focus — for pickers inside buttons */
  static?: boolean;
};

const shellSize = {
  sm: "w-9 h-9",
  md: "w-12 h-12",
} as const;

const iconSize = {
  sm: "w-[1.1rem] h-[1.1rem]",
  md: "w-[1.4rem] h-[1.4rem]",
} as const;

function formatAwarded(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BadgeIcon({ badge, size = "sm", static: isStatic = false }: Props) {
  const { Icon, shell, iconClass } = badgeVisualFor(badge.slug);
  const tipId = `badge-tip-${badge.slug}`;

  const shellEl = (
    <span
      tabIndex={isStatic ? undefined : 0}
      role="img"
      aria-label={isStatic ? undefined : `${badge.label}: ${badge.description}`}
      aria-describedby={isStatic ? undefined : tipId}
      aria-hidden={isStatic ? true : undefined}
      className={`relative inline-flex items-center justify-center rounded-full ${isStatic ? "" : "cursor-default"} ${shellSize[size]} ${shell}`}
    >
      <Icon className={`${iconSize[size]} ${iconClass}`} strokeWidth={2.25} aria-hidden />
      {badge.count && badge.count > 1 && (
        <span className="absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-[#1c1c1c] border border-white/20 text-[9px] font-semibold text-gray-300 flex items-center justify-center leading-none">
          {badge.count}
        </span>
      )}
    </span>
  );

  if (isStatic) return shellEl;

  return (
    <span className="group/badge relative inline-flex">
      {shellEl}
      <span
        id={tipId}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 bottom-[calc(100%+8px)] -translate-x-1/2 z-30 w-[min(15rem,calc(100vw-2rem))] opacity-0 group-hover/badge:opacity-100 group-focus-within/badge:opacity-100 transition-opacity duration-100"
      >
        <span className="flex items-start gap-2.5 rounded-md border border-white/[0.08] bg-[#1c1c1c] px-2.5 py-2 shadow-md">
          <span
            className={`shrink-0 inline-flex items-center justify-center rounded-full w-11 h-11 ${shell}`}
            aria-hidden
          >
            <Icon className={`w-[1.25rem] h-[1.25rem] ${iconClass}`} strokeWidth={2.25} />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-[12px] font-medium leading-tight text-gray-200">
              {badge.label}
              {badge.stackLabel && (
                <span className="font-normal text-gray-500"> · {badge.stackLabel}</span>
              )}
            </span>
            <span className="block mt-0.5 text-[11px] leading-snug text-gray-500">{badge.description}</span>
            <span className="block mt-1 text-[10px] text-gray-600">Awarded {formatAwarded(badge.awardedAt)}</span>
          </span>
        </span>
      </span>
    </span>
  );
}
