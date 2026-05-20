import { exercises } from "@/data/exercises";
import {
  ALL_EXERCISE_EQUIPMENT,
  exerciseMatchesEquipment,
} from "@/data/equipment";
import { isEnduranceBlockExerciseId } from "@/lib/enduranceBlockExercises";
import { isDeprecatedExerciseId } from "@/lib/exerciseIdConsolidation";
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
      !isEnduranceBlockExerciseId(ex.id) &&
      !isDeprecatedExerciseId(ex.id) &&
      !excludeExerciseIds.has(ex.id) &&
      !dislikedExerciseIds?.has(ex.id) &&
      exerciseMatchesEquipment(ex.equipment, availableEquipment),
  );
}

/** Mix seed + exercise id so sort order varies by seed (not only by id). */
export function seededCandidateRank(seed: string, exerciseId: string): string {
  let h = 2166136261;
  const s = `${seed}\0${exerciseId}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
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
      const ra = seededCandidateRank(seed, a.id);
      const rb = seededCandidateRank(seed, b.id);
      const byRank = ra.localeCompare(rb);
      if (byRank !== 0) return byRank;
    }
    return a.id.localeCompare(b.id);
  });
  return sorted[0] ?? null;
}

/** @deprecated Use {@link pickReplacementCandidate}. */
export function pickDeterministicReplacement(candidates: Exercise[]): Exercise | null {
  return pickReplacementCandidate(candidates);
}

/**
 * Pick a substitute for a disliked slot: user's equipment first, then any equipment
 * in the same category (still excluding dislikes and round duplicates).
 */
export function pickDislikeReplacement(options: {
  category: ExerciseCategory;
  excludeExerciseIds: ReadonlySet<string>;
  availableEquipment: ExerciseEquipment[];
  dislikedExerciseIds: ReadonlySet<string>;
  favoriteIds?: ReadonlySet<string>;
  seed: string;
}): Exercise | null {
  const {
    category,
    excludeExerciseIds,
    availableEquipment,
    dislikedExerciseIds,
    favoriteIds = new Set(),
    seed,
  } = options;

  const withUserEquipment = getReplacementCandidates({
    category,
    excludeExerciseIds,
    availableEquipment,
    dislikedExerciseIds,
  });
  const pick = pickReplacementCandidate(withUserEquipment, favoriteIds, seed);
  if (pick) return pick;

  const anyEquipment = getReplacementCandidates({
    category,
    excludeExerciseIds,
    availableEquipment: ALL_EXERCISE_EQUIPMENT,
    dislikedExerciseIds,
  });
  return pickReplacementCandidate(anyEquipment, favoriteIds, `${seed}:any`);
}
