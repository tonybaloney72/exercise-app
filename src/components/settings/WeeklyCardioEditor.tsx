"use client";

import {
  CARDIO_ACTIVITY_LABELS,
  CARDIO_ACTIVITY_ORDER,
  cardioKindAllowed,
} from "@/lib/cardioActivities";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { uiChoicePillSolidClass } from "@/lib/uiClasses";
import type { CardioActivityKind, WeeklyCardioByDay } from "@/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type Props = {
  value: WeeklyCardioByDay;
  onChange: (next: WeeklyCardioByDay, customized: boolean) => void;
  /** When set, only these weekdays (0=Sun … 6=Sat) are shown and editable. */
  editableDays?: readonly number[];
};

export default function WeeklyCardioEditor({
  value,
  onChange,
  editableDays,
}: Props) {
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);

  const visibleDays =
    editableDays != null
      ? DAY_NAMES.map((shortName, dayOfWeek) => ({
          shortName,
          dayOfWeek,
        })).filter(({ dayOfWeek }) => editableDays.includes(dayOfWeek))
      : DAY_NAMES.map((shortName, dayOfWeek) => ({ shortName, dayOfWeek }));

  function toggleKind(dayOfWeek: number, kind: CardioActivityKind) {
    const current = value[dayOfWeek] ?? [];
    const next = current.includes(kind)
      ? current.filter((k) => k !== kind)
      : [...current, kind];
    const merged = { ...value, [dayOfWeek]: next };
    if (editableDays != null) {
      for (let dow = 0; dow < 7; dow++) {
        if (!editableDays.includes(dow)) merged[dow] = [];
      }
    }
    onChange(merged, true);
  }

  return (
    <section className="space-y-2">
      <p className="text-sm text-muted leading-snug">
        {editableDays != null ? (
          <>
            Endurance for{" "}
            <strong className="text-foreground">
              push, pull, and Sunday recovery
            </strong>{" "}
            only — leg days use a core block instead. Enable{" "}
            <strong className="text-foreground">Bicycle / indoor bike</strong>{" "}
            under Your equipment for cycle.
          </>
        ) : (
          <>
            Enable{" "}
            <strong className="text-foreground">Bicycle / indoor bike</strong>{" "}
            under Your equipment for cycle.
          </>
        )}
      </p>
      <ul className="space-y-2">
        {visibleDays.map(({ shortName, dayOfWeek }) => (
          <li
            key={dayOfWeek}
            className="rounded-lg border border-border bg-surface-hover/50 px-3 py-2 space-y-2"
          >
            <span className="text-sm font-medium text-foreground">
              {shortName}
            </span>
            <span className="flex flex-wrap gap-1.5">
              {CARDIO_ACTIVITY_ORDER.map((kind) => {
                const enabled = (value[dayOfWeek] ?? []).includes(kind);
                const allowed = cardioKindAllowed(kind, availableEquipment);
                return (
                  <button
                    key={kind}
                    type="button"
                    disabled={!allowed}
                    title={
                      !allowed ? "Add equipment in Your equipment" : undefined
                    }
                    onClick={() => toggleKind(dayOfWeek, kind)}
                    className={uiChoicePillSolidClass(enabled)}
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
