import { exerciseMap } from "@/data/exercises";
import { migrateExerciseId } from "@/lib/cpToPcMigration";

/**
 * Human-readable names for exercise ids removed from the catalog but still
 * referenced in workout history. Add an entry when deleting an exercise.
 */
export const ARCHIVED_EXERCISE_DISPLAY_NAMES: Record<string, string> = {
  "PC-40": "Incline Plyo Push-Up",
  "PC-41": "Clap Push-Up",
};

/** Normalize ids like `pc-41` → `PC-41` for catalog / archive lookup. */
export function normalizeExerciseId(id: string): string {
  const trimmed = id.trim();
  const match = trimmed.match(/^([A-Za-z]+)-(\d+)$/);
  if (match) return `${match[1]!.toUpperCase()}-${match[2]}`;
  return trimmed;
}

/**
 * Resolve a label for UI: live catalog name, archived name, or normalized id.
 */
export function resolveExerciseDisplayName(id: string): string {
  const normalized = normalizeExerciseId(id);
  const migrated = migrateExerciseId(normalized);

  const catalogName =
    exerciseMap[migrated]?.name ?? exerciseMap[normalized]?.name;
  if (catalogName) return catalogName;

  return (
    ARCHIVED_EXERCISE_DISPLAY_NAMES[migrated] ??
    ARCHIVED_EXERCISE_DISPLAY_NAMES[normalized] ??
    normalized
  );
}
