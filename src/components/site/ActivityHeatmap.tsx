"use client";

import type { WeekActivity } from "@/lib/github";

interface Props {
  activity: WeekActivity[];
}

function intensity(count: number, max: number): string {
  if (count === 0 || max === 0) return "bg-white/5";
  const ratio = count / max;
  if (ratio < 0.25) return "bg-white/15";
  if (ratio < 0.5) return "bg-white/30";
  if (ratio < 0.75) return "bg-white/55";
  return "bg-white/80";
}

const DAY_LABELS = ["S", "M", "T", "O", "T", "F", "L"];

export default function ActivityHeatmap({ activity }: Props) {
  const weeks = activity.slice(-52);
  const maxDay = Math.max(...weeks.flatMap((w) => w.days), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1">
          {DAY_LABELS.map((d, i) => (
            <span key={i} className="text-[9px] text-gray-600 w-3 h-3 flex items-center justify-center">
              {i % 2 === 0 ? d : ""}
            </span>
          ))}
        </div>

        {/* Week columns */}
        {weeks.map((week) => (
          <div key={week.week} className="flex flex-col gap-1">
            {week.days.map((count, dayIdx) => (
              <div
                key={dayIdx}
                title={`${count} commit${count !== 1 ? "s" : ""}`}
                className={`w-3 h-3 rounded-[2px] transition-colors ${intensity(count, maxDay)}`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[9px] text-gray-600">Mindre</span>
        {["bg-white/5", "bg-white/15", "bg-white/30", "bg-white/55", "bg-white/80"].map((cls) => (
          <div key={cls} className={`w-3 h-3 rounded-[2px] ${cls}`} />
        ))}
        <span className="text-[9px] text-gray-600">Mer</span>
      </div>
    </div>
  );
}
