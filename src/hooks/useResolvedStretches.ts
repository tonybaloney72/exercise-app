"use client";

import { useMemo } from "react";
import { resolveStretchesForDay } from "@/lib/dayStretchPlan";
import { buildStretchResolveContextFromInputs } from "@/lib/stretchResolveContext";
import { useAuthStore } from "@/stores/useAuthStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { DayPlan, StretchEntry } from "@/types";

const EMPTY: { warmUp: StretchEntry[]; coolDown: StretchEntry[] } = {
  warmUp: [],
  coolDown: [],
};

/**
 * Day-aware warm-up / cool-down for a prescribed plan, reactive to settings,
 * guest mode, and Library dislikes.
 */
export function useResolvedStretches(plan: DayPlan | null): {
  warmUp: StretchEntry[];
  coolDown: StretchEntry[];
} {
  const authMode = useAuthStore((s) => s.mode);
  const defaultWarmUp = useSettingsStore((s) => s.defaultWarmUp);
  const defaultCoolDown = useSettingsStore((s) => s.defaultCoolDown);
  const exercisePreferences = useExercisePreferencesStore((s) => s.byExerciseId);
  const programFocus = useSettingsStore((s) => s.programFocus);

  const stretchDefaultsKey = useMemo(
    () =>
      [...defaultWarmUp, ...defaultCoolDown]
        .map((e) => `${e.exerciseId}:${e.targetReps}`)
        .join("|"),
    [defaultWarmUp, defaultCoolDown],
  );

  return useMemo(() => {
    if (!plan) return EMPTY;
    const ctx = buildStretchResolveContextFromInputs({
      defaultWarmUp,
      defaultCoolDown,
      authMode,
      exercisePreferences,
      programFocus,
    });
    return resolveStretchesForDay(plan, ctx);
  }, [
    plan,
    authMode,
    defaultWarmUp,
    defaultCoolDown,
    exercisePreferences,
    programFocus,
    stretchDefaultsKey,
  ]);
}
