import type { Exercise, ExerciseSetMode } from "@/types";

/** When the user prefers timer mode but has not set a duration yet. */
export const DEFAULT_TIMER_SECONDS_FALLBACK = 45;

export interface ResolvedExerciseSettings {
  defaultSetMode: ExerciseSetMode;
  /** Defined when `defaultSetMode === "timer"`. */
  defaultTimerSeconds?: number;
}

/**
 * Merge catalog metadata with optional persisted per-user row.
 * No persisted row → mode follows `exercise.isTimeBased`; timer seconds default to 45.
 */
export function resolveExerciseSettings(
  exercise: Pick<Exercise, "isTimeBased">,
  stored:
    | { defaultSetMode: ExerciseSetMode; defaultTimerSeconds?: number | null }
    | undefined,
): ResolvedExerciseSettings {
  const defaultSetMode: ExerciseSetMode =
    stored?.defaultSetMode ?? (exercise.isTimeBased ? "timer" : "reps");

  if (defaultSetMode === "reps") {
    return { defaultSetMode: "reps" };
  }

  const sec =
    stored?.defaultTimerSeconds != null && stored.defaultTimerSeconds > 0
      ? stored.defaultTimerSeconds
      : DEFAULT_TIMER_SECONDS_FALLBACK;

  return { defaultSetMode: "timer", defaultTimerSeconds: sec };
}
