import { exerciseMap } from "@/data/exercises";
import { CARDIO_KIND_TO_EXERCISE_ID } from "@/lib/cardioActivities";
import type {
  CardioActivity,
  CardioActivityKind,
  DayPlan,
  ExerciseCategory,
  ExerciseLog,
  StretchEntry,
  WorkoutLog,
} from "@/types";

const CARDIO_ID_TO_KIND = Object.fromEntries(
  Object.entries(CARDIO_KIND_TO_EXERCISE_ID).map(([k, id]) => [id, k as CardioActivityKind]),
) as Record<string, CardioActivityKind>;

export function isCompletedWorkoutLog(log: WorkoutLog | null | undefined): boolean {
  return log?.endTime != null;
}

export function stretchEntriesFromLogs(logs: ExerciseLog[]): StretchEntry[] {
  return logs.map((ex) => ({
    exerciseId: ex.exerciseId,
    targetReps: ex.targetPrescription ?? "",
  }));
}

/** Plan shape for `WorkoutSession` when editing a finished log (slots match stored logs). */
/** Minimal prescribed plan reconstructed from a saved log (history / edit). */
export function planFromWorkoutLog(log: WorkoutLog): DayPlan {
  const template: DayPlan = {
    dayOfWeek: log.dayOfWeek,
    name: "Workout",
    strengthFocus: [],
    coreGroups: [],
    hasJog: false,
    rounds: [],
  };
  return sessionPlanForWorkoutEdit(log, template);
}

export function sessionPlanForWorkoutEdit(
  log: WorkoutLog,
  template: DayPlan,
): DayPlan {
  const cardioActivities: CardioActivity[] = [];
  for (const row of log.cardioExercises ?? []) {
    const kind = CARDIO_ID_TO_KIND[row.exerciseId];
    if (!kind) continue;
    cardioActivities.push({
      kind,
      exerciseId: row.exerciseId,
    });
  }

  return {
    ...template,
    hasJog: cardioActivities.some((c) => c.kind === "jog"),
    cardioActivities,
    warmUp: stretchEntriesFromLogs(log.warmUpExercises),
    coolDown: stretchEntriesFromLogs(log.coolDownExercises),
    rounds: log.rounds.map((roundLog) => ({
      roundNumber: roundLog.roundNumber,
      exercises: roundLog.exercises.map((ex) => {
        const meta = exerciseMap[ex.exerciseId];
        return {
          exerciseId: ex.exerciseId,
          targetReps: ex.targetPrescription ?? meta?.defaultReps ?? "",
          category: (meta?.category ?? "CB") as ExerciseCategory,
        };
      }),
    })),
  };
}
