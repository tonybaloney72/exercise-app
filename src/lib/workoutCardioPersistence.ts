import type { ExerciseLog, WorkoutLog } from "@/types";

const CARDIO_META_PREFIX = "@@cardio_exercises:";

/** Strip embedded cardio JSON from user-visible notes. */
export function userFacingWorkoutNotes(notes: string | undefined): string | undefined {
  if (!notes) return undefined;
  const idx = notes.indexOf(CARDIO_META_PREFIX);
  if (idx < 0) return notes.trim() || undefined;
  const trimmed = notes.slice(0, idx).trim();
  return trimmed || undefined;
}

function parseCardioFromNotes(notes: string | undefined): ExerciseLog[] | undefined {
  if (!notes) return undefined;
  const idx = notes.indexOf(CARDIO_META_PREFIX);
  if (idx < 0) return undefined;
  const json = notes.slice(idx + CARDIO_META_PREFIX.length).trim();
  try {
    const parsed = JSON.parse(json) as ExerciseLog[];
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function embedCardioInNotes(
  notes: string | undefined,
  cardioExercises: ExerciseLog[] | undefined,
): string | undefined {
  const base = userFacingWorkoutNotes(notes) ?? "";
  if (!cardioExercises || cardioExercises.length === 0) {
    return base || undefined;
  }
  const payload = `${base}${base ? "\n" : ""}${CARDIO_META_PREFIX}${JSON.stringify(cardioExercises)}`;
  return payload;
}

export function hydrateCardioFromNotes(log: WorkoutLog): WorkoutLog {
  if (log.cardioExercises && log.cardioExercises.length > 0) {
    return log;
  }
  const fromNotes = parseCardioFromNotes(log.notes);
  if (!fromNotes) return log;
  return {
    ...log,
    cardioExercises: fromNotes,
    notes: userFacingWorkoutNotes(log.notes),
  };
}

/** Strip legacy embedded cardio JSON; cardio persists in exercise_logs (signed in). */
export function workoutLogForPersistence(log: WorkoutLog): WorkoutLog {
  return {
    ...log,
    notes: userFacingWorkoutNotes(log.notes),
  };
}
