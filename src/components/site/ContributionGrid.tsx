"use client";

import type { WeekActivity } from "@/lib/github";
import type { Lang } from "@/lib/i18n";

interface Props {
  weeks: WeekActivity[];
  lang?: Lang;
}

function cellColor(count: number, max: number): string {
  if (count === 0 || max === 0) return "bg-white/[0.06]";
  const ratio = count / max;
  if (ratio < 0.15) return "bg-emerald-700";
  if (ratio < 0.35) return "bg-emerald-500";
  if (ratio < 0.65) return "bg-emerald-400";
  if (ratio < 0.85) return "bg-emerald-300";
  return "bg-emerald-200";
}

const MONTH_LABELS_NO = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"];
const MONTH_LABELS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS_NO = ["", "Man", "", "Ons", "", "Fre", ""];
const DAY_LABELS_EN = ["", "Mon", "", "Wed", "", "Fri", ""];

export default function ContributionGrid({ weeks, lang = "no" }: Props) {
  const maxDay = Math.max(...weeks.flatMap((w) => w.days), 1);
  const totalCommits = weeks.reduce((s, w) => s + w.total, 0);

  const MONTH_LABELS = lang === "en" ? MONTH_LABELS_EN : MONTH_LABELS_NO;
  const DAY_LABELS = lang === "en" ? DAY_LABELS_EN : DAY_LABELS_NO;
  const lessLabel = lang === "en" ? "Less" : "Mindre";
  const moreLabel = lang === "en" ? "More" : "Mer";
  const totalLabel = lang === "en" ? `${totalCommits} commits total` : `${totalCommits} commits totalt`;

  const monthPositions: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, col) => {
    const date = new Date(week.week * 1000);
    const month = date.getMonth();
    if (month !== lastMonth) {
      monthPositions.push({ label: MONTH_LABELS[month], col });
      lastMonth = month;
    }
  });

  return (
    <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
      <div className="min-w-max">
        <div className="flex mb-1 ml-8">
          {monthPositions.map(({ label, col }, i) => {
            const nextCol = monthPositions[i + 1]?.col ?? weeks.length;
            const span = nextCol - col;
            return (
              <div key={`${label}-${col}`} className="text-[9px] text-gray-600" style={{ width: span * 14 }}>
                {label}
              </div>
            );
          })}
        </div>

        <div className="flex gap-0.5">
          <div className="flex flex-col gap-0.5 mr-1.5">
            {DAY_LABELS.map((d, i) => (
              <span key={i} className="text-[9px] text-gray-600 h-3 flex items-center justify-end w-6">
                {d}
              </span>
            ))}
          </div>

          {weeks.map((week) => (
            <div key={week.week} className="flex flex-col gap-0.5">
              {week.days.map((count, dayIdx) => (
                <div
                  key={dayIdx}
                  title={`${count} commit${count !== 1 ? "s" : ""}`}
                  className={`w-3 h-3 rounded-[2px] transition-colors ${cellColor(count, maxDay)}`}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] text-gray-600">{totalLabel}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-gray-600">{lessLabel}</span>
            {["bg-white/[0.06]", "bg-emerald-700", "bg-emerald-500", "bg-emerald-400", "bg-emerald-300", "bg-emerald-200"].map((cls, i) => (
              <div key={i} className={`w-3 h-3 rounded-[2px] ${cls}`} />
            ))}
            <span className="text-[9px] text-gray-600">{moreLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
