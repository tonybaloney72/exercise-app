import { isNativePlatform } from "@/lib/capacitorRuntime";
import { clientTrace } from "@/lib/diagnostics/clientTrace";
import {
  ensureExerciseSessionWriteAccess,
  saveExerciseSessionToHealth,
} from "@/lib/health/healthExerciseWrite";
import {
  exerciseWorkoutTypeForLog,
  totalCompletedCardioDistanceMeters,
} from "@/lib/health/healthWorkoutType";
import { isCardioOnlyQuickLogWorkout } from "@/utils/workoutLogLookup";
import type { WorkoutLog } from "@/types";

/** Mirror a finished in-app workout to Health Connect as an exercise session. */
export async function writeCompletedWorkoutToHealth(
  log: WorkoutLog,
): Promise<void> {
  if (!isNativePlatform()) return;
  if (!log.endTime || !log.startTime) {
    clientTrace("health-write", "completed_workout_skip", {
      reason: "missing_times",
      workoutId: log.id,
    });
    return;
  }

  const startMs = Date.parse(log.startTime);
  const endMs = Date.parse(log.endTime);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    clientTrace("health-write", "completed_workout_skip", {
      reason: "invalid_times",
      workoutId: log.id,
    });
    return;
  }

  const granted = await ensureExerciseSessionWriteAccess();
  if (!granted) {
    clientTrace("health-write", "completed_workout_skip", {
      reason: "write_permission_denied",
      workoutId: log.id,
    });
    return;
  }

  const workoutType = exerciseWorkoutTypeForLog(log);
  const distanceMeters = totalCompletedCardioDistanceMeters(log);

  await saveExerciseSessionToHealth({
    workoutType,
    startDate: log.startTime,
    endDate: log.endTime,
    ...(distanceMeters != null ? { distanceMeters } : {}),
  });

  clientTrace("health-write", "completed_workout_ok", {
    workoutId: log.id,
    workoutType,
    cardioOnly: isCardioOnlyQuickLogWorkout(log),
    hasDistance: distanceMeters != null,
  });
}
