import {
  isLoggableFoodServing,
  type FoodServingOption,
} from "@/lib/fatsecret/foodDetail";
import { servingScaleFactor } from "@/lib/nutrition/foodNutrition";

const GRAMS_PER_OUNCE = 28.349523125;
const GRAMS_PER_POUND = 453.59237;

export type WeightEntryUnit = "g" | "oz" | "lb";

export const WEIGHT_ENTRY_UNITS: readonly WeightEntryUnit[] = ["g", "oz", "lb"];

export function defaultFoodServing(
  servings: readonly FoodServingOption[],
): FoodServingOption | null {
  const loggable = servings.filter(isLoggableFoodServing);
  if (loggable.length === 0) return null;
  return (
    loggable.find((serving) => servingHasMetricWeight(serving)) ?? loggable[0]!
  );
}

export function servingHasMetricWeight(serving: FoodServingOption): boolean {
  return servingMetricGrams(serving) != null;
}

export function formatServingSizeLine(serving: FoodServingOption): string {
  const metric = formatServingMetric(serving);
  if (!metric) return serving.description;
  return `${serving.description} (${metric})`;
}

function formatServingMetric(serving: FoodServingOption): string | null {
  if (
    serving.metricServingAmount == null ||
    !serving.metricServingUnit ||
    serving.metricServingAmount <= 0
  ) {
    return null;
  }
  const amount = Math.round(serving.metricServingAmount * 10) / 10;
  return `${amount} ${serving.metricServingUnit}`;
}

export function defaultWeightEntryUnit(
  serving: FoodServingOption,
): WeightEntryUnit {
  if (serving.metricServingUnit === "oz") return "oz";
  return "g";
}

export function defaultWeightEntryAmount(
  serving: FoodServingOption,
  unit: WeightEntryUnit,
): string {
  const grams = servingMetricGrams(serving);
  if (grams == null || grams <= 0) {
    return String(serving.numberOfUnits);
  }
  const amount = convertGramsToWeight(grams, unit);
  return formatWeightInputAmount(amount);
}

export function formatWeightInputAmount(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function convertWeightToGrams(
  amount: number,
  unit: WeightEntryUnit,
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  switch (unit) {
    case "g":
      return amount;
    case "oz":
      return amount * GRAMS_PER_OUNCE;
    case "lb":
      return amount * GRAMS_PER_POUND;
  }
}

export function convertGramsToWeight(
  grams: number,
  unit: WeightEntryUnit,
): number {
  if (!Number.isFinite(grams) || grams <= 0) return 0;
  switch (unit) {
    case "g":
      return grams;
    case "oz":
      return grams / GRAMS_PER_OUNCE;
    case "lb":
      return grams / GRAMS_PER_POUND;
  }
}

/** FatSecret metric weight for one full serving row, normalized to grams. */
export function servingMetricGrams(serving: FoodServingOption): number | null {
  if (
    serving.metricServingAmount == null ||
    !serving.metricServingUnit ||
    serving.metricServingAmount <= 0
  ) {
    return null;
  }

  const unit = serving.metricServingUnit.toLowerCase();
  if (unit === "g") return serving.metricServingAmount;
  if (unit === "oz") {
    return convertWeightToGrams(serving.metricServingAmount, "oz");
  }
  return null;
}

export function numberOfUnitsFromWeightEaten(
  serving: FoodServingOption,
  amount: number,
  unit: WeightEntryUnit,
): number | null {
  const servingGrams = servingMetricGrams(serving);
  if (servingGrams == null || servingGrams <= 0) return null;

  const eatenGrams = convertWeightToGrams(amount, unit);
  if (eatenGrams <= 0) return null;

  const fraction = eatenGrams / servingGrams;
  if (!Number.isFinite(fraction) || fraction <= 0) return null;

  return fraction * serving.numberOfUnits;
}

function numberOfUnitsFromServingFraction(
  serving: FoodServingOption,
  servingsEaten: number,
): number | null {
  if (!Number.isFinite(servingsEaten) || servingsEaten <= 0) return null;
  return servingsEaten * serving.numberOfUnits;
}

export function resolveNumberOfUnitsForLog(options: {
  serving: FoodServingOption;
  amountInput: string;
  weightUnit: WeightEntryUnit;
}): number | null {
  const amount = Number.parseFloat(options.amountInput.trim());
  if (!Number.isFinite(amount) || amount <= 0) return null;

  if (servingHasMetricWeight(options.serving)) {
    return numberOfUnitsFromWeightEaten(
      options.serving,
      amount,
      options.weightUnit,
    );
  }

  return numberOfUnitsFromServingFraction(options.serving, amount);
}

export function nutritionScaleFactorForLog(options: {
  serving: FoodServingOption;
  amountInput: string;
  weightUnit: WeightEntryUnit;
}): number {
  const numberOfUnits = resolveNumberOfUnitsForLog(options);
  if (numberOfUnits == null) return 0;
  return servingScaleFactor(
    String(numberOfUnits),
    options.serving.numberOfUnits,
  );
}

export type ServingFractionChip = {
  id: string;
  label: string;
  multiplier: number;
};

export const ALL_SERVING_FRACTION_CHIPS: readonly ServingFractionChip[] = [
  { id: "quarter", label: "1/4", multiplier: 0.25 },
  { id: "third", label: "1/3", multiplier: 1 / 3 },
  { id: "half", label: "1/2", multiplier: 0.5 },
  { id: "two-thirds", label: "2/3", multiplier: 2 / 3 },
  { id: "three-quarters", label: "3/4", multiplier: 0.75 },
  { id: "one", label: "1", multiplier: 1 },
  { id: "one-half", label: "1 1/2", multiplier: 1.5 },
  { id: "two", label: "2", multiplier: 2 },
];

export function servingFractionChipForMultiplier(
  multiplier: number,
): ServingFractionChip | null {
  return (
    ALL_SERVING_FRACTION_CHIPS.find((chip) =>
      servingMultipliersMatch(multiplier, chip.multiplier),
    ) ?? null
  );
}

export function amountInputForServingMultiplier(
  serving: FoodServingOption,
  multiplier: number,
  unit: WeightEntryUnit,
): string {
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    return formatWeightInputAmount(1);
  }

  if (servingHasMetricWeight(serving)) {
    const fullServingAmount = Number.parseFloat(
      defaultWeightEntryAmount(serving, unit),
    );
    if (!Number.isFinite(fullServingAmount) || fullServingAmount <= 0) {
      return formatWeightInputAmount(multiplier);
    }
    return formatWeightInputAmount(fullServingAmount * multiplier);
  }

  return formatWeightInputAmount(multiplier);
}

function servingMultipliersMatch(
  activeMultiplier: number,
  chipMultiplier: number,
): boolean {
  if (!Number.isFinite(activeMultiplier) || activeMultiplier <= 0) return false;
  return Math.abs(activeMultiplier - chipMultiplier) < 0.02;
}
