"use client";

import { REST_DAY_DESCRIPTIONS, REST_DAY_LABELS } from "@/lib/restDays";
import { uiChoicePillSolidClass } from "@/lib/uiClasses";
import type { RestDayMode, WeeklyRestDays } from "@/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const MODE_ORDER: RestDayMode[] = [
  "workout",
  "active_recovery",
  "stretches",
  "full_rest",
];

type Props = {
  value: WeeklyRestDays;
  onChange: (next: WeeklyRestDays, customized: boolean) => void;
};

export default function WeeklyRestDaysEditor({ value, onChange }: Props) {
  function setMode(dayOfWeek: number, mode: RestDayMode) {
    onChange({ ...value, [dayOfWeek]: mode }, true);
  }

  return (
    <section className="space-y-2">
      <p className="text-sm text-muted leading-snug">
        <strong className="text-foreground">Active recovery</strong> is a light session (one
        core round), not a rest day. <strong className="text-foreground">Stretches</strong> and{" "}
        <strong className="text-foreground">Full rest</strong> are true rest. Sunday defaults to
        active recovery until you change it.
      </p>
      <ul className="space-y-2">
        {DAY_NAMES.map((shortName, dayOfWeek) => {
          const mode = value[dayOfWeek] ?? "workout";
          return (
            <li
              key={dayOfWeek}
              className="rounded-lg border border-border bg-surface-hover/50 px-3 py-2 space-y-2"
            >
              <span className="text-sm font-medium text-foreground">{shortName}</span>
              <span
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label={`${shortName} day type`}
              >
                {MODE_ORDER.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(dayOfWeek, m)}
                    title={REST_DAY_DESCRIPTIONS[m]}
                    className={uiChoicePillSolidClass(mode === m)}
                  >
                    {REST_DAY_LABELS[m]}
                  </button>
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
