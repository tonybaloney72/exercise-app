import {
  collectFavoriteIds,
  getReplacementCandidates,
  seededCandidateRank,
} from "@/lib/exerciseCandidates";
import type { ExercisePreferenceMap } from "@/lib/repos";
import type { Exercise, ExerciseCategory, ExerciseEquipment } from "@/types";

/** Warm-up (SW) or cool-down (SC) catalog entries for stretch editor pickers. */
export function getStretchCandidates(options: {
  category: "SW" | "SC";
  usedExerciseIds: ReadonlySet<string>;
  availableEquipment: ExerciseEquipment[];
  dislikedExerciseIds?: ReadonlySet<string>;
  exercisePreferences?: ExercisePreferenceMap;
}): Exercise[] {
  const {
    category,
    usedExerciseIds,
    availableEquipment,
    dislikedExerciseIds,
    exercisePreferences,
  } = options;
  const favoriteIds = exercisePreferences
    ? collectFavoriteIds(exercisePreferences)
    : new Set<string>();
  const seed = `stretch-picker:${category}`;
  return getReplacementCandidates({
    category: category as ExerciseCategory,
    excludeExerciseIds: usedExerciseIds,
    availableEquipment,
    dislikedExerciseIds,
  }).sort((a, b) => {
    const favA = favoriteIds.has(a.id) ? 0 : 1;
    const favB = favoriteIds.has(b.id) ? 0 : 1;
    if (favA !== favB) return favA - favB;
    const byName = a.name.localeCompare(b.name);
    if (byName !== 0) return byName;
    return seededCandidateRank(seed, a.id).localeCompare(
      seededCandidateRank(seed, b.id),
    );
  });
}
