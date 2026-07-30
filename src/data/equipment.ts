import type { ExerciseEquipment } from "@/types";

export const ALL_EXERCISE_EQUIPMENT: ExerciseEquipment[] = [
  "bodyweight",
  "rings",
  "resistance_band",
  "dumbbell",
  "kettlebell",
  "barbell",
  "machine",
  "cable",
  "medicine_ball",
  "bench",
  "plyo_box",
  "sturdy_chair",
  "stability_ball",
  "pull_up_bar",
  "bicycle",
  "indoor_bike",
  "treadmill",
  "elliptical",
  "rowing_machine",
  "stair_climber",
];

export const EQUIPMENT_LABELS: Record<ExerciseEquipment, string> = {
  bodyweight: "Bodyweight",
  rings: "Rings",
  resistance_band: "Resistance bands",
  dumbbell: "Dumbbells",
  kettlebell: "Kettlebell",
  barbell: "Barbell",
  machine: "Machines",
  cable: "Cables",
  medicine_ball: "Medicine ball",
  bench: "Bench",
  plyo_box: "Plyo box",
  sturdy_chair: "Sturdy chair",
  stability_ball: "Stability ball / Bosu",
  pull_up_bar: "Pull-up bar",
  bicycle: "Bicycle",
  indoor_bike: "Indoor / stationary bike",
  treadmill: "Treadmill",
  elliptical: "Elliptical",
  rowing_machine: "Rowing machine",
  stair_climber: "Stairs / stepper",
};

/** Default until the user completes equipment onboarding or changes Settings. */
export const DEFAULT_AVAILABLE_EQUIPMENT: ExerciseEquipment[] = ["bodyweight"];

/**
 * Equipment roles for matching. Within a role, any listed option is enough;
 * across roles that appear on an exercise, the user must satisfy every role
 * (e.g. dumbbell + bench requires both a load implement and a bench/surface).
 */
const EQUIPMENT_ROLE: Record<ExerciseEquipment, "load" | "surface" | "hang"> = {
  bodyweight: "load",
  resistance_band: "load",
  dumbbell: "load",
  kettlebell: "load",
  barbell: "load",
  machine: "load",
  cable: "load",
  medicine_ball: "load",
  bicycle: "load",
  indoor_bike: "load",
  treadmill: "load",
  elliptical: "load",
  rowing_machine: "load",
  stair_climber: "load",
  bench: "surface",
  plyo_box: "surface",
  sturdy_chair: "surface",
  stability_ball: "surface",
  pull_up_bar: "hang",
  rings: "hang",
};

const LEGACY_EQUIPMENT_ALIASES: Record<string, ExerciseEquipment[]> = {
  outdoor_bicycle: ["bicycle"],
};

/**
 * The old settings checkbox stored one `plyo_box` value for bench, box, and chair.
 * Expand on load so existing users keep the same exercise availability.
 */
function expandLegacyPlyoBoxSelection(
  equipment: Set<ExerciseEquipment>,
): void {
  if (equipment.has("plyo_box")) {
    equipment.add("bench");
    equipment.add("sturdy_chair");
  }
}

export function migrateAvailableEquipment(
  raw: ExerciseEquipment[] | undefined,
): ExerciseEquipment[] {
  if (!raw?.length) return [...DEFAULT_AVAILABLE_EQUIPMENT];

  const out = new Set<ExerciseEquipment>();
  for (const item of raw) {
    const legacy = LEGACY_EQUIPMENT_ALIASES[item as string];
    if (legacy) {
      for (const eq of legacy) out.add(eq);
      continue;
    }
    if (ALL_EXERCISE_EQUIPMENT.includes(item)) out.add(item);
  }
  expandLegacyPlyoBoxSelection(out);
  return [...out];
}

export function exerciseMatchesEquipment(
  exerciseEquipment: ExerciseEquipment[] | undefined,
  available: ExerciseEquipment[],
): boolean {
  if (!exerciseEquipment || exerciseEquipment.length === 0) return true;

  const byRole: Record<"load" | "surface" | "hang", ExerciseEquipment[]> = {
    load: [],
    surface: [],
    hang: [],
  };
  for (const eq of exerciseEquipment) {
    byRole[EQUIPMENT_ROLE[eq]].push(eq);
  }

  const availableSet = new Set(available);
  for (const role of ["load", "surface", "hang"] as const) {
    const needed = byRole[role];
    if (needed.length === 0) continue;
    if (!needed.some((eq) => availableSet.has(eq))) return false;
  }
  return true;
}
