import { exercises } from "@/core/catalog";
import { exerciseMatchesEquipment } from "@/data/equipment";
import {
  collectFavoriteIds,
  getReplacementCandidates,
  seededCandidateRank,
} from "@/lib/exerciseCandidates";
import { isDeprecatedExerciseId } from "@/lib/exerciseIdConsolidation";
import { isEnduranceBlockExerciseId } from "@/lib/enduranceBlockExercises";
import { isWarmSessionStretchId } from "@/lib/stretchCatalogPools";
import type { ExercisePreferenceMap } from "@/lib/repos";
import type { Exercise, ExerciseEquipment } from "@/types";

export type StretchPickerSection = "warmUp" | "coolDown";

function sortStretchCandidates(
  list: Exercise[],
  seed: string,
  favoriteIds: ReadonlySet<string>,
): Exercise[] {
  return [...list].sort((a, b) => {
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

/**
 * Stretch catalog entries for add/swap pickers.
 * Warm-up matches the generator session pool (SW + SC + workout crossovers).
 * Cool-down stays SC-only.
 */
export function getStretchCandidates(options: {
  section: StretchPickerSection;
  usedExerciseIds: ReadonlySet<string>;
  availableEquipment: ExerciseEquipment[];
  dislikedExerciseIds?: ReadonlySet<string>;
  exercisePreferences?: ExercisePreferenceMap;
}): Exercise[] {
  const {
    section,
    usedExerciseIds,
    availableEquipment,
    dislikedExerciseIds,
    exercisePreferences,
  } = options;
  const favoriteIds = exercisePreferences
    ? collectFavoriteIds(exercisePreferences)
    : new Set<string>();
  const seed = `stretch-picker:${section}`;

  if (section === "coolDown") {
    return sortStretchCandidates(
      getReplacementCandidates({
        category: "SC",
        excludeExerciseIds: usedExerciseIds,
        availableEquipment,
        dislikedExerciseIds,
      }),
      seed,
      favoriteIds,
    );
  }

  const warmPool = exercises.filter(
    (ex) =>
      isWarmSessionStretchId(ex.id) &&
      !isEnduranceBlockExerciseId(ex.id) &&
      !isDeprecatedExerciseId(ex.id) &&
      !usedExerciseIds.has(ex.id) &&
      !dislikedExerciseIds?.has(ex.id) &&
      exerciseMatchesEquipment(ex.equipment, availableEquipment),
  );

  return sortStretchCandidates(warmPool, seed, favoriteIds);
}
