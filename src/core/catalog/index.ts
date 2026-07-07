import type { Exercise, ExerciseCategory } from "@/types";
import { exerciseCategoryById } from "./data/exerciseCategoryIndex";
import { exerciseMap, exercises } from "./data/exercises";

export { CATEGORIES, CATEGORY_ORDER, TRAINING_CATEGORY_ORDER } from "./categories";
export { exerciseCategoryById } from "./data/exerciseCategoryIndex";
export { exerciseMap, exercises } from "./data/exercises";

/** Lookup one exercise by id (includes legacy `CP-*` aliases). */
export function getExercise(exerciseId: string): Exercise | undefined {
  return exerciseMap[exerciseId];
}

/** Full merged catalog list. */
export function listExercises(): readonly Exercise[] {
  return exercises;
}

/** Slim id → category map entry for progress stats and charts. */
export function getExerciseCategory(
  exerciseId: string,
): ExerciseCategory | undefined {
  return exerciseCategoryById[exerciseId];
}
