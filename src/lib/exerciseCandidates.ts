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

/** Deterministic pick for persisted plans (stable across devices once saved). */
export function pickDeterministicReplacement(candidates: Exercise[]): Exercise | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[0] ?? null;
}
