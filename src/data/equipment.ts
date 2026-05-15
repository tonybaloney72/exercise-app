import type { ExerciseEquipment } from "@/types";

export const ALL_EXERCISE_EQUIPMENT: ExerciseEquipment[] = [
  "bodyweight",
  "rings",
  "resistance_band",
  "dumbbell",
  "barbell",
  "machine",
  "cable",
];

export const EQUIPMENT_LABELS: Record<ExerciseEquipment, string> = {
  bodyweight: "Bodyweight",
  rings: "Rings",
  resistance_band: "Resistance bands",
  dumbbell: "Dumbbells",
  barbell: "Barbell",
  machine: "Machines",
  cable: "Cables",
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
