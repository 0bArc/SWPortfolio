"use client";

import type { AccountBadge } from "@/database/schema";
import { badgeVisualFor } from "@/features/accounts/services/badges/catalog";

type Props = {
  badge: AccountBadge;
  size?: "sm" | "md";
  /** No tooltip/focus — for pickers inside buttons */
  static?: boolean;
  /** Compact icon + label — e.g. beside post author name */
  showLabel?: boolean;
  /** Smaller inline badge — post author row */
  compact?: boolean;
  /** Text only, no icon — post author under name */
  labelOnly?: boolean;
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

export default function BadgeIcon({
  badge,
  size = "sm",
  static: isStatic = false,
  showLabel = false,
  compact = false,
  labelOnly = false,
}: Props) {
  const { Icon, shell, iconClass } = badgeVisualFor(badge.slug);
  const tipId = `badge-tip-${badge.slug}-${badge.awardedAt}`;

  const countEl =
    badge.count && badge.count > 1 ? (
      <span className="absolute -bottom-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-[#1c1c1c] border border-white/20 text-[9px] font-semibold text-gray-300 flex items-center justify-center leading-none">
        {badge.count}
      </span>
    ) : null;

  const inlineShell = compact ? "w-5 h-5 ring-1 ring-white/10" : "w-7 h-7 ring-1 ring-white/10";
  const inlineIcon = compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5";

  const iconShell = (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full ${
        showLabel ? inlineShell : shellSize[size]
      } ${shell}`}
      aria-hidden={showLabel || isStatic ? true : undefined}
    >
      <Icon
        className={`${showLabel ? inlineIcon : iconSize[size]} ${iconClass}`}
        strokeWidth={compact ? 2 : 2.25}
        aria-hidden
      />
      {countEl}
    </span>
  );

  const roleColor = labelOnly && iconClass === "text-gray-200" ? "text-gray-500" : iconClass;
  const labelClass = labelOnly
    ? `${roleColor} text-xs`
    : `text-gray-400 ${compact ? "text-[11px]" : "text-xs"}`;

  const labelEl = showLabel ? (
    <span className={`${labelOnly ? "font-semibold" : "font-medium"} leading-none ${labelClass}`}>
      {badge.label}
      {badge.stackLabel && (
        <span className="font-normal text-gray-500"> · {badge.stackLabel}</span>
      )}
    </span>
  ) : null;

  const trigger = showLabel ? (
    labelOnly ? (
      labelEl
    ) : (
      <span className={`inline-flex items-center shrink-0 ${compact ? "gap-1" : "gap-1.5"}`}>
        {iconShell}
        {labelEl}
      </span>
    )
  ) : (
    iconShell
  );

  if (isStatic) return trigger;

  const interactive = (
    <span
      tabIndex={0}
      role="img"
      aria-label={`${badge.label}: ${badge.description}`}
      aria-describedby={tipId}
      className={`inline-flex ${showLabel ? `items-center cursor-default ${compact ? "gap-1" : "gap-1.5"}` : "cursor-default"}`}
    >
      {trigger}
    </span>
  );

  return (
    <span className="group/badge relative inline-flex">
      {interactive}
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
