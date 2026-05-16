import { collectDislikedIds, getReplacementCandidates } from "@/lib/exerciseCandidates";
import type {
  Exercise,
  ExerciseCategory,
  ExerciseEquipment,
  ExerciseLog,
} from "@/types";

/** Effective movement id for this slot (substitute if set, else prescribed). */
export function effectiveExerciseId(log: ExerciseLog): string {
  return log.swappedWith ?? log.exerciseId;
}

export type SwapCandidatePrefs = {
  availableEquipment: ExerciseEquipment[];
  dislikedExerciseIds: ReadonlySet<string>;
};

/**
 * Same-category alternatives for swapping. Excludes the prescribed exercise for
 * this slot, any exercise already used in the round, and user-disliked exercises.
 */
export function getSwapCandidates(
  planCategory: ExerciseCategory,
  plannedExerciseId: string,
  roundExercises: ExerciseLog[],
  slotIndex: number,
  prefs: SwapCandidatePrefs,
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

  return getReplacementCandidates({
    category: planCategory,
    excludeExerciseIds: exclude,
    availableEquipment: prefs.availableEquipment,
    dislikedExerciseIds: prefs.dislikedExerciseIds,
  });
}

export function pickRandomSwap(candidates: Exercise[]): Exercise | null {
  if (candidates.length === 0) return null;
  const i = Math.floor(Math.random() * candidates.length);
  return candidates[i] ?? null;
}

/** Read equipment + dislikes from Zustand at call time (live workout / swap UI). */
export function swapCandidatePrefsFromStores(
  getEquipment: () => ExerciseEquipment[],
  getPreferenceMap: () => Parameters<typeof collectDislikedIds>[0],
): SwapCandidatePrefs {
  return {
    availableEquipment: getEquipment(),
    dislikedExerciseIds: collectDislikedIds(getPreferenceMap()),
  };
}
