/**
 * Deprecated exercise ids merged into a canonical library entry.
 * Applied on load for logs, plans, prefs, and settings (see migrateExerciseId).
 */

/** @deprecated id → canonical id */
export const CONSOLIDATED_EXERCISE_ID_MAP: Record<string, string> = {
  // A - catalog wins over Hybrid Calisthenics
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
  // B - duplicate HC rows (keep first of pair)
  "HC-083": "HC-143", // Bent-over Dumbbell Row → Dumbbell Bent-Over Row
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
  // C - workout entry wins over stretch duplicate
  "SW-20": "LB-1",
  "SW-25": "PC-1",
  "SW-17": "PC-5",
  // D - glute bridge: keep CS-5
  "SW-15": "CS-5",
  // F - duplicate in-place bounce (keep Hops on the Spot)
  "SW-40": "SW-33",
  // G - duplicate bird dog (keep Bird-Dog)
  "SW-51": "SW-8",
  // H - strict duplicates of workout entries (keep CS-3 / PC-1)
  "SW-52": "CS-3",
  "SW-44": "PC-1",
  // E - duplicate mountain climber variants
  "PC-3": "CR-10",
  // P3 - catalog hygiene (May 2026)
  "SC-20": "SC-15",
  "SC-28": "SC-8",
  "HC-243": "SW-10",
  // P3 - dedupe / consolidate (May 2026)
  "PC-25": "PC-22",
  "HC-137": "SC-23",
  // P3 - stretch/workout duplicates (May 2026)
  "HC-216": "SW-23",
  "HC-186": "SW-48",
  "HC-139": "UP-5",
  "PC-12": "PC-31",
  // Duplicate heel taps (keep Alternate Heel Touches)
  "CR-7": "CR-8",
  // Pure load variants → canonical movement (Jul 2026)
  "HC-030": "HC-082", // Band Resisted Bent Knee Calf Raise
  "HC-142": "HC-082", // Dumbbell Bent Knee Calf Raise
  "HC-061": "HC-082", // Barbell Bent Knee Calf Raise
  "HC-109": "HC-082", // Cable Resisted Bent Knee Calf Raise
  "HC-062": "HC-082", // was HC-061 duplicate
  "HC-040": "HC-261", // Band Resisted Straight Leg Calf Raise
  "HC-165": "HC-261", // Dumbbell Straight Leg Calf Raise
  "HC-076": "HC-261", // Barbell Straight Leg Calf Raise
  "HC-110": "HC-261", // Cable Resisted Straight Leg Calf Raise
  "HC-077": "HC-261", // was HC-076 duplicate
  "HC-038": "HC-257", // Band Resisted Split Squat
  "HC-164": "HC-257", // Dumbbell Split Squat
  "HC-294": "HC-257", // Weighted Split Squat
  "HC-075": "HC-257", // Barbell Split Squat
  "HC-295": "HC-257", // was HC-294 duplicate
  "LB-15": "LB-4", // Weighted Bulgarian Split Squat
  "HC-289": "LB-2", // Weighted Forward Lunge
  "LB-13": "LB-10", // Weighted Walking Lunge
  "LB-14": "LB-11", // Weighted Lateral Lunge
  "LB-16": "LB-8", // Weighted Step-Up
  "LB-17": "LB-7", // Weighted Sumo Squat
  "HC-056": "HC-072", // Band-resisted Romanian Deadlift
  "HC-159": "HC-072", // Dumbbell Romanian Deadlift
  "HC-296": "LB-7", // Barbell Sumo Squat
  "HC-290": "CR-4", // Weighted Russian Twist
};

/** Ids that redirect to a canonical entry; excluded from generator / swap pools. */
export function isDeprecatedExerciseId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(CONSOLIDATED_EXERCISE_ID_MAP, id);
}

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
  "HC-083",
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
  "HC-243",
  "HC-137",
  "HC-216",
  "HC-186",
  "HC-139",
  // Pure load variants (Jul 2026)
  "HC-030",
  "HC-038",
  "HC-040",
  "HC-056",
  "HC-061",
  "HC-075",
  "HC-076",
  "HC-109",
  "HC-110",
  "HC-142",
  "HC-159",
  "HC-164",
  "HC-165",
  "HC-289",
  "HC-294",
  "HC-296",
  "HC-290",
]);

/** Main-catalog strength ids removed after load-variant merge or consolidation. */
export const REMOVED_CATALOG_EXERCISE_IDS = new Set<string>([
  "LB-13",
  "LB-14",
  "LB-15",
  "LB-16",
  "LB-17",
  "PC-12", // Two-Footed Broad Jump → PC-31 Double Leg Bound
]);

/** Catalog stretch ids removed (workout id kept). */
export const REMOVED_CATALOG_STRETCH_IDS = new Set<string>([
  "SW-15",
  "SW-17",
  "SW-20",
  "SW-25",
  "SW-40",
  "SW-51",
  "SW-52",
  "SW-44",
  "SC-20",
  "SC-28",
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

function isRemovedFromLibrary(id: string): boolean {
  return (
    REMOVED_HYBRID_EXERCISE_IDS.has(id) ||
    REMOVED_CATALOG_STRETCH_IDS.has(id) ||
    REMOVED_CATALOG_EXERCISE_IDS.has(id)
  );
}
