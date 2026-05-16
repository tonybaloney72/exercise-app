import { getReplacementCandidates } from "@/lib/exerciseCandidates";
import type { Exercise, ExerciseCategory, ExerciseEquipment } from "@/types";

/** Warm-up (SW) or cool-down (SC) catalog entries for stretch editor pickers. */
export function getStretchCandidates(options: {
  category: "SW" | "SC";
  usedExerciseIds: ReadonlySet<string>;
  availableEquipment: ExerciseEquipment[];
  dislikedExerciseIds?: ReadonlySet<string>;
}): Exercise[] {
  const { category, usedExerciseIds, availableEquipment, dislikedExerciseIds } = options;
  return getReplacementCandidates({
    category: category as ExerciseCategory,
    excludeExerciseIds: usedExerciseIds,
    availableEquipment,
    dislikedExerciseIds,
  }).sort((a, b) => a.name.localeCompare(b.name));
}
