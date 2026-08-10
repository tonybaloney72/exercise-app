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

/** Library default weight to preselect when starting/swapping into a loadable move. */
export function initialLoggedWeightLb(
  exercise: Pick<Exercise, "equipment"> | null | undefined,
  defaultWeightLb: number | null | undefined,
): number | undefined {
  if (!exerciseSupportsLoadMeta(exercise)) return undefined;
  return sanitizeWeightLb(defaultWeightLb) ?? undefined;
}

/**
 * Parse a weight field draft on blur/commit.
 * Empty or zero → cleared (bodyweight / no load). Invalid → `"invalid"`.
 */
export function parseWeightFieldDraft(
  raw: string,
): number | undefined | "invalid" {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  if (!/^\d*\.?\d*$/.test(trimmed)) return "invalid";
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return "invalid";
  // Explicit 0 / 0.0 = no load (inventory has no 0 lb plates).
  if (n === 0) return undefined;
  const parsed = sanitizeWeightLb(n);
  if (parsed == null) return "invalid";
  return parsed;
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
