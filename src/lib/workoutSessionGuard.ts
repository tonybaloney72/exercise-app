import { useWorkoutStore } from "@/stores/useWorkoutStore";
import type { WorkoutLog } from "@/types";
import { findWorkoutLogForDate } from "@/utils/workoutLogLookup";

export type PrescribedPlanFreezeState = {
  activeWorkout: WorkoutLog | null;
  pausedWorkoutDate: string | null;
  workoutHistory: WorkoutLog[];
};

/** True when the user has started (or paused) a workout for this calendar date. */
export function isWorkoutStartedFromState(
  dateKey: string,
  state: PrescribedPlanFreezeState,
): boolean {
  return (
    state.activeWorkout?.date === dateKey ||
    state.pausedWorkoutDate === dateKey
  );
}

/**
 * True when a day's prescribed plan should not be replaced on prefs/profile regen
 * (in-progress, paused, or already completed for that calendar day).
 */
export function isPrescribedPlanFrozenFromState(
  dateKey: string,
  state: PrescribedPlanFreezeState,
): boolean {
  if (isWorkoutStartedFromState(dateKey, state)) return true;
  const log = findWorkoutLogForDate(state.workoutHistory, dateKey);
  return log?.endTime != null;
}

/** True when the user has started (or paused) a workout for this calendar date. */
export function isWorkoutStartedForDate(dateKey: string): boolean {
  if (typeof window === "undefined") return false;
  return isWorkoutStartedFromState(dateKey, useWorkoutStore.getState());
}

/** Browser: in-progress, paused, or completed log for `dateKey`. */
export function isPrescribedPlanFrozenForDate(dateKey: string): boolean {
  if (typeof window === "undefined") return false;
  return isPrescribedPlanFrozenFromState(dateKey, useWorkoutStore.getState());
}
