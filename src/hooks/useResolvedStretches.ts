"use client";

import { useMemo } from "react";
import {
  resolveStretchesForDay,
  resolveStretchesForWeekSequential,
} from "@/lib/dayStretchPlan";
import { buildStretchResolveContextFromInputs } from "@/lib/stretchResolveContext";
import type { TrainingWeekDays } from "@/lib/repos";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { getWeekDateKeys } from "@/utils/weekCalendar";
import type { DayPlan, StretchEntry } from "@/types";

const EMPTY: { warmUp: StretchEntry[]; coolDown: StretchEntry[] } = {
  warmUp: [],
  coolDown: [],
};

/**
 * Day-aware warm-up / cool-down for a prescribed plan, reactive to settings
 * and Library dislikes. Pass `weekByDow` to spread stretch variety
 * across the current Sun–Sat week.
 */
export function useResolvedStretches(
  plan: DayPlan | null,
  weekByDow?: TrainingWeekDays | null,
): {
  warmUp: StretchEntry[];
  coolDown: StretchEntry[];
} {
  const warmUpStretchCount = useSettingsStore((s) => s.warmUpStretchCount);
  const coolDownStretchCount = useSettingsStore((s) => s.coolDownStretchCount);
  const exercisePreferences = useExercisePreferencesStore((s) => s.byExerciseId);

  const stretchCountsKey = useMemo(
    () => `w${warmUpStretchCount}|c${coolDownStretchCount}`,
    [warmUpStretchCount, coolDownStretchCount],
  );

  const weekKey = useMemo(
    () =>
      weekByDow
        ? Array.from({ length: 7 }, (_, d) => weekByDow[d]?.name ?? "").join("|")
        : "",
    [weekByDow],
  );

  return useMemo(() => {
    if (!plan) return EMPTY;
    const ctx = buildStretchResolveContextFromInputs({
      warmUpStretchCount,
      coolDownStretchCount,
      exercisePreferences,
      weekRotationKey: getWeekDateKeys()[0],
    });
    if (weekByDow) {
      const weekPlans = Array.from({ length: 7 }, (_, d) => weekByDow[d] ?? null);
      const resolved = resolveStretchesForWeekSequential(weekPlans, ctx);
      return resolved[plan.dayOfWeek] ?? resolveStretchesForDay(plan, ctx);
    }
    return resolveStretchesForDay(plan, ctx);
  }, [
    plan,
    weekByDow,
    weekKey,
    stretchCountsKey,
    exercisePreferences,
    warmUpStretchCount,
    coolDownStretchCount,
  ]);
}
