import type { ExerciseEquipment } from "@/types";

export const ALL_EXERCISE_EQUIPMENT: ExerciseEquipment[] = [
  "bodyweight",
  "rings",
  "resistance_band",
  "dumbbell",
  "barbell",
  "machine",
  "cable",
  "medicine_ball",
  "plyo_box",
  "stability_ball",
  "pull_up_bar",
];

export const EQUIPMENT_LABELS: Record<ExerciseEquipment, string> = {
  bodyweight: "Bodyweight",
  rings: "Rings",
  resistance_band: "Resistance bands",
  dumbbell: "Dumbbells",
  barbell: "Barbell",
  machine: "Machines",
  cable: "Cables",
  medicine_ball: "Medicine ball",
  plyo_box: "Plyo box / bench",
  stability_ball: "Stability ball / Bosu",
  pull_up_bar: "Pull-up bar",
};

/** Default until the user completes equipment onboarding or changes Settings. */
export const DEFAULT_AVAILABLE_EQUIPMENT: ExerciseEquipment[] = ["bodyweight"];

export function exerciseMatchesEquipment(
  exerciseEquipment: ExerciseEquipment[] | undefined,
  available: ExerciseEquipment[],
): boolean {
  if (!exerciseEquipment || exerciseEquipment.length === 0) return true;
  return exerciseEquipment.some((eq) => available.includes(eq));
}
