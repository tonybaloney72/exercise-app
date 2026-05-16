import { collectDislikedIds, getReplacementCandidates } from "@/lib/planGenerator";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Exercise, ExerciseCategory, ExerciseLog } from "@/types";

/** Effective movement id for this slot (substitute if set, else prescribed). */
export function effectiveExerciseId(log: ExerciseLog): string {
  return log.swappedWith ?? log.exerciseId;
}

/**
 * Same-category alternatives for swapping. Excludes the prescribed exercise for
 * this slot, any exercise already used in the round, and user-disliked exercises.
 */
export function getSwapCandidates(
  planCategory: ExerciseCategory,
  plannedExerciseId: string,
  roundExercises: ExerciseLog[],
  slotIndex: number,
): Exercise[] {
  const usedElsewhere = new Set<string>();
  roundExercises.forEach((e, j) => {
    if (j === slotIndex) return;
    usedElsewhere.add(effectiveExerciseId(e));
  });

  const selfEffective = effectiveExerciseId(roundExercises[slotIndex]!);
  const exclude = new Set<string>([
    plannedExerciseId,
    selfEffective,
    ...usedElsewhere,
  ]);

  const available = useSettingsStore.getState().availableEquipment;
  const disliked = collectDislikedIds(
    useExercisePreferencesStore.getState().byExerciseId,
  );

  return getReplacementCandidates({
    category: planCategory,
    excludeExerciseIds: exclude,
    availableEquipment: available,
    dislikedExerciseIds: disliked,
  });
}

export function pickRandomSwap(candidates: Exercise[]): Exercise | null {
  if (candidates.length === 0) return null;
  const i = Math.floor(Math.random() * candidates.length);
  return candidates[i] ?? null;
}
