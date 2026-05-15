import { exercises } from "@/data/exercises";
import { exerciseMatchesEquipment } from "@/data/equipment";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { Exercise, ExerciseCategory, ExerciseLog } from "@/types";

/** Effective movement id for this slot (substitute if set, else prescribed). */
export function effectiveExerciseId(log: ExerciseLog): string {
  return log.swappedWith ?? log.exerciseId;
}

/**
 * Same-category alternatives for swapping. Excludes the prescribed exercise for
 * this slot and any exercise already used as the effective id in another slot
 * of the same round.
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
  const available = useSettingsStore.getState().availableEquipment;

  return exercises.filter(
    (ex) =>
      ex.category === planCategory &&
      ex.id !== plannedExerciseId &&
      ex.id !== selfEffective &&
      !usedElsewhere.has(ex.id) &&
      exerciseMatchesEquipment(ex.equipment, available),
  );
}

export function pickRandomSwap(candidates: Exercise[]): Exercise | null {
  if (candidates.length === 0) return null;
  const i = Math.floor(Math.random() * candidates.length);
  return candidates[i] ?? null;
}
