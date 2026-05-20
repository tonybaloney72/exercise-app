import { exercises } from "@/data/exercises";
import type { Exercise, ExerciseCategory } from "@/types";
import type { StretchEntry } from "@/types";

export type StretchThemePoolId =
  | "upper"
  | "lower"
  | "core"
  | "conditioning";

const UPPER_TAGS = new Set<ExerciseCategory>(["UP", "UPL"]);
const LOWER_TAGS = new Set<ExerciseCategory>(["LB"]);
const CORE_TAGS = new Set<ExerciseCategory>(["CF", "CL", "CR", "CS"]);
const PC_TAGS = new Set<ExerciseCategory>(["PC"]);

export function themePoolForStretch(ex: Exercise): StretchThemePoolId {
  const sec = ex.secondaryCategory;
  if (!sec) {
    throw new Error(
      `Stretch ${ex.id} (${ex.name}) must set secondaryCategory for themed pools`,
    );
  }
  if (UPPER_TAGS.has(sec)) return "upper";
  if (LOWER_TAGS.has(sec)) return "lower";
  if (CORE_TAGS.has(sec)) return "core";
  if (PC_TAGS.has(sec)) return "conditioning";
  throw new Error(
    `Stretch ${ex.id}: unsupported secondaryCategory "${sec}"`,
  );
}

function toStretchEntry(ex: Exercise): StretchEntry {
  return { exerciseId: ex.id, targetReps: ex.defaultReps };
}

/** Workout ids that also appear in warm-up themed pools (no duplicate SW row). */
const WORKOUT_WARM_CROSSOVER_IDS = ["CS-3", "PC-1"] as const;

function buildThemedPools(category: "SW" | "SC"): Record<StretchThemePoolId, StretchEntry[]> {
  const pools: Record<StretchThemePoolId, StretchEntry[]> = {
    upper: [],
    lower: [],
    core: [],
    conditioning: [],
  };

  for (const ex of exercises) {
    if (ex.category !== category) continue;
    pools[themePoolForStretch(ex)].push(toStretchEntry(ex));
  }

  for (const key of Object.keys(pools) as StretchThemePoolId[]) {
    pools[key].sort((a, b) => a.exerciseId.localeCompare(b.exerciseId));
  }

  return pools;
}

function buildWorkoutWarmCrossoverPools(): Record<
  StretchThemePoolId,
  StretchEntry[]
> {
  const pools: Record<StretchThemePoolId, StretchEntry[]> = {
    upper: [],
    lower: [],
    core: [],
    conditioning: [],
  };

  for (const ex of exercises) {
    if (
      !(WORKOUT_WARM_CROSSOVER_IDS as readonly string[]).includes(ex.id) ||
      !ex.secondaryCategory
    ) {
      continue;
    }
    pools[themePoolForStretch(ex)].push(toStretchEntry(ex));
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

function mergeThemedPools(
  a: Record<StretchThemePoolId, StretchEntry[]>,
  b: Record<StretchThemePoolId, StretchEntry[]>,
): Record<StretchThemePoolId, StretchEntry[]> {
  const merged: Record<StretchThemePoolId, StretchEntry[]> = {
    upper: [],
    lower: [],
    core: [],
    conditioning: [],
  };
  for (const key of Object.keys(merged) as StretchThemePoolId[]) {
    const byId = new Map<string, StretchEntry>();
    for (const entry of [...a[key], ...b[key]]) {
      byId.set(entry.exerciseId, entry);
    }
    merged[key] = [...byId.values()].sort((x, y) =>
      x.exerciseId.localeCompare(y.exerciseId),
    );
  }
  return merged;
}

/** SW + SC + workout crossovers per theme — session warm-up picks. */
export const WARM_SESSION_CATALOG_POOLS = mergeThemedPools(
  mergeThemedPools(WARM_UP_CATALOG_POOLS, COOL_DOWN_CATALOG_POOLS),
  buildWorkoutWarmCrossoverPools(),
);

export function warmUpCatalogPool(id: StretchThemePoolId): readonly StretchEntry[] {
  return WARM_UP_CATALOG_POOLS[id];
}

/** Warm-up pool: dynamic (SW) and static (SC) stretches for the day's theme. */
export function warmSessionCatalogPool(
  id: StretchThemePoolId,
): readonly StretchEntry[] {
  return WARM_SESSION_CATALOG_POOLS[id];
}

export function coolDownCatalogPool(id: StretchThemePoolId): readonly StretchEntry[] {
  return COOL_DOWN_CATALOG_POOLS[id];
}
