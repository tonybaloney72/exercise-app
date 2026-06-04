import type { ExerciseLog, RoundLog } from "@/types";
import { clearExerciseMetrics } from "@/utils/exerciseLogDefaults";

export function toggleExerciseCompletion(ex: ExerciseLog): ExerciseLog {
  const nextDone = !ex.completed;
  if (!nextDone) {
    return { ...clearExerciseMetrics(ex), completed: false, skipped: false };
  }
  return { ...ex, completed: true, skipped: false };
}

export function skipExerciseLog(ex: ExerciseLog): ExerciseLog {
  return {
    ...clearExerciseMetrics(ex),
    skipped: true,
    completed: false,
  };
}

export function mapStretchLogs(
  list: ExerciseLog[],
  exerciseId: string,
  mapMatched: (ex: ExerciseLog) => ExerciseLog,
): ExerciseLog[] {
  return list.map((ex) => (ex.exerciseId !== exerciseId ? ex : mapMatched(ex)));
}

export function stretchSectionComplete(list: ExerciseLog[]): boolean {
  return list.every((ex) => ex.completed || ex.skipped);
}

export function mapRoundExercises(
  rounds: RoundLog[],
  roundNumber: number,
  exerciseId: string,
  mapMatched: (ex: ExerciseLog) => ExerciseLog,
): RoundLog[] {
  return rounds.map((r) => {
    if (r.roundNumber !== roundNumber) return r;
    return {
      ...r,
      exercises: r.exercises.map((ex) =>
        ex.exerciseId !== exerciseId ? ex : mapMatched(ex),
      ),
    };
  });
}

export function applyClampedTargetDuration(
  ex: ExerciseLog,
  seconds: number | null | undefined,
): ExerciseLog {
  if (seconds == null || Number.isNaN(seconds)) {
    return { ...ex, targetDurationSeconds: undefined };
  }
  const clamped = Math.min(999, Math.max(5, Math.round(seconds)));
  return { ...ex, targetDurationSeconds: clamped };
}
