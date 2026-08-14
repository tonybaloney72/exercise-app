import type { TrainingWeekDays } from "@/lib/repos";
import type { DayPlan } from "@/types";

/** Which days to replace when prefs/profile change (not a full-week reset). */
export function regenDayIndicesForPrefsChange(options: {
  todayDayOfWeek: number;
  /** Skip today when in-progress, paused, or already logged for this date. */
  freezeTodayPlan: boolean;
}): number[] {
  const start = options.freezeTodayPlan
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
    if (stored[dow]?.planCustomized) continue;
    const day = generated[dow];
    if (!day) continue;
    merged[dow] = { ...day, dayOfWeek: dow };
  }
  return merged;
}

/** Keep Edit Day saves when replacing the rest of the week from the generator. */
export function restoreCustomizedDays(
  stored: TrainingWeekDays | null,
  generated: TrainingWeekDays,
): TrainingWeekDays {
  if (!stored) return generated;
  const merged: TrainingWeekDays = { ...generated };
  for (let dow = 0; dow < 7; dow++) {
    const saved = stored[dow];
    if (!saved?.planCustomized) continue;
    merged[dow] = { ...saved, dayOfWeek: dow };
  }
  return merged;
}

function cloneTrainingWeekDays(week: TrainingWeekDays): TrainingWeekDays {
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
