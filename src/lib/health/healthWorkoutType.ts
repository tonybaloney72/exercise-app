import type { WorkoutType } from "@capgo/capacitor-health";
import { isMeOriginatedCardioRow } from "@/lib/cardioHealthMirrorPolicy";
import { CARDIO_KIND_TO_EXERCISE_ID } from "@/lib/cardioKinds";
import { cardioKindToWorkoutType } from "@/lib/health/cardioKindMap";
import { resolveWorkoutCardioExercises } from "@/lib/resolveWorkoutCardio";
import { isCardioOnlyQuickLogWorkout } from "@/utils/workoutLogLookup";
import type { CardioActivityKind, WorkoutLog } from "@/types";

const EXERCISE_ID_TO_CARDIO_KIND = Object.fromEntries(
  Object.entries(CARDIO_KIND_TO_EXERCISE_ID).map(([kind, exerciseId]) => [
    exerciseId,
    kind,
  ]),
) as Record<string, CardioActivityKind>;

/** Map a completed workout log to a Health Connect exercise session type. */
export function exerciseWorkoutTypeForLog(log: WorkoutLog): WorkoutType {
  if (isCardioOnlyQuickLogWorkout(log)) {
    for (const row of resolveWorkoutCardioExercises(log)) {
      const kind = EXERCISE_ID_TO_CARDIO_KIND[row.exerciseId];
      const mapped = kind ? cardioKindToWorkoutType(kind) : undefined;
      if (mapped) return mapped;
    }
    return "walking";
  }
  return "calisthenics";
}

export function totalCompletedCardioDistanceMeters(
  log: WorkoutLog,
): number | undefined {
  let totalMi = 0;
  for (const row of resolveWorkoutCardioExercises(log)) {
    if (!row.completed || row.skipped) continue;
    if (!isMeOriginatedCardioRow(row)) continue;
    if (row.actualDistanceMi != null && row.actualDistanceMi > 0) {
      totalMi += row.actualDistanceMi;
    }
  }
  if (totalMi <= 0) return undefined;
  return totalMi * 1609.344;
}

/** Average completed-cardio speed (m/s) when distance and duration are both logged. */
export function completedCardioSpeedMetersPerSecond(
  log: WorkoutLog,
): number | undefined {
  let totalMi = 0;
  let totalSec = 0;
  for (const row of resolveWorkoutCardioExercises(log)) {
    if (!row.completed || row.skipped) continue;
    if (!isMeOriginatedCardioRow(row)) continue;
    if (row.actualDistanceMi != null && row.actualDistanceMi > 0) {
      totalMi += row.actualDistanceMi;
    }
    if (row.actualDuration != null && row.actualDuration > 0) {
      totalSec += row.actualDuration;
    }
  }
  if (totalMi <= 0 || totalSec <= 0) return undefined;
  return (totalMi * 1609.344) / totalSec;
}
