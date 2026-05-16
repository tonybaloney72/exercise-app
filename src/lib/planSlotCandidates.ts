import { getReplacementCandidates } from "@/lib/exerciseCandidates";
import { buildRoundExcludeIds } from "@/lib/roundExclude";
import type { Exercise, ExerciseCategory, ExerciseEquipment } from "@/types";

/** Same-category alternatives for customizing a prescribed slot (plan editor). */
export function getPlanSlotCandidates(options: {
  category: ExerciseCategory;
  plannedExerciseId: string;
  roundExerciseIds: string[];
  slotIndex: number;
  availableEquipment: ExerciseEquipment[];
  dislikedExerciseIds?: ReadonlySet<string>;
}): Exercise[] {
  const {
    category,
    plannedExerciseId,
    roundExerciseIds,
    slotIndex,
    availableEquipment,
    dislikedExerciseIds,
  } = options;

  const exclude = buildRoundExcludeIds({
    plannedExerciseId,
    slotIndex,
    slotExerciseIds: roundExerciseIds,
  });

  return getReplacementCandidates({
    category,
    excludeExerciseIds: exclude,
    availableEquipment,
    dislikedExerciseIds,
  }).sort((a, b) => a.name.localeCompare(b.name));
}

/** Any category — full pool for add-slot (equipment + dislikes; excludes ids already in round). */
export function getPlanAddCandidates(options: {
  category: ExerciseCategory;
  roundExerciseIds: string[];
  availableEquipment: ExerciseEquipment[];
  dislikedExerciseIds?: ReadonlySet<string>;
}): Exercise[] {
  const exclude = new Set(options.roundExerciseIds);
  return getReplacementCandidates({
    category: options.category,
    excludeExerciseIds: exclude,
    availableEquipment: options.availableEquipment,
    dislikedExerciseIds: options.dislikedExerciseIds,
  }).sort((a, b) => a.name.localeCompare(b.name));
}
