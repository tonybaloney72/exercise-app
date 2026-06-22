import { buildCatalogWeek } from "@/data/trainingWeekCatalog";
import { migrateAvailableEquipment } from "@/data/equipment";
import { materializeTrainingWeek } from "@/lib/planGenerator";
import type { ExercisePreferenceMap, TrainingWeekDays } from "@/lib/repos";
import type { DayPlan, WorkoutLog } from "@/types";

/** Fixed variety seed for Phase 4 behavior-contract goldens. Bump intentionally when catalog changes. */
export const GOLDEN_VARIETY_SEED = "golden-phase4-v1";

/** Typical home setup for golden contracts (legacy plyo_box expands to bench + chair). */
export const GOLDEN_EQUIPMENT = migrateAvailableEquipment([
  "bodyweight",
  "plyo_box",
  "pull_up_bar",
  "resistance_band",
]);
export const GOLDEN_EMPTY_PREFS: ExercisePreferenceMap = {};

export function materializeGoldenBalancedWeek(): TrainingWeekDays {
  return materializeTrainingWeek(
    buildCatalogWeek(),
    GOLDEN_EMPTY_PREFS,
    GOLDEN_EQUIPMENT,
    "balanced",
    "standard",
    undefined,
    GOLDEN_VARIETY_SEED,
  );
}

/** Minimal day plan builder for adherence goldens. */
export function dayPlanWithExercises(
  dayOfWeek: number,
  exerciseIds: string[],
): DayPlan {
  return {
    dayOfWeek,
    name: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek]!,
    theme: "Golden test",
    hasJog: false,
    strengthFocus: ["PC"],
    coreGroups: [],
    rounds: [
      {
        roundNumber: 1,
        exercises: exerciseIds.map((exerciseId) => ({
          exerciseId,
          targetReps: "12",
          category: exerciseId.split("-")[0] as DayPlan["strengthFocus"][number],
        })),
      },
    ],
  };
}

export function workoutLogForDate(
  date: string,
  dayOfWeek: number,
  exercises: Array<{
    exerciseId: string;
    completed?: boolean;
    skipped?: boolean;
    swappedWith?: string;
  }>,
): WorkoutLog {
  return {
    id: `log-${date}`,
    date,
    dayOfWeek,
    warmUpCompleted: true,
    warmUpExercises: [],
    coolDownCompleted: true,
    coolDownExercises: [],
    rounds: [
      {
        roundNumber: 1,
        exercises: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          completed: ex.completed ?? true,
          skipped: ex.skipped ?? false,
          ...(ex.swappedWith ? { swappedWith: ex.swappedWith } : {}),
        })),
      },
    ],
    endTime: `${date}T20:00:00.000Z`,
  };
}
