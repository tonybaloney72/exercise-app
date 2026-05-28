"use client";

import LayoutDayStructureControls from "@/components/settings/LayoutDayStructureControls";
import { getCatalogPlanForDay } from "@/data/trainingWeekCatalog";
import {
  LAYOUT_GROUP_LABELS,
  LAYOUT_GROUP_ORDER,
  type LayoutGroup,
  type WeeklyCategoryLayout,
} from "@/lib/weeklyCategoryLayout";
import {
  resolveLayoutDayStructure,
  type WeeklyLayoutDayStructure,
} from "@/lib/weeklyLayoutDayStructure";
import { uiChoicePillClass } from "@/lib/uiClasses";

type Props = {
  layout: WeeklyCategoryLayout;
  dayStructure: WeeklyLayoutDayStructure;
  onChange: (
    layout: WeeklyCategoryLayout,
    dayStructure: WeeklyLayoutDayStructure,
    customized: boolean,
  ) => void;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export default function WeeklyCategoryLayoutEditor({
  layout,
  dayStructure,
  onChange,
}: Props) {
  function emit(
    nextLayout: WeeklyCategoryLayout,
    nextStructure: WeeklyLayoutDayStructure,
  ) {
    onChange(nextLayout, nextStructure, true);
  }

  function toggleGroup(dayOfWeek: number, group: LayoutGroup) {
    const current = layout[dayOfWeek] ?? [];
    const nextGroups = current.includes(group)
      ? current.filter((g) => g !== group)
      : [...current, group];
    const nextLayout = { ...layout, [dayOfWeek]: nextGroups };
    const resolved = resolveLayoutDayStructure(
      dayOfWeek,
      nextGroups,
      dayStructure,
    );
    const nextStructure = {
      ...dayStructure,
      [dayOfWeek]: resolved,
    };
    emit(nextLayout, nextStructure);
  }

  function updateDayStructure(
    dayOfWeek: number,
    structure: import("@/lib/weeklyLayoutDayStructure").LayoutDayStructure,
  ) {
    emit(layout, { ...dayStructure, [dayOfWeek]: structure });
  }

  return (
    <div className="space-y-3">
      {DAY_NAMES.map((shortName, dayOfWeek) => {
        const enabled = layout[dayOfWeek] ?? [];
        const structure = resolveLayoutDayStructure(
          dayOfWeek,
          enabled,
          dayStructure,
        );
        const catalogRoundCount =
          getCatalogPlanForDay(dayOfWeek).rounds.length || 3;
        return (
          <div
            key={dayOfWeek}
            className="rounded-xl border border-border bg-surface-hover/40 p-3 space-y-2"
          >
            <p className="text-sm font-semibold text-foreground">{shortName}</p>
            <div
              className="flex flex-wrap gap-1.5"
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
                    className={uiChoicePillClass(on)}
                  >
                    {LAYOUT_GROUP_LABELS[group]}
                  </button>
                );
              })}
            </div>
            <LayoutDayStructureControls
              enabled={enabled}
              structure={structure}
              catalogRoundCount={catalogRoundCount}
              onChange={(s) => updateDayStructure(dayOfWeek, s)}
            />
          </div>
        );
      })}
    </div>
  );
}
