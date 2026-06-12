import type { ExercisePreferenceMap } from "@/lib/repos";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import type { DayPlan } from "@/types";

/** Whether a prescribed day still lists an exercise the user has since disliked. */
export function dayPlanContainsDislikedExercise(
  plan: DayPlan,
  dislikedIds: ReadonlySet<string>,
): boolean {
  if (dislikedIds.size === 0) return false;

  for (const round of plan.rounds) {
    for (const ex of round.exercises) {
      if (dislikedIds.has(ex.exerciseId)) return true;
    }
  }
  for (const entry of plan.warmUp ?? []) {
    if (dislikedIds.has(entry.exerciseId)) return true;
  }
  for (const entry of plan.coolDown ?? []) {
    if (dislikedIds.has(entry.exerciseId)) return true;
  }
  return false;
}

export type FrozenPastDayPlanCopy = {
  /** Shown for any past day in the current stored week. */
  frozenPlanMessage: string;
  /** When the frozen plan still includes a currently disliked exercise. */
  dislikedOnFrozenPlanMessage: string | null;
};

/**
 * Copy for `/weekly/day/[date]` when viewing a day before today in the stored week.
 * Settings changes only regen today + upcoming days; past snapshots stay as saved.
 */
export function getFrozenPastDayPlanCopy(
  plan: DayPlan,
  prefs: ExercisePreferenceMap,
): FrozenPastDayPlanCopy {
  const dislikedIds = collectDislikedIds(prefs);
  const hasDisliked = dayPlanContainsDislikedExercise(plan, dislikedIds);

  return {
    frozenPlanMessage:
      "This is the plan saved for that day in your current training week. Changing settings updates today and upcoming days only - not past days.",
    dislikedOnFrozenPlanMessage: hasDisliked
      ? "This saved plan still includes an exercise you’ve marked disliked. Past days aren’t auto-updated; use Customize on a future day or Reset week on Weekly if you want a fresh plan."
      : null,
  };
}
