import { normalizeDayPlanCardio } from "@/lib/cardioActivities";
import { planHasStrengthExercises } from "@/lib/restDays";
import type { TrainingWeekDays } from "@/lib/repos";
import type { DayPlan } from "@/types";

/** Apply rest-day / cardio / theme metadata from shells without replacing user rounds. */
export function mergeWeekScheduleIntoStoredWeek(
  stored: TrainingWeekDays,
  shells: TrainingWeekDays,
): TrainingWeekDays {
  const merged: TrainingWeekDays = { ...stored };
  for (let dow = 0; dow < 7; dow++) {
    const existing = stored[dow];
    const shell = shells[dow];
    if (!existing || !shell) continue;
    merged[dow] = mergeDayScheduleMetadata(existing, shell);
  }
  return merged;
}

export function mergeDayScheduleMetadata(existing: DayPlan, shell: DayPlan): DayPlan {
  const merged = normalizeDayPlanCardio({
    ...existing,
    dayOfWeek: shell.dayOfWeek,
    theme: shell.theme,
    strengthFocus: [...shell.strengthFocus],
    coreGroups: [...shell.coreGroups],
    hasJog: shell.hasJog,
    restDayMode: shell.restDayMode,
    cardioActivities: shell.cardioActivities?.map((a) => ({ ...a })),
  });
  const shellIsOptionalRest =
    shell.restDayMode === "full_rest" || shell.restDayMode === "stretches";
  if (shellIsOptionalRest && !planHasStrengthExercises(existing)) {
    return { ...merged, rounds: [] };
  }
  return merged;
}
