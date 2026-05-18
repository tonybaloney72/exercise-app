"use client";

import { TRAINING_WEEK_CATALOG } from "@/data/trainingWeekCatalog";
import {
  EMPHASIS_GROUP_LABELS,
  EMPHASIS_GROUP_ORDER,
  type EmphasisGroup,
} from "@/lib/trainingPriorities";
import {
  describeDayLayout,
  suggestLayoutFromCatalog,
  type WeeklyCategoryLayout,
} from "@/lib/weeklyCategoryLayout";

type Props = {
  layout: WeeklyCategoryLayout;
  onChange: (layout: WeeklyCategoryLayout, customized: boolean) => void;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export default function WeeklyCategoryLayoutEditor({ layout, onChange }: Props) {
  function toggleGroup(dayOfWeek: number, group: EmphasisGroup) {
    const current = layout[dayOfWeek] ?? [];
    const next = current.includes(group)
      ? current.filter((g) => g !== group)
      : [...current, group];
    onChange({ ...layout, [dayOfWeek]: next }, true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(suggestLayoutFromCatalog(), false)}
          className="rounded-lg border border-border bg-surface-hover px-3 py-1.5 text-xs font-medium text-foreground hover:border-accent/40"
        >
          Suggest from catalog
        </button>
      </div>

      <div className="space-y-3">
        {DAY_NAMES.map((shortName, dayOfWeek) => {
          const catalog = TRAINING_WEEK_CATALOG.find(
            (d) => d.dayOfWeek === dayOfWeek,
          );
          const enabled = layout[dayOfWeek] ?? [];
          return (
            <div
              key={dayOfWeek}
              className="rounded-xl border border-border bg-surface-hover/40 p-3 space-y-2"
            >
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {shortName}
                  {catalog ? (
                    <span className="font-normal text-muted">
                      {" "}
                      · {catalog.theme}
                    </span>
                  ) : null}
                </p>
                <p className="text-[10px] text-muted mt-0.5">
                  {describeDayLayout(enabled)}
                </p>
              </div>
              <div
                className="flex flex-wrap gap-1"
                role="group"
                aria-label={`${shortName} groups`}
              >
                {EMPHASIS_GROUP_ORDER.map((group) => {
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
                      {EMPHASIS_GROUP_LABELS[group]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
