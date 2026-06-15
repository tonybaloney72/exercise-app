import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { scoresFromPreset } from "@/lib/trainingPriorities";
import {
  resolveStretchesForDay,
  resolveStretchesForWeekSequential,
  type ResolvedDayStretches,
} from "@/lib/dayStretchPlan";
import type { TrainingWeekDays } from "@/lib/repos";
import type { ExercisePreferenceMap } from "@/lib/repos";
import {
  resolveDefaultCoolDownFromSettings,
  resolveDefaultWarmUpFromSettings,
} from "@/lib/stretchDefaults";
import type { AuthMode } from "@/core";
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
  /** Sunday date key for the active week - rotates catalog picks across weeks. */
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
    trainingPriorityPreset: inputs.trainingPriorityPreset ?? "balanced",
    trainingPriorityScores:
      inputs.trainingPriorityScores ??
      scoresFromPreset(inputs.trainingPriorityPreset ?? "balanced"),
    trainingPriorityCustomized: inputs.trainingPriorityCustomized ?? false,
    weekRotationKey: inputs.weekRotationKey ?? getWeekDateKeys()[0]!,
  };
}

export function stretchesForPlanInWeek(
  plan: DayPlan,
  weekByDow: TrainingWeekDays,
  ctx: StretchResolveContext,
): ResolvedDayStretches {
  const weekPlans = Array.from({ length: 7 }, (_, d) => weekByDow[d] ?? null);
  const resolved = resolveStretchesForWeekSequential(weekPlans, ctx);
  const weekAware =
    resolved[plan.dayOfWeek] ?? resolveStretchesForDay(plan, ctx);
  const dayOnly = resolveStretchesForDay(plan, ctx);
  return {
    warmUp: weekAware.warmUp.length > 0 ? weekAware.warmUp : dayOnly.warmUp,
    coolDown:
      weekAware.coolDown.length > 0 ? weekAware.coolDown : dayOnly.coolDown,
  };
}
