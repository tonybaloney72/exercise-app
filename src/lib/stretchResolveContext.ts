import { collectDislikedIds } from "@/lib/exerciseCandidates";
import {
  resolveStretchesForDay,
  resolveStretchesForWeekSequential,
  type ResolvedDayStretches,
} from "@/lib/dayStretchPlan";
import type { TrainingWeekDays } from "@/lib/repos";
import type { ExercisePreferenceMap } from "@/lib/repos";
import {
  DEFAULT_COOL_DOWN_STRETCH_COUNT,
  DEFAULT_WARM_UP_STRETCH_COUNT,
  sanitizeStretchCount,
} from "@/lib/stretchCounts";
import { getWeekDateKeys } from "@/utils/weekCalendar";
import type { DayPlan } from "@/types";

export type StretchResolveContext = {
  warmUpStretchCount: number;
  coolDownStretchCount: number;
  dislikedExerciseIds: ReadonlySet<string>;
  /** Sunday date key for the active week - rotates catalog picks across weeks. */
  weekRotationKey: string;
  /** Stretch ids already assigned earlier in the same Sun–Sat week (generator variety). */
  weekUsedStretchIds?: ReadonlySet<string>;
};

export function buildStretchResolveContextFromInputs(inputs: {
  warmUpStretchCount?: number;
  coolDownStretchCount?: number;
  exercisePreferences: ExercisePreferenceMap;
  weekRotationKey?: string;
}): StretchResolveContext {
  return {
    warmUpStretchCount: sanitizeStretchCount(
      inputs.warmUpStretchCount,
      DEFAULT_WARM_UP_STRETCH_COUNT,
    ),
    coolDownStretchCount: sanitizeStretchCount(
      inputs.coolDownStretchCount,
      DEFAULT_COOL_DOWN_STRETCH_COUNT,
    ),
    dislikedExerciseIds: collectDislikedIds(inputs.exercisePreferences),
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
