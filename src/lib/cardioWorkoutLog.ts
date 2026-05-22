import { cardioRowKey } from "@/lib/cardioInstances";
import { ensureCardioExercises } from "@/lib/resolveWorkoutCardio";
import type { ExerciseLog, WorkoutLog } from "@/types";

export function patchCardioLog(
  log: WorkoutLog,
  instanceKey: string,
  patch: Partial<ExerciseLog>,
): WorkoutLog {
  const cardio = ensureCardioExercises(log).map((row) =>
    cardioRowKey(row) === instanceKey ? { ...row, ...patch } : row,
  );
  return { ...log, cardioExercises: cardio };
}

export function getCardioLog(
  log: WorkoutLog,
  instanceKey: string,
): ExerciseLog | undefined {
  return ensureCardioExercises(log).find(
    (row) => cardioRowKey(row) === instanceKey,
  );
}
