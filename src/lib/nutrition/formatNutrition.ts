import type {
  MacroTotals,
  NutritionDetailField,
} from "@/lib/nutrition/foodNutrition";

function roundNutrition(value: number, unit: NutritionDetailField["unit"]): number {
  if (unit === "kcal") return Math.round(value);
  if (unit === "mg" || unit === "mcg") return Math.round(value);
  return Math.round(value * 10) / 10;
}

export function formatNutritionAmount(
  value: number,
  unit: NutritionDetailField["unit"],
): string {
  const rounded = roundNutrition(value, unit);
  if (unit === "kcal") return `${rounded} kcal`;
  return `${rounded} ${unit}`;
}

export function formatMacroSummary(macros: MacroTotals): string {
  const calories = Math.round(macros.calories);
  const protein = roundNutrition(macros.proteinG, "g");
  const carbs = roundNutrition(macros.carbsG, "g");
  const fat = roundNutrition(macros.fatG, "g");
  return `${calories} kcal · P ${protein}g · C ${carbs}g · F ${fat}g`;
}

export function formatMacroShort(macros: MacroTotals): string {
  const protein = roundNutrition(macros.proteinG, "g");
  const carbs = roundNutrition(macros.carbsG, "g");
  const fat = roundNutrition(macros.fatG, "g");
  return `P ${protein}g · C ${carbs}g · F ${fat}g`;
}
