import type { WorkoutLog } from "@/types";

export function countRoundExerciseSlots(log: WorkoutLog): number {
  return log.rounds.reduce((sum, r) => sum + r.exercises.length, 0);
}

export function countCompletedRoundExercises(log: WorkoutLog): number {
  return log.rounds.reduce(
    (sum, r) =>
      sum + r.exercises.filter((e) => e.completed && !e.skipped).length,
    0,
  );
}
