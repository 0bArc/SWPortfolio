"use client";

import { useMemo, useRef, useState } from "react";
import type { AccountBadge } from "@/db/schema";
import {
  buildOrderedSlugs,
  orderBadges,
  reorderSlugs,
  toggleHiddenSlug,
} from "@/lib/accounts/badge-display";
import BadgeIcon from "./BadgeIcon";

type Props = {
  badges: AccountBadge[];
  badgeOrder: string[];
  hiddenBadgeSlugs: string[];
  disabled?: boolean;
  onChange: (patch: { badgeOrder: string[]; hiddenBadgeSlugs: string[] }) => void;
};

export default function EditableProfileBadges({
  badges,
  badgeOrder,
  hiddenBadgeSlugs,
  disabled,
  onChange,
}: Props) {
  const [dragSlug, setDragSlug] = useState<string | null>(null);
  const [overSlug, setOverSlug] = useState<string | null>(null);
  const skipClick = useRef(false);

  const orderedSlugs = useMemo(
    () => buildOrderedSlugs(badges, badgeOrder),
    [badges, badgeOrder]
  );
  const orderedBadges = useMemo(
    () => orderBadges(badges, orderedSlugs),
    [badges, orderedSlugs]
  );
  const hidden = useMemo(() => new Set(hiddenBadgeSlugs), [hiddenBadgeSlugs]);

  function dropOn(targetSlug: string) {
    if (!dragSlug || dragSlug === targetSlug) return;
    onChange({
      badgeOrder: reorderSlugs(orderedSlugs, dragSlug, targetSlug),
      hiddenBadgeSlugs,
    });
    skipClick.current = true;
    setDragSlug(null);
    setOverSlug(null);
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">
        Drag to reorder · Click to {hidden.size > 0 ? "show or hide" : "hide"}
      </p>
      <div
        className="flex flex-wrap items-center gap-2.5"
        role="list"
        aria-label="Editable badges"
        onDragEnd={() => {
          setDragSlug(null);
          setOverSlug(null);
        }}
      >
        {orderedBadges.map((badge) => {
          const isHidden = hidden.has(badge.slug);
          const isDragging = dragSlug === badge.slug;
          const isOver = overSlug === badge.slug && dragSlug && dragSlug !== badge.slug;

          return (
            <button
              key={badge.slug}
              type="button"
              role="listitem"
              draggable={!disabled}
              disabled={disabled}
              title={
                isHidden
                  ? `${badge.label} — hidden, click to show`
                  : `${badge.label} — click to hide`
              }
              onClick={() => {
                if (skipClick.current) {
                  skipClick.current = false;
                  return;
                }
                onChange({
                  badgeOrder: orderedSlugs,
                  hiddenBadgeSlugs: toggleHiddenSlug(hiddenBadgeSlugs, badge.slug),
                });
              }}
              onDragStart={(e) => {
                if (disabled) return;
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", badge.slug);
                setDragSlug(badge.slug);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOverSlug(badge.slug);
              }}
              onDragLeave={() => {
                if (overSlug === badge.slug) setOverSlug(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                dropOn(badge.slug);
              }}
              className={`relative rounded-full p-0.5 transition-all cursor-grab active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50 ${
                isDragging ? "opacity-40 scale-95" : ""
              } ${isOver ? "ring-2 ring-white/40 ring-offset-2 ring-offset-[#111]" : ""} ${
                isHidden
                  ? "opacity-55 saturate-50 hover:opacity-80"
                  : "opacity-100 hover:ring-1 hover:ring-white/15"
              }`}
            >
              <BadgeIcon badge={badge} size="sm" static />
              {isHidden && (
                <span
                  className="absolute inset-0 rounded-full border border-dashed border-white/40 pointer-events-none"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
      {hidden.size > 0 && (
        <p className="text-xs text-gray-400 mt-2.5">
          {hidden.size} hidden from public profile — click to restore
        </p>
      )}
    </div>
  );
}
