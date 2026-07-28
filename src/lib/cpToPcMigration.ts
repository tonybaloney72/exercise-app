import type {
  DayPlan,
  ExerciseCategory,
  ExerciseLog,
  RoundExercise,
  WorkoutLog,
} from "@/types";
import type { TrainingWeekDays } from "@/lib/repos";
import {
  CARDIO_KIND_TO_EXERCISE_ID,
  normalizeDayPlanCardio,
} from "@/lib/cardioActivities";
import { hydrateCardioFromNotes } from "@/lib/workoutCardioPersistence";
import { migrateConsolidatedExerciseId } from "@/lib/exerciseIdConsolidation";

/** Legacy cardio/plyo category code (renamed to {@link PC_CATEGORY}). */
const LEGACY_CP_CATEGORY = "CP" as const;

/** Plyometric / cardio category code. */
const PC_CATEGORY = "PC" as const;

const CP_ID_PREFIX = /^CP-(\d+.*)$/;

/** Map legacy `CP-*` exercise ids to `PC-*`. */
export function migrateExerciseId(id: string): string {
  const m = id.match(CP_ID_PREFIX);
  const afterCp = m ? `PC-${m[1]}` : id;
  return migrateConsolidatedExerciseId(afterCp);
}

function migrateCategory(category: string): ExerciseCategory {
  if (category === LEGACY_CP_CATEGORY) return PC_CATEGORY;
  return category as ExerciseCategory;
}

function migrateRoundExercise(slot: RoundExercise): RoundExercise {
  return {
    ...slot,
    exerciseId: migrateExerciseId(slot.exerciseId),
    category: migrateCategory(slot.category),
  };
}

/** Normalize persisted or in-flight plans that still use `CP` or consolidated ids. */
export function migrateDayPlan(plan: DayPlan): DayPlan {
  return normalizeDayPlanCardio({
    ...plan,
    strengthFocus: plan.strengthFocus.map((c) => migrateCategory(c)),
    coreGroups: plan.coreGroups.map((c) => migrateCategory(c)),
    rounds: plan.rounds.map((round) => ({
      ...round,
      exercises: round.exercises.map(migrateRoundExercise),
    })),
    warmUp: plan.warmUp?.map((entry) => ({
      ...entry,
      exerciseId: migrateExerciseId(entry.exerciseId),
    })),
    coolDown: plan.coolDown?.map((entry) => ({
      ...entry,
      exerciseId: migrateExerciseId(entry.exerciseId),
    })),
  });
}

export function migrateTrainingWeekDays(days: TrainingWeekDays): TrainingWeekDays {
  const out: TrainingWeekDays = {};
  for (let i = 0; i < 7; i++) {
    const day = days[i];
    if (day) out[i] = migrateDayPlan(day);
  }
  return out;
}

function migrateExerciseLog(log: ExerciseLog): ExerciseLog {
  return {
    ...log,
    exerciseId: migrateExerciseId(log.exerciseId),
    swappedWith: log.swappedWith
      ? migrateExerciseId(log.swappedWith)
      : undefined,
  };
}

type LegacyWorkoutLog = WorkoutLog & {
  jogCompleted?: boolean;
  jogSkipped?: boolean;
  jogDistance?: number;
  jogDurationSeconds?: number;
};

export function migrateWorkoutLog(log: WorkoutLog): WorkoutLog {
  const legacy = log as LegacyWorkoutLog;
  let cardioExercises = log.cardioExercises?.map(migrateExerciseLog);
  if (
    !cardioExercises?.length &&
    (legacy.jogCompleted ||
      legacy.jogSkipped ||
      legacy.jogDistance != null ||
      legacy.jogDurationSeconds != null)
  ) {
    cardioExercises = [
      {
        exerciseId: CARDIO_KIND_TO_EXERCISE_ID.jog,
        completed: legacy.jogCompleted ?? false,
        skipped: legacy.jogSkipped ?? false,
        actualDistanceMi: legacy.jogDistance,
        actualDuration: legacy.jogDurationSeconds,
      },
    ];
  }
  return hydrateCardioFromNotes({
    id: log.id,
    date: log.date,
    dayOfWeek: log.dayOfWeek,
    cardioExercises,
    warmUpCompleted: log.warmUpCompleted,
    warmUpExercises: log.warmUpExercises.map(migrateExerciseLog),
    coolDownCompleted: log.coolDownCompleted,
    coolDownExercises: log.coolDownExercises.map(migrateExerciseLog),
    rounds: log.rounds.map((round) => ({
      ...round,
      exercises: round.exercises.map(migrateExerciseLog),
    })),
    notes: log.notes,
    startTime: log.startTime,
    endTime: log.endTime,
    paused: log.paused,
  });
}
