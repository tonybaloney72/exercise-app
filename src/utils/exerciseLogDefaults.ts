import type { ExerciseLog, WorkoutLog } from "@/types";
import { exerciseMap } from "@/data/exercises";

function extractPositiveInts(s: string): number[] {
  return (s.match(/\d+/g) ?? [])
    .map((x) => parseInt(x, 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
}

/**
 * Derive stored metrics from the plan prescription string (e.g. "12", "10 each",
 * "20–30 sec") and whether the exercise is time-based in the library.
 */
export function metricsFromPrescription(
  prescription: string,
  isTimeBased: boolean,
): { actualReps?: number; actualDuration?: number } {
  const nums = extractPositiveInts(prescription);
  if (nums.length === 0) return {};

  const n = Math.max(...nums);
  if (isTimeBased) {
    return { actualDuration: n };
  }
  return { actualReps: n };
}

export function effectiveExerciseId(log: ExerciseLog): string {
  return log.swappedWith ?? log.exerciseId;
}

export function resolvePrescriptionText(log: ExerciseLog): string {
  const direct = log.targetPrescription?.trim();
  if (direct) return direct;
  const meta = exerciseMap[effectiveExerciseId(log)];
  return meta?.defaultReps?.trim() ?? "";
}

/**
 * Clears logged metrics (e.g. when un-completing or skipping).
 */
export function clearExerciseMetrics(log: ExerciseLog): ExerciseLog {
  return {
    ...log,
    actualReps: undefined,
    actualDuration: undefined,
  };
}

/**
 * Ensures completed, non-skipped exercises always have `actualReps` and/or
 * `actualDuration` populated from prescription + library metadata.
 */
export function ensureExerciseMetrics(log: ExerciseLog): ExerciseLog {
  if (!log.completed || log.skipped) return log;
  if (log.actualReps != null || log.actualDuration != null) return log;

  const id = effectiveExerciseId(log);
  const meta = exerciseMap[id];
  const prescription = resolvePrescriptionText(log);
  const parsed = metricsFromPrescription(prescription, meta?.isTimeBased ?? false);

  if (parsed.actualReps != null || parsed.actualDuration != null) {
    return { ...log, ...parsed };
  }

  if (meta?.isTimeBased) {
    return { ...log, actualDuration: 30 };
  }
  return { ...log, actualReps: 1 };
}

export function hydrateWorkoutLog(log: WorkoutLog): WorkoutLog {
  return {
    ...log,
    warmUpExercises: log.warmUpExercises.map(ensureExerciseMetrics),
    coolDownExercises: log.coolDownExercises.map(ensureExerciseMetrics),
    rounds: log.rounds.map((r) => ({
      ...r,
      exercises: r.exercises.map(ensureExerciseMetrics),
    })),
  };
}
