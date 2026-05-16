import { exercises } from "@/data/exercises";
import { exerciseMatchesEquipment } from "@/data/equipment";
import type { ExercisePreferenceMap } from "@/lib/repos";
import type { Exercise, ExerciseCategory, ExerciseEquipment } from "@/types";

export function collectDislikedIds(prefs: ExercisePreferenceMap): Set<string> {
  const out = new Set<string>();
  for (const [id, kind] of Object.entries(prefs)) {
    if (kind === "disliked") out.add(id);
  }
  return out;
}

export function collectFavoriteIds(prefs: ExercisePreferenceMap): Set<string> {
  const out = new Set<string>();
  for (const [id, kind] of Object.entries(prefs)) {
    if (kind === "favorite") out.add(id);
  }
  return out;
}

/**
 * Same-category replacements for plan materialization and swap UI.
 * Excludes prescribed id, ids already used in the round, and disliked catalog entries.
 */
export function getReplacementCandidates(options: {
  category: ExerciseCategory;
  excludeExerciseIds: ReadonlySet<string>;
  availableEquipment: ExerciseEquipment[];
  dislikedExerciseIds?: ReadonlySet<string>;
}): Exercise[] {
  const { category, excludeExerciseIds, availableEquipment, dislikedExerciseIds } =
    options;

  return exercises.filter(
    (ex) =>
      ex.category === category &&
      !excludeExerciseIds.has(ex.id) &&
      !dislikedExerciseIds?.has(ex.id) &&
      exerciseMatchesEquipment(ex.equipment, availableEquipment),
  );
}

/**
 * Deterministic pick for persisted plans (stable across devices once saved).
 * Favorites in the candidate list sort ahead; optional seed breaks ties within each tier.
 */
export function pickReplacementCandidate(
  candidates: Exercise[],
  favoriteIds: ReadonlySet<string> = new Set(),
  seed?: string,
): Exercise | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => {
    const favA = favoriteIds.has(a.id) ? 0 : 1;
    const favB = favoriteIds.has(b.id) ? 0 : 1;
    if (favA !== favB) return favA - favB;
    if (seed) {
      return `${seed}:${a.id}`.localeCompare(`${seed}:${b.id}`);
    }
    return a.id.localeCompare(b.id);
  });
  return sorted[0] ?? null;
}

/** @deprecated Use {@link pickReplacementCandidate}. */
export function pickDeterministicReplacement(candidates: Exercise[]): Exercise | null {
  return pickReplacementCandidate(candidates);
}
