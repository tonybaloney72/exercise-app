import type { CardioActivityKind } from "@/types";

const DEFAULT_WEIGHT_KG = 70;

const MET_BY_KIND: Partial<Record<CardioActivityKind, number>> = {
  walk: 3.5,
  jog: 7,
  hike: 6,
  cycle: 7.5,
  swim: 8,
};

/** Rough active kcal from MET when HC has no sample in the ME window. */
export function estimateActiveCaloriesKcal(
  kind: CardioActivityKind,
  durationSeconds: number,
  weightLb?: number,
): number | undefined {
  const met = MET_BY_KIND[kind];
  if (!met || durationSeconds <= 0) return undefined;

  const weightKg =
    weightLb != null && weightLb > 0 ? weightLb * 0.45359237 : DEFAULT_WEIGHT_KG;
  const hours = durationSeconds / 3600;
  const kcal = met * weightKg * hours;
  return kcal > 0 ? Math.round(kcal) : undefined;
}

export function resolveActiveCaloriesForWrite(options: {
  kind: CardioActivityKind;
  durationSeconds: number;
  fromHealth?: number;
  weightLb?: number;
}): number | undefined {
  if (options.fromHealth != null && options.fromHealth > 0) {
    return Math.round(options.fromHealth);
  }
  return estimateActiveCaloriesKcal(
    options.kind,
    options.durationSeconds,
    options.weightLb,
  );
}
