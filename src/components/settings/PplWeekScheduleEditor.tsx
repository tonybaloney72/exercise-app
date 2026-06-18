"use client";

import {
  classicWeeklyPplSchedule,
  detectPplSchedulePreset,
  PPL_SCHEDULE_LABELS,
  PPL_SCHEDULE_ORDER,
  threeDayPplSchedule,
} from "@/lib/pplWeekSchedule";
import { uiChoicePillClass } from "@/lib/uiClasses";
import type { PplDaySchedule, WeeklyPplSchedule } from "@/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type Props = {
  value: WeeklyPplSchedule;
  onChange: (next: WeeklyPplSchedule, customized: boolean) => void;
};

export default function PplWeekScheduleEditor({ value, onChange }: Props) {
  const activePreset = detectPplSchedulePreset(value);

  function setDay(dayOfWeek: number, entry: PplDaySchedule) {
    onChange({ ...value, [dayOfWeek]: entry }, true);
  }

  function applyPreset(schedule: WeeklyPplSchedule) {
    onChange({ ...schedule }, true);
  }

  return (
    <section className="flex flex-col gap-3">
      <p className="text-xs text-muted leading-snug">
        Assign each weekday for working rounds, or choose recovery / rest.
        Cardio settings below follow push and pull days automatically.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={activePreset === "classic"}
          onClick={() => applyPreset(classicWeeklyPplSchedule())}
          className={uiChoicePillClass(activePreset === "classic")}
        >
          Classic 6-day
        </button>
        <button
          type="button"
          aria-pressed={activePreset === "three_day"}
          onClick={() => applyPreset(threeDayPplSchedule())}
          className={uiChoicePillClass(activePreset === "three_day")}
        >
          3-day PPL
        </button>
      </div>
      {activePreset === "custom" ? (
        <p className="text-caption text-muted leading-snug">
          Custom schedule - weekdays don&apos;t match a preset.
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {DAY_NAMES.map((shortName, dayOfWeek) => {
          const entry = value[dayOfWeek] ?? "full_rest";
          return (
            <li
              key={dayOfWeek}
              className="rounded-lg border border-border bg-surface-hover/50 px-3 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm font-medium text-foreground shrink-0 w-10">
                {shortName}
              </span>
              <select
                value={entry}
                onChange={(e) =>
                  setDay(dayOfWeek, e.target.value as PplDaySchedule)
                }
                className="w-full sm:max-w-[220px] rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                aria-label={`${shortName} schedule`}
              >
                {PPL_SCHEDULE_ORDER.map((opt) => (
                  <option key={opt} value={opt}>
                    {PPL_SCHEDULE_LABELS[opt]}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
