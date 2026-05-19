import {
  CARDIO_KIND_TO_EXERCISE_ID,
  CARDIO_ACTIVITY_ORDER,
} from "@/lib/cardioActivities";
import { hydrateCardioFromNotes } from "@/lib/workoutCardioPersistence";
import type { ExerciseLog, WorkoutLog } from "@/types";

const ENDURANCE_EXERCISE_IDS = new Set<string>(
  Object.values(CARDIO_KIND_TO_EXERCISE_ID),
);

export function isEnduranceExerciseId(exerciseId: string): boolean {
  return ENDURANCE_EXERCISE_IDS.has(exerciseId);
}

/** Legacy localStorage / pre-migration payloads may still carry jog_* fields. */
type WorkoutLogWithLegacyJog = WorkoutLog & {
  jogCompleted?: boolean;
  jogSkipped?: boolean;
  jogDistance?: number;
  jogDurationSeconds?: number;
};

function cardioFromLegacyJog(log: WorkoutLogWithLegacyJog): ExerciseLog[] | undefined {
  if (
    !log.jogCompleted &&
    !log.jogSkipped &&
    log.jogDistance == null &&
    log.jogDurationSeconds == null
  ) {
    return undefined;
  }
  return [
    {
      exerciseId: CARDIO_KIND_TO_EXERCISE_ID.jog,
      completed: log.jogCompleted ?? false,
      skipped: log.jogSkipped ?? false,
      actualDistanceMi: log.jogDistance,
      actualDuration: log.jogDurationSeconds,
    },
  ];
}

/** Canonical cardio rows for a workout (DB rows, array, notes JSON, or legacy jog). */
export function resolveWorkoutCardioExercises(log: WorkoutLog): ExerciseLog[] {
  const hydrated = hydrateCardioFromNotes(log);
  if (hydrated.cardioExercises && hydrated.cardioExercises.length > 0) {
    return hydrated.cardioExercises;
  }
  const legacy = cardioFromLegacyJog(log as WorkoutLogWithLegacyJog);
  return legacy ?? [];
}

export function ensureCardioExercises(log: WorkoutLog): ExerciseLog[] {
  return resolveWorkoutCardioExercises(log);
}

export type CardioMilesTotal = { totalMiles: number; sessionCount: number };

/** Sum logged miles per endurance exercise id across workout history. */
export function buildCardioMilesTotals(
  history: WorkoutLog[],
): Record<string, CardioMilesTotal> {
  const totals: Record<string, CardioMilesTotal> = {};
  for (const id of Object.values(CARDIO_KIND_TO_EXERCISE_ID)) {
    totals[id] = { totalMiles: 0, sessionCount: 0 };
  }

  for (const workout of history) {
    for (const row of resolveWorkoutCardioExercises(workout)) {
      if (!ENDURANCE_EXERCISE_IDS.has(row.exerciseId)) continue;
      if (row.skipped || !row.completed) continue;
      const bucket = totals[row.exerciseId]!;
      bucket.sessionCount += 1;
      if (row.actualDistanceMi != null && row.actualDistanceMi > 0) {
        bucket.totalMiles += row.actualDistanceMi;
      }
    }
  }

  return totals;
}

export function formatCardioRecentLine(log: WorkoutLog): string | null {
  const parts: string[] = [];
  for (const kind of CARDIO_ACTIVITY_ORDER) {
    const id = CARDIO_KIND_TO_EXERCISE_ID[kind];
    const row = resolveWorkoutCardioExercises(log).find((r) => r.exerciseId === id);
    if (!row?.completed || row.skipped) continue;
    const dist =
      row.actualDistanceMi != null ? `${row.actualDistanceMi}mi` : null;
    const label = kind;
    parts.push(dist ? `${dist} ${label}` : label);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
