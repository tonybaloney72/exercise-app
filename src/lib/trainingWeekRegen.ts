import type { TrainingWeekDays } from "@/lib/repos";
import type { DayPlan } from "@/types";

/** Which days to replace when prefs/profile change (not a full-week reset). */
export function regenDayIndicesForPrefsChange(options: {
  todayDayOfWeek: number;
  workoutStartedToday: boolean;
}): number[] {
  const start = options.workoutStartedToday
    ? options.todayDayOfWeek + 1
    : options.todayDayOfWeek;
  const indices: number[] = [];
  for (let dow = start; dow <= 6; dow++) indices.push(dow);
  return indices;
}

/** Merge freshly generated days into a stored week; untouched indices are preserved. */
export function mergeRegeneratedDays(
  stored: TrainingWeekDays,
  generated: TrainingWeekDays,
  regenerateIndices: readonly number[],
): TrainingWeekDays {
  const merged: TrainingWeekDays = { ...stored };
  for (const dow of regenerateIndices) {
    const day = generated[dow];
    if (!day) continue;
    merged[dow] = { ...day, dayOfWeek: dow };
  }
  return merged;
}

export function cloneTrainingWeekDays(week: TrainingWeekDays): TrainingWeekDays {
  const out: TrainingWeekDays = {};
  for (let dow = 0; dow < 7; dow++) {
    const plan = week[dow];
    if (!plan) continue;
    out[dow] = cloneDayPlan(plan);
  }
  return out;
}

function cloneDayPlan(plan: DayPlan): DayPlan {
  return {
    ...plan,
    strengthFocus: [...plan.strengthFocus],
    coreGroups: [...plan.coreGroups],
    rounds: plan.rounds.map((round) => ({
      ...round,
      exercises: round.exercises.map((ex) => ({ ...ex })),
    })),
    warmUp: plan.warmUp?.map((e) => ({ ...e })),
    coolDown: plan.coolDown?.map((e) => ({ ...e })),
  };
}
