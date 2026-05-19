import { ensureCardioExercises } from "@/lib/resolveWorkoutCardio";
import type { ExerciseLog, WorkoutLog } from "@/types";

export function patchCardioLog(
  log: WorkoutLog,
  exerciseId: string,
  patch: Partial<ExerciseLog>,
): WorkoutLog {
  const cardio = ensureCardioExercises(log).map((row) =>
    row.exerciseId === exerciseId ? { ...row, ...patch } : row,
  );
  return { ...log, cardioExercises: cardio };
}

export function getCardioLog(log: WorkoutLog, exerciseId: string): ExerciseLog | undefined {
  return ensureCardioExercises(log).find((r) => r.exerciseId === exerciseId);
}
