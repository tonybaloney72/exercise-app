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
  "plyo_box",
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
  plyo_box: "Bench / box / sturdy chair or couch",
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

const LEGACY_EQUIPMENT_ALIASES: Record<string, ExerciseEquipment[]> = {
  outdoor_bicycle: ["bicycle"],
};

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
  return [...out];
}

export function exerciseMatchesEquipment(
  exerciseEquipment: ExerciseEquipment[] | undefined,
  available: ExerciseEquipment[],
): boolean {
  if (!exerciseEquipment || exerciseEquipment.length === 0) return true;
  return exerciseEquipment.some((eq) => available.includes(eq));
}
