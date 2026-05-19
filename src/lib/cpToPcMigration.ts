import type {
  DayPlan,
  ExerciseCategory,
  ExerciseLog,
  RoundExercise,
  WorkoutLog,
} from "@/types";
import type { TrainingWeekDays } from "@/lib/repos";
import { migrateConsolidatedExerciseId } from "@/lib/exerciseIdConsolidation";

/** Legacy cardio/plyo category code (renamed to {@link PC_CATEGORY}). */
export const LEGACY_CP_CATEGORY = "CP" as const;

/** Plyometric / cardio category code. */
export const PC_CATEGORY = "PC" as const;

const CP_ID_PREFIX = /^CP-(\d+.*)$/;

/** Map legacy `CP-*` exercise ids to `PC-*`. */
export function migrateExerciseId(id: string): string {
  const m = id.match(CP_ID_PREFIX);
  const afterCp = m ? `PC-${m[1]}` : id;
  return migrateConsolidatedExerciseId(afterCp);
}

export function migrateCategory(category: string): ExerciseCategory {
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

/** Normalize persisted or in-flight plans that still use `CP`. */
export function migrateDayPlan(plan: DayPlan): DayPlan {
  return {
    ...plan,
    strengthFocus: plan.strengthFocus.map((c) => migrateCategory(c)),
    coreGroups: plan.coreGroups.map((c) => migrateCategory(c)),
    rounds: plan.rounds.map((round) => ({
      ...round,
      exercises: round.exercises.map(migrateRoundExercise),
    })),
  };
}

export function migrateTrainingWeekDays(days: TrainingWeekDays): TrainingWeekDays {
  const out: TrainingWeekDays = {};
  for (let i = 0; i < 7; i++) {
    const day = days[i];
    if (day) out[i] = migrateDayPlan(day);
  }
  return out;
}

export function migrateExerciseLog(log: ExerciseLog): ExerciseLog {
  return {
    ...log,
    exerciseId: migrateExerciseId(log.exerciseId),
    swappedWith: log.swappedWith
      ? migrateExerciseId(log.swappedWith)
      : undefined,
  };
}

export function migrateWorkoutLog(log: WorkoutLog): WorkoutLog {
  return {
    ...log,
    warmUpExercises: log.warmUpExercises.map(migrateExerciseLog),
    coolDownExercises: log.coolDownExercises.map(migrateExerciseLog),
    rounds: log.rounds.map((round) => ({
      ...round,
      exercises: round.exercises.map(migrateExerciseLog),
    })),
  };
}
