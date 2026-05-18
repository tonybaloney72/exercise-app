import { exercises } from "@/data/exercises";
import type { Exercise, ExerciseCategory } from "@/types";
import type { StretchEntry } from "@/types";

export type StretchThemePoolId =
  | "upper"
  | "lower"
  | "core"
  | "conditioning"
  | "general";

const UPPER_TAGS = new Set<ExerciseCategory>(["UP", "UPL"]);
const LOWER_TAGS = new Set<ExerciseCategory>(["LB"]);
const CORE_TAGS = new Set<ExerciseCategory>(["CF", "CL", "CR", "CS"]);
const PC_TAGS = new Set<ExerciseCategory>(["PC"]);

function themePoolForExercise(ex: Exercise): StretchThemePoolId {
  const sec = ex.secondaryCategory;
  if (!sec) return "general";
  if (UPPER_TAGS.has(sec)) return "upper";
  if (LOWER_TAGS.has(sec)) return "lower";
  if (CORE_TAGS.has(sec)) return "core";
  if (PC_TAGS.has(sec)) return "conditioning";
  return "general";
}

function toStretchEntry(ex: Exercise): StretchEntry {
  return { exerciseId: ex.id, targetReps: ex.defaultReps };
}

function buildThemedPools(category: "SW" | "SC"): Record<StretchThemePoolId, StretchEntry[]> {
  const pools: Record<StretchThemePoolId, StretchEntry[]> = {
    upper: [],
    lower: [],
    core: [],
    conditioning: [],
    general: [],
  };

  for (const ex of exercises) {
    if (ex.category !== category) continue;
    pools[themePoolForExercise(ex)].push(toStretchEntry(ex));
  }

  for (const key of Object.keys(pools) as StretchThemePoolId[]) {
    pools[key].sort((a, b) => a.exerciseId.localeCompare(b.exerciseId));
  }

  return pools;
}

/** Full warm-up catalog grouped by training theme (`secondaryCategory`). */
export const WARM_UP_CATALOG_POOLS = buildThemedPools("SW");

/** Full cool-down catalog grouped by training theme (`secondaryCategory`). */
export const COOL_DOWN_CATALOG_POOLS = buildThemedPools("SC");

export function warmUpCatalogPool(id: StretchThemePoolId): readonly StretchEntry[] {
  return WARM_UP_CATALOG_POOLS[id];
}

export function coolDownCatalogPool(id: StretchThemePoolId): readonly StretchEntry[] {
  return COOL_DOWN_CATALOG_POOLS[id];
}
