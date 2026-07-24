import type { Exercise, ExerciseEquipment, WeightInventoryKind } from "@/types";
import { normalizeWeightLb } from "@/lib/weightInventory";

/** Equipment that can carry a logged working weight. */
const LOADABLE_EQUIPMENT = new Set<ExerciseEquipment>([
  "dumbbell",
  "kettlebell",
  "barbell",
  "medicine_ball",
  "machine",
  "cable",
]);

/** Inventory-backed kinds (discrete owned sizes). */
const INVENTORY_KIND_PRIORITY: WeightInventoryKind[] = [
  "dumbbell",
  "kettlebell",
  "barbell",
  "medicine_ball",
];

export function exerciseSupportsLoad(
  equipment: ExerciseEquipment[] | undefined,
): boolean {
  if (!equipment?.length) return false;
  return equipment.some((e) => LOADABLE_EQUIPMENT.has(e));
}

export function exerciseSupportsLoadMeta(
  exercise: Pick<Exercise, "equipment"> | undefined | null,
): boolean {
  return exerciseSupportsLoad(exercise?.equipment);
}

/** Prefer the first inventory kind present on the exercise. */
export function inventoryKindForExercise(
  equipment: ExerciseEquipment[] | undefined,
): WeightInventoryKind | null {
  if (!equipment?.length) return null;
  const set = new Set(equipment);
  for (const kind of INVENTORY_KIND_PRIORITY) {
    if (set.has(kind)) return kind;
  }
  return null;
}

export function sanitizeWeightLb(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  return normalizeWeightLb(n);
}

export function formatLoadPrescription(
  repsText: string,
  weightLb: number | null | undefined,
): string {
  const reps = repsText.trim();
  if (weightLb == null || !(weightLb > 0)) return reps;
  const w = normalizeWeightLb(weightLb);
  if (w == null) return reps;
  const label = Number.isInteger(w) ? String(w) : w.toFixed(1);
  return reps ? `${reps} @ ${label} lb` : `${label} lb`;
}
