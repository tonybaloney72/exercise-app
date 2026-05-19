"use client";

import {
  CARDIO_ACTIVITY_LABELS,
  CARDIO_ACTIVITY_ORDER,
  cardioKindAllowed,
} from "@/lib/cardioActivities";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { CardioActivityKind, WeeklyCardioByDay } from "@/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type Props = {
  value: WeeklyCardioByDay;
  onChange: (next: WeeklyCardioByDay, customized: boolean) => void;
};

export default function WeeklyCardioEditor({ value, onChange }: Props) {
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);

  function toggleKind(dayOfWeek: number, kind: CardioActivityKind) {
    const current = value[dayOfWeek] ?? [];
    const next = current.includes(kind)
      ? current.filter((k) => k !== kind)
      : [...current, kind];
    onChange({ ...value, [dayOfWeek]: next }, true);
  }

  return (
    <section className="space-y-2">
      <p className="text-xs text-muted leading-snug">
        Choose endurance work for each day (jog, walk, cycle, hike, swim). Enable{" "}
        <strong className="text-foreground">Bicycle / indoor bike</strong> under Your equipment
        for cycle. Log time and distance in the workout like a jog.
      </p>
      <ul className="space-y-2">
        {DAY_NAMES.map((shortName, dayOfWeek) => (
          <li
            key={dayOfWeek}
            className="rounded-lg border border-border bg-surface-hover/50 px-3 py-2 space-y-2"
          >
            <span className="text-sm font-medium text-foreground">{shortName}</span>
            <span className="flex flex-wrap gap-1">
              {CARDIO_ACTIVITY_ORDER.map((kind) => {
                const enabled = (value[dayOfWeek] ?? []).includes(kind);
                const allowed = cardioKindAllowed(kind, availableEquipment);
                return (
                  <button
                    key={kind}
                    type="button"
                    disabled={!allowed}
                    title={!allowed ? "Add equipment in Your equipment" : undefined}
                    onClick={() => toggleKind(dayOfWeek, kind)}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-40 ${
                      enabled
                        ? "bg-accent text-white"
                        : "bg-background text-muted hover:text-foreground"
                    }`}
                  >
                    {CARDIO_ACTIVITY_LABELS[kind]}
                  </button>
                );
              })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
