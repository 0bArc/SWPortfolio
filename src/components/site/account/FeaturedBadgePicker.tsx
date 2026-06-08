"use client";

import type { AccountBadge } from "@/db/schema";
import { Sparkles } from "lucide-react";
import BadgeIcon from "./BadgeIcon";

type Props = {
  badges: AccountBadge[];
  value: string | null;
  onChange: (slug: string | null) => void;
  disabled?: boolean;
};

export default function FeaturedBadgePicker({ badges, value, onChange, disabled }: Props) {
  if (badges.length === 0) return null;

  const autoSelected = value === null;

  return (
    <div className="py-3 border-b border-white/[0.06]">
      <div className="mb-3">
        <p className="text-sm text-gray-200">Featured badge</p>
        <p className="text-xs text-gray-400 leading-snug mt-0.5">
          Shown beside your name on profile and comments
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(null)}
          className={`flex flex-col items-center gap-1.5 w-[4.5rem] rounded-lg border px-1.5 py-2.5 transition-colors disabled:opacity-50 ${
            autoSelected
              ? "border-white/30 bg-white/[0.08] ring-1 ring-white/20"
              : "border-white/[0.08] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
          }`}
          title="Highest-rank badge"
        >
          <span
            className={`inline-flex items-center justify-center rounded-full w-9 h-9 border ${
              autoSelected ? "border-white/25 bg-white/[0.06]" : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <Sparkles
              className={`w-4 h-4 ${autoSelected ? "text-gray-200" : "text-gray-500"}`}
              strokeWidth={2}
              aria-hidden
            />
          </span>
          <span
            className={`text-[10px] leading-tight text-center ${
              autoSelected ? "text-gray-200 font-medium" : "text-gray-400"
            }`}
          >
            Auto
          </span>
        </button>

        {badges.map((badge) => {
          const selected = value === badge.slug;
          return (
            <button
              key={badge.slug}
              type="button"
              disabled={disabled}
              onClick={() => onChange(badge.slug)}
              className={`flex flex-col items-center gap-1.5 w-[4.5rem] rounded-lg border px-1.5 py-2.5 transition-colors disabled:opacity-50 ${
                selected
                  ? "border-white/30 bg-white/[0.08] ring-1 ring-white/20"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
              }`}
              title={badge.description}
            >
              <BadgeIcon badge={badge} size="sm" static />
              <span
                className={`text-[10px] leading-tight text-center line-clamp-2 ${
                  selected ? "text-gray-200 font-medium" : "text-gray-400"
                }`}
              >
                {badge.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
