import { collectDislikedIds } from "@/lib/exerciseCandidates";
import {
  resolveTrainingPriorityScores,
  scoresFromPreset,
} from "@/lib/trainingPriorities";
import { resolveStretchesForDay } from "@/lib/dayStretchPlan";
import type { ExercisePreferenceMap } from "@/lib/repos";
import {
  resolveDefaultCoolDownFromSettings,
  resolveDefaultWarmUpFromSettings,
} from "@/lib/stretchDefaults";
import { useAuthStore, type AuthMode } from "@/stores/useAuthStore";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { getWeekDateKeys } from "@/utils/weekCalendar";
import type { TrainingPriorityScores } from "@/lib/trainingPriorities";
import type { DayPlan, StretchEntry, TrainingPriorityPreset } from "@/types";

export type StretchResolveContext = {
  defaultWarmUp: StretchEntry[];
  defaultCoolDown: StretchEntry[];
  dislikedExerciseIds: ReadonlySet<string>;
  trainingPriorityPreset: TrainingPriorityPreset;
  trainingPriorityScores: TrainingPriorityScores;
  trainingPriorityCustomized: boolean;
  /** Sunday date key for the active week — rotates catalog picks across weeks. */
  weekRotationKey: string;
};

export function buildStretchResolveContextFromInputs(inputs: {
  defaultWarmUp: StretchEntry[];
  defaultCoolDown: StretchEntry[];
  authMode: AuthMode;
  exercisePreferences: ExercisePreferenceMap;
  trainingPriorityPreset?: TrainingPriorityPreset;
  trainingPriorityScores?: TrainingPriorityScores;
  trainingPriorityCustomized?: boolean;
  weekRotationKey?: string;
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
    trainingPriorityPreset:
      inputs.trainingPriorityPreset ?? "balanced",
    trainingPriorityScores:
      inputs.trainingPriorityScores ??
      scoresFromPreset(inputs.trainingPriorityPreset ?? "balanced"),
    trainingPriorityCustomized: inputs.trainingPriorityCustomized ?? false,
    weekRotationKey: inputs.weekRotationKey ?? getWeekDateKeys()[0]!,
  };
}

/** Sync context for stores / workout start (non-React). */
export function buildStretchResolveContext(): StretchResolveContext {
  return buildStretchResolveContextFromInputs({
    defaultWarmUp: useSettingsStore.getState().defaultWarmUp,
    defaultCoolDown: useSettingsStore.getState().defaultCoolDown,
    authMode: useAuthStore.getState().mode,
    exercisePreferences: useExercisePreferencesStore.getState().byExerciseId,
    trainingPriorityPreset: useSettingsStore.getState().trainingPriorityPreset,
    trainingPriorityScores: resolveTrainingPriorityScores(useSettingsStore.getState()),
    trainingPriorityCustomized:
      useSettingsStore.getState().trainingPriorityCustomized,
    weekRotationKey: getWeekDateKeys()[0],
  });
}

/** Resolve warm-up / cool-down using current settings + prefs (non-React). */
export function resolveStretchesForPlan(plan: DayPlan): {
  warmUp: StretchEntry[];
  coolDown: StretchEntry[];
} {
  return resolveStretchesForDay(plan, buildStretchResolveContext());
}
