"use client";

import type { WeekActivity } from "@/lib/github";

interface Props {
  weeks: WeekActivity[];
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

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export default function ContributionGrid({ weeks }: Props) {
  const maxDay = Math.max(...weeks.flatMap((w) => w.days), 1);
  const totalCommits = weeks.reduce((s, w) => s + w.total, 0);
  const totalLabel = `${totalCommits} commits total`;

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
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1 min-w-0">
        <div className="flex text-[9px] text-gray-600 gap-[3px] pl-[18px]">
          {monthPositions.map(({ label, col }, i) => {
            const nextCol = monthPositions[i + 1]?.col ?? weeks.length;
            const span = nextCol - col;
            return (
              <span key={`${label}-${col}`} style={{ width: span * 13 }} className="shrink-0">
                {label}
              </span>
            );
          })}
        </div>
        <div className="flex gap-[3px]">
          <div className="flex flex-col gap-[3px] text-[9px] text-gray-600 w-[14px] shrink-0">
            {DAY_LABELS.map((d, i) => (
              <span key={i} className="h-[11px] leading-[11px]">
                {d}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {weeks.map((week) => (
              <div key={week.week} className="flex flex-col gap-[3px]">
                {week.days.map((count, dayIdx) => (
                  <div
                    key={dayIdx}
                    title={`${count} commits`}
                    className={`w-[11px] h-[11px] rounded-sm ${cellColor(count, maxDay)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-gray-600 mt-1 pl-[18px]">
          <span>Less</span>
          <div className="flex gap-[2px]">
            {[0, 0.2, 0.4, 0.6, 0.8].map((r) => (
              <div key={r} className={`w-[11px] h-[11px] rounded-sm ${cellColor(Math.ceil(maxDay * r), maxDay)}`} />
            ))}
          </div>
          <span>More</span>
          <span className="ml-auto text-gray-500">{totalLabel}</span>
        </div>
      </div>
    </div>
  );
}
