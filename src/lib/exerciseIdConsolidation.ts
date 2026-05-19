/**
 * Deprecated exercise ids merged into a canonical library entry.
 * Applied on load for logs, plans, prefs, and settings (see migrateExerciseId).
 */

/** @deprecated id → canonical id */
export const CONSOLIDATED_EXERCISE_ID_MAP: Record<string, string> = {
  // A — catalog wins over Hybrid Calisthenics
  "HC-131": "CS-3",
  "HC-178": "CS-5",
  "HC-192": "CF-13",
  "HC-122": "UPL-8",
  "HC-132": "UPL-10",
  "HC-185": "UPL-12",
  "HC-176": "UPL-13",
  "HC-084": "SW-8",
  "HC-241": "CR-4",
  "HC-244": "CR-6",
  "HC-299": "CL-10",
  "HC-263": "LB-7",
  "HC-264": "LB-7",
  // B — duplicate HC rows (keep first of pair)
  "HC-062": "HC-061",
  "HC-077": "HC-076",
  "HC-175": "HC-174",
  "HC-190": "HC-189",
  "HC-228": "HC-227",
  "HC-277": "HC-276",
  "HC-279": "HC-278",
  "HC-282": "HC-281",
  "HC-284": "HC-283",
  "HC-286": "HC-285",
  "HC-288": "HC-287",
  "HC-292": "HC-291",
  "HC-295": "HC-294",
  // C — workout entry wins over stretch duplicate
  "SW-20": "LB-1",
  "SW-25": "PC-1",
  "SW-17": "PC-5",
  // D — glute bridge: keep CS-5
  "SW-15": "CS-5",
};

/** HC ids removed from the merged library (not exported in exerciseMap). */
export const REMOVED_HYBRID_EXERCISE_IDS = new Set<string>([
  "HC-131",
  "HC-178",
  "HC-192",
  "HC-122",
  "HC-132",
  "HC-185",
  "HC-176",
  "HC-084",
  "HC-241",
  "HC-244",
  "HC-299",
  "HC-263",
  "HC-264",
  "HC-062",
  "HC-077",
  "HC-175",
  "HC-190",
  "HC-228",
  "HC-277",
  "HC-279",
  "HC-282",
  "HC-284",
  "HC-286",
  "HC-288",
  "HC-292",
  "HC-295",
]);

/** Catalog stretch ids removed (workout id kept). */
export const REMOVED_CATALOG_STRETCH_IDS = new Set<string>([
  "SW-15",
  "SW-17",
  "SW-20",
  "SW-25",
]);

export function migrateConsolidatedExerciseId(id: string): string {
  let current = id;
  const seen = new Set<string>();
  while (CONSOLIDATED_EXERCISE_ID_MAP[current] && !seen.has(current)) {
    seen.add(current);
    current = CONSOLIDATED_EXERCISE_ID_MAP[current]!;
  }
  return current;
}

export function isRemovedFromLibrary(id: string): boolean {
  return (
    REMOVED_HYBRID_EXERCISE_IDS.has(id) ||
    REMOVED_CATALOG_STRETCH_IDS.has(id)
  );
}
