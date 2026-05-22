import { getReplacementCandidates, type ExpertiseFilter } from "@/lib/exerciseCandidates";
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
  expertiseFilter?: ExpertiseFilter | null;
}): Exercise[] {
  const {
    category,
    plannedExerciseId,
    roundExerciseIds,
    slotIndex,
    availableEquipment,
    dislikedExerciseIds,
    expertiseFilter,
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
    expertiseFilter,
  }).sort((a, b) => a.name.localeCompare(b.name));
}

/** Any category — full pool for add-slot (equipment + dislikes; excludes ids already in round). */
export function getPlanAddCandidates(options: {
  category: ExerciseCategory;
  roundExerciseIds: string[];
  availableEquipment: ExerciseEquipment[];
  dislikedExerciseIds?: ReadonlySet<string>;
  expertiseFilter?: ExpertiseFilter | null;
}): Exercise[] {
  const exclude = new Set(options.roundExerciseIds);
  return getReplacementCandidates({
    category: options.category,
    excludeExerciseIds: exclude,
    availableEquipment: options.availableEquipment,
    dislikedExerciseIds: options.dislikedExerciseIds,
    expertiseFilter: options.expertiseFilter,
  }).sort((a, b) => a.name.localeCompare(b.name));
}
