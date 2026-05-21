import { getStretchCandidates } from "@/lib/planStretchCandidates";
import type { Exercise, ExerciseEquipment } from "@/types";

/** Cool-down (SC) or warm-up (SW) replacements during a live workout. */
export function getStretchSwapCandidates(options: {
  category: "SW" | "SC";
  currentExerciseId: string;
  usedExerciseIds: ReadonlySet<string>;
  availableEquipment: ExerciseEquipment[];
  dislikedExerciseIds?: ReadonlySet<string>;
}): Exercise[] {
  const { category, currentExerciseId, usedExerciseIds, availableEquipment, dislikedExerciseIds } =
    options;
  const exclude = new Set(usedExerciseIds);
  exclude.add(currentExerciseId);
  return getStretchCandidates({
    category,
    usedExerciseIds: exclude,
    availableEquipment,
    dislikedExerciseIds,
  });
}
