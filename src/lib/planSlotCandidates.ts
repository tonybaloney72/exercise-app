import { getReplacementCandidates } from "@/lib/exerciseCandidates";
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

  const usedElsewhere = new Set<string>();
  roundExerciseIds.forEach((id, j) => {
    if (j === slotIndex) return;
    usedElsewhere.add(id);
  });

  const exclude = new Set<string>([plannedExerciseId, ...usedElsewhere]);

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
