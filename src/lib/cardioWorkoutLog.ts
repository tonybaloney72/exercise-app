import {
  CARDIO_KIND_TO_EXERCISE_ID,
  syncLegacyJogFieldsFromCardioLogs,
  syncJogCardioLogFromLegacy,
} from "@/lib/cardioActivities";
import type { ExerciseLog, WorkoutLog } from "@/types";

function ensureCardioLogs(log: WorkoutLog): ExerciseLog[] {
  if (log.cardioExercises && log.cardioExercises.length > 0) {
    return log.cardioExercises;
  }
  return syncJogCardioLogFromLegacy(log);
}

export function patchCardioLog(
  log: WorkoutLog,
  exerciseId: string,
  patch: Partial<ExerciseLog>,
): WorkoutLog {
  const cardio = ensureCardioLogs(log).map((row) =>
    row.exerciseId === exerciseId ? { ...row, ...patch } : row,
  );
  const next: WorkoutLog = { ...log, cardioExercises: cardio };
  if (exerciseId === CARDIO_KIND_TO_EXERCISE_ID.jog) {
    syncLegacyJogFieldsFromCardioLogs(next);
  }
  return next;
}

export function getCardioLog(log: WorkoutLog, exerciseId: string): ExerciseLog | undefined {
  return ensureCardioLogs(log).find((r) => r.exerciseId === exerciseId);
}
