"use client";

import CardioActivityKindToggles from "@/components/workout/CardioActivityKindToggles";
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
    <section className="flex flex-col gap-2">
      <p className="text-sm text-muted leading-snug">
        {editableDays != null ? (
          <>
            Endurance for{" "}
            <strong className="text-foreground">
              push, pull, and Sunday recovery
            </strong>{" "}
            only - leg days use a core block instead. Enable{" "}
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
      <ul className="flex flex-col gap-2">
        {visibleDays.map(({ shortName, dayOfWeek }) => (
          <li
            key={dayOfWeek}
            className="flex flex-col rounded-lg border border-border bg-surface-hover/50 px-3 py-2 gap-2"
          >
            <span className="text-sm font-medium text-foreground">
              {shortName}
            </span>
            <CardioActivityKindToggles
              value={value[dayOfWeek] ?? []}
              onToggle={(kind) => toggleKind(dayOfWeek, kind)}
              aria-label={`${shortName} cardio activities`}
              disabledTitle="Add equipment in Your equipment"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
