import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { resolveStretchesForDay } from "@/lib/dayStretchPlan";
import type { ExercisePreferenceMap } from "@/lib/repos";
import {
  resolveDefaultCoolDownFromSettings,
  resolveDefaultWarmUpFromSettings,
} from "@/lib/stretchDefaults";
import { useAuthStore, type AuthMode } from "@/stores/useAuthStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { DayPlan, StretchEntry } from "@/types";

export type StretchResolveContext = {
  defaultWarmUp: StretchEntry[];
  defaultCoolDown: StretchEntry[];
  dislikedExerciseIds: ReadonlySet<string>;
};

export function buildStretchResolveContextFromInputs(inputs: {
  defaultWarmUp: StretchEntry[];
  defaultCoolDown: StretchEntry[];
  authMode: AuthMode;
  exercisePreferences: ExercisePreferenceMap;
}): StretchResolveContext {
  const dislikedExerciseIds = collectDislikedIds(inputs.exercisePreferences);
  const useCatalogIfEmpty = inputs.authMode === "guest";
  return {
    defaultWarmUp: resolveDefaultWarmUpFromSettings(
      inputs.defaultWarmUp,
      dislikedExerciseIds,
      useCatalogIfEmpty,
    ),
    defaultCoolDown: resolveDefaultCoolDownFromSettings(
      inputs.defaultCoolDown,
      dislikedExerciseIds,
      useCatalogIfEmpty,
    ),
    dislikedExerciseIds,
  };
}

/** Sync context for stores / workout start (non-React). */
export function buildStretchResolveContext(): StretchResolveContext {
  return buildStretchResolveContextFromInputs({
    defaultWarmUp: useSettingsStore.getState().defaultWarmUp,
    defaultCoolDown: useSettingsStore.getState().defaultCoolDown,
    authMode: useAuthStore.getState().mode,
    exercisePreferences: useExercisePreferencesStore.getState().byExerciseId,
  });
}

/** Resolve warm-up / cool-down using current settings + prefs (non-React). */
export function resolveStretchesForPlan(plan: DayPlan): {
  warmUp: StretchEntry[];
  coolDown: StretchEntry[];
} {
  return resolveStretchesForDay(plan, buildStretchResolveContext());
}
