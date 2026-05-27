import { emphasisGroupForCategory } from "@/lib/trainingPriorities";
import { getExerciseProgression } from "@/lib/progressionFamilies";
import type { ExpertiseByGroup, ExpertiseLevel } from "@/types";

/**
 * Minimum progression step allowed for generated plans / swaps, by per-group cap.
 * Exercises without a progression family are unaffected.
 */
export const MIN_PROGRESSION_STEP_BY_CAP: Record<ExpertiseLevel, number> = {
  beginner: 1,
  novice: 2,
  intermediate: 3,
  advanced: 3,
  expert: 4,
};

export function minProgressionStepForCap(cap: ExpertiseLevel): number {
  return MIN_PROGRESSION_STEP_BY_CAP[cap] ?? 1;
}

/**
 * True when the exercise is not a regression below the user's cap within its family.
 * Unknown categories (stretches) and uncatalogued exercises pass through.
 */
export function exerciseMeetsProgressionMinStep(
  exerciseId: string,
  slotCategory: Parameters<typeof emphasisGroupForCategory>[0],
  byGroup: ExpertiseByGroup,
): boolean {
  const progression = getExerciseProgression(exerciseId);
  if (!progression) return true;

  const group = emphasisGroupForCategory(slotCategory);
  if (!group) return true;

  const minStep = minProgressionStepForCap(byGroup[group]);
  return progression.step >= minStep;
}
