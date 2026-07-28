import {
  getStretchCandidates,
  type StretchPickerSection,
} from "@/lib/planStretchCandidates";
import type { Exercise, ExerciseEquipment } from "@/types";

/** Cool-down or warm-up replacements during a live workout. */
export function getStretchSwapCandidates(options: {
  section: StretchPickerSection;
  currentExerciseId: string;
  usedExerciseIds: ReadonlySet<string>;
  availableEquipment: ExerciseEquipment[];
  dislikedExerciseIds?: ReadonlySet<string>;
}): Exercise[] {
  const {
    section,
    currentExerciseId,
    usedExerciseIds,
    availableEquipment,
    dislikedExerciseIds,
  } = options;
  const exclude = new Set(usedExerciseIds);
  exclude.add(currentExerciseId);
  return getStretchCandidates({
    section,
    usedExerciseIds: exclude,
    availableEquipment,
    dislikedExerciseIds,
  });
}
