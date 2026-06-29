import type { ExerciseLog, WorkoutLog } from "@/types";
import { ensureCardioExercises } from "@/lib/resolveWorkoutCardio";

/** Row has user intent or captured cardio data (not a blank plan placeholder). */
export function isMeaningfulCardioRow(row: ExerciseLog): boolean {
  if (row.skipped) return true;
  if (row.actualDistanceMi != null && row.actualDistanceMi > 0) return true;
  if (row.actualDuration != null && row.actualDuration > 0) return true;
  if (row.stepCount != null && row.stepCount > 0) return true;
  if (row.activeCaloriesKcal != null && row.activeCaloriesKcal > 0) return true;
  if (row.avgHeartRateBpm != null && row.avgHeartRateBpm > 0) return true;
  if (row.gpsTrackPoints != null && row.gpsTrackPoints.length >= 2) return true;
  if (row.activityStartTime && row.activityEndTime) return true;
  return false;
}

export function filterMeaningfulCardioRows(
  rows: ExerciseLog[],
): ExerciseLog[] {
  return rows.filter(isMeaningfulCardioRow);
}

/** Drop blank cardio placeholders before persisting or summarizing completed work. */
export function stripMeaninglessCardioFromWorkout(log: WorkoutLog): WorkoutLog {
  const rows = filterMeaningfulCardioRows(ensureCardioExercises(log));
  if (rows.length === 0) {
    const { cardioExercises: _removed, ...rest } = log;
    return rest;
  }
  return { ...log, cardioExercises: rows };
}
