import { collectDislikedIds } from "@/lib/exerciseCandidates";
import {
  resolveTrainingPriorityScores,
  scoresFromPreset,
} from "@/lib/trainingPriorities";
import {
  resolveStretchesForDay,
  resolveStretchesForWeekSequential,
  type ResolvedDayStretches,
} from "@/lib/dayStretchPlan";
import { resolveTrainingWeekForAuth } from "@/lib/planResolver";
import type { TrainingWeekDays } from "@/lib/repos";
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
  /** Stretch ids already assigned earlier in the same Sun–Sat week (generator variety). */
  weekUsedStretchIds?: ReadonlySet<string>;
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

function stretchesForPlanInWeek(
  plan: DayPlan,
  weekByDow: TrainingWeekDays,
  ctx: StretchResolveContext,
): ResolvedDayStretches {
  const weekPlans = Array.from({ length: 7 }, (_, d) => weekByDow[d] ?? null);
  const resolved = resolveStretchesForWeekSequential(weekPlans, ctx);
  return resolved[plan.dayOfWeek] ?? resolveStretchesForDay(plan, ctx);
}

/** Resolve warm-up / cool-down using current settings + prefs (non-React). */
export function resolveStretchesForPlan(
  plan: DayPlan,
  weekByDow?: TrainingWeekDays | null,
): ResolvedDayStretches {
  const ctx = buildStretchResolveContext();
  if (weekByDow) return stretchesForPlanInWeek(plan, weekByDow, ctx);
  return resolveStretchesForDay(plan, ctx);
}

/** Week-aware resolve for workout start (loads current week when possible). */
export async function resolveStretchesForWorkoutStart(
  plan: DayPlan,
): Promise<ResolvedDayStretches> {
  const ctx = buildStretchResolveContext();
  const mode = useAuthStore.getState().mode;
  if (mode === "loading") return resolveStretchesForDay(plan, ctx);
  try {
    const anchor = getWeekDateKeys()[0]!;
    const week = await resolveTrainingWeekForAuth(anchor, mode);
    if (week) return stretchesForPlanInWeek(plan, week, ctx);
  } catch {
    /* fall through */
  }
  return resolveStretchesForDay(plan, ctx);
}
