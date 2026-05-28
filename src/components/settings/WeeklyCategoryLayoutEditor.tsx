"use client";

import {
  LAYOUT_GROUP_LABELS,
  LAYOUT_GROUP_ORDER,
  type LayoutGroup,
  type WeeklyCategoryLayout,
} from "@/lib/weeklyCategoryLayout";

type Props = {
  layout: WeeklyCategoryLayout;
  onChange: (layout: WeeklyCategoryLayout, customized: boolean) => void;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export default function WeeklyCategoryLayoutEditor({ layout, onChange }: Props) {
  function toggleGroup(dayOfWeek: number, group: LayoutGroup) {
    const current = layout[dayOfWeek] ?? [];
    const next = current.includes(group)
      ? current.filter((g) => g !== group)
      : [...current, group];
    onChange({ ...layout, [dayOfWeek]: next }, true);
  }

  return (
    <div className="space-y-3">
      {DAY_NAMES.map((shortName, dayOfWeek) => {
        const enabled = layout[dayOfWeek] ?? [];
        return (
          <div
            key={dayOfWeek}
            className="rounded-xl border border-border bg-surface-hover/40 p-3 space-y-2"
          >
            <p className="text-xs font-semibold text-foreground">{shortName}</p>
            <div
              className="flex flex-wrap gap-1"
              role="group"
              aria-label={`${shortName} groups`}
            >
              {LAYOUT_GROUP_ORDER.map((group) => {
                const on = enabled.includes(group);
                return (
                  <button
                    key={group}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleGroup(dayOfWeek, group)}
                    className={`rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors ${
                      on
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-background text-muted hover:border-accent/30"
                    }`}
                  >
                    {LAYOUT_GROUP_LABELS[group]}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
