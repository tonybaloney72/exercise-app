/** Per-serving or scaled nutrition values from FatSecret. */
export type FoodNutrition = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  saturatedFatG: number | null;
  polyunsaturatedFatG: number | null;
  monounsaturatedFatG: number | null;
  transFatG: number | null;
  cholesterolMg: number | null;
  sodiumMg: number | null;
  potassiumMg: number | null;
  fiberG: number | null;
  sugarG: number | null;
  vitaminAMcg: number | null;
  vitaminCMg: number | null;
  vitaminDMcg: number | null;
  calciumMg: number | null;
  ironMg: number | null;
  addedSugarsG: number | null;
};

export type MacroTotals = Pick<
  FoodNutrition,
  "calories" | "proteinG" | "carbsG" | "fatG"
>;

const EMPTY_MACRO_TOTALS: MacroTotals = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
};

export type NutritionDetailField = {
  label: string;
  value: number;
  unit: "g" | "mg" | "mcg" | "kcal";
};

export type FatSecretNutritionRaw = {
  calories?: string;
  protein?: string;
  carbohydrate?: string;
  fat?: string;
  saturated_fat?: string;
  polyunsaturated_fat?: string;
  monounsaturated_fat?: string;
  trans_fat?: string;
  cholesterol?: string;
  sodium?: string;
  potassium?: string;
  fiber?: string;
  sugar?: string;
  added_sugars?: string;
  vitamin_a?: string;
  vitamin_c?: string;
  vitamin_d?: string;
  calcium?: string;
  iron?: string;
};

const EMPTY_FOOD_NUTRITION: FoodNutrition = {
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  saturatedFatG: null,
  polyunsaturatedFatG: null,
  monounsaturatedFatG: null,
  transFatG: null,
  cholesterolMg: null,
  sodiumMg: null,
  potassiumMg: null,
  fiberG: null,
  sugarG: null,
  vitaminAMcg: null,
  vitaminCMg: null,
  vitaminDMcg: null,
  calciumMg: null,
  ironMg: null,
  addedSugarsG: null,
};

function parseDecimal(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalDecimal(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseFatSecretNutritionRaw(
  row: FatSecretNutritionRaw,
): FoodNutrition {
  return {
    calories: parseDecimal(row.calories),
    proteinG: parseDecimal(row.protein),
    carbsG: parseDecimal(row.carbohydrate),
    fatG: parseDecimal(row.fat),
    saturatedFatG: parseOptionalDecimal(row.saturated_fat),
    polyunsaturatedFatG: parseOptionalDecimal(row.polyunsaturated_fat),
    monounsaturatedFatG: parseOptionalDecimal(row.monounsaturated_fat),
    transFatG: parseOptionalDecimal(row.trans_fat),
    cholesterolMg: parseOptionalDecimal(row.cholesterol),
    sodiumMg: parseOptionalDecimal(row.sodium),
    potassiumMg: parseOptionalDecimal(row.potassium),
    fiberG: parseOptionalDecimal(row.fiber),
    sugarG: parseOptionalDecimal(row.sugar),
    vitaminAMcg: parseOptionalDecimal(row.vitamin_a),
    vitaminCMg: parseOptionalDecimal(row.vitamin_c),
    vitaminDMcg: parseOptionalDecimal(row.vitamin_d),
    calciumMg: parseOptionalDecimal(row.calcium),
    ironMg: parseOptionalDecimal(row.iron),
    addedSugarsG: parseOptionalDecimal(row.added_sugars),
  };
}

function sumNullable(sum: number | null, value: number | null): number | null {
  if (sum == null && value == null) return null;
  return (sum ?? 0) + (value ?? 0);
}

export function sumNutrition(rows: FoodNutrition[]): FoodNutrition {
  return rows.reduce<FoodNutrition>(
    (sum, row) => ({
      calories: sum.calories + row.calories,
      proteinG: sum.proteinG + row.proteinG,
      carbsG: sum.carbsG + row.carbsG,
      fatG: sum.fatG + row.fatG,
      saturatedFatG: sumNullable(sum.saturatedFatG, row.saturatedFatG),
      polyunsaturatedFatG: sumNullable(
        sum.polyunsaturatedFatG,
        row.polyunsaturatedFatG,
      ),
      monounsaturatedFatG: sumNullable(
        sum.monounsaturatedFatG,
        row.monounsaturatedFatG,
      ),
      transFatG: sumNullable(sum.transFatG, row.transFatG),
      cholesterolMg: sumNullable(sum.cholesterolMg, row.cholesterolMg),
      sodiumMg: sumNullable(sum.sodiumMg, row.sodiumMg),
      potassiumMg: sumNullable(sum.potassiumMg, row.potassiumMg),
      fiberG: sumNullable(sum.fiberG, row.fiberG),
      sugarG: sumNullable(sum.sugarG, row.sugarG),
      vitaminAMcg: sumNullable(sum.vitaminAMcg, row.vitaminAMcg),
      vitaminCMg: sumNullable(sum.vitaminCMg, row.vitaminCMg),
      vitaminDMcg: sumNullable(sum.vitaminDMcg, row.vitaminDMcg),
      calciumMg: sumNullable(sum.calciumMg, row.calciumMg),
      ironMg: sumNullable(sum.ironMg, row.ironMg),
      addedSugarsG: sumNullable(sum.addedSugarsG, row.addedSugarsG),
    }),
    { ...EMPTY_FOOD_NUTRITION },
  );
}

function scaleOptional(value: number | null, factor: number): number | null {
  if (value == null) return null;
  return value * factor;
}

export function scaleNutrition(
  nutrition: FoodNutrition,
  factor: number,
): FoodNutrition {
  if (!Number.isFinite(factor) || factor <= 0) {
    return { ...nutrition };
  }

  return {
    calories: nutrition.calories * factor,
    proteinG: nutrition.proteinG * factor,
    carbsG: nutrition.carbsG * factor,
    fatG: nutrition.fatG * factor,
    saturatedFatG: scaleOptional(nutrition.saturatedFatG, factor),
    polyunsaturatedFatG: scaleOptional(nutrition.polyunsaturatedFatG, factor),
    monounsaturatedFatG: scaleOptional(nutrition.monounsaturatedFatG, factor),
    transFatG: scaleOptional(nutrition.transFatG, factor),
    cholesterolMg: scaleOptional(nutrition.cholesterolMg, factor),
    sodiumMg: scaleOptional(nutrition.sodiumMg, factor),
    potassiumMg: scaleOptional(nutrition.potassiumMg, factor),
    fiberG: scaleOptional(nutrition.fiberG, factor),
    sugarG: scaleOptional(nutrition.sugarG, factor),
    vitaminAMcg: scaleOptional(nutrition.vitaminAMcg, factor),
    vitaminCMg: scaleOptional(nutrition.vitaminCMg, factor),
    vitaminDMcg: scaleOptional(nutrition.vitaminDMcg, factor),
    calciumMg: scaleOptional(nutrition.calciumMg, factor),
    ironMg: scaleOptional(nutrition.ironMg, factor),
    addedSugarsG: scaleOptional(nutrition.addedSugarsG, factor),
  };
}

export function sumMacroTotals(rows: MacroTotals[]): MacroTotals {
  return rows.reduce<MacroTotals>(
    (sum, row) => ({
      calories: sum.calories + row.calories,
      proteinG: sum.proteinG + row.proteinG,
      carbsG: sum.carbsG + row.carbsG,
      fatG: sum.fatG + row.fatG,
    }),
    { ...EMPTY_MACRO_TOTALS },
  );
}

export function nutritionDetailFields(
  nutrition: FoodNutrition,
): NutritionDetailField[] {
  const rows: Array<NutritionDetailField | null> = [
    nutrition.fiberG != null && nutrition.fiberG > 0
      ? { label: "Fiber", value: nutrition.fiberG, unit: "g" }
      : null,
    nutrition.sugarG != null && nutrition.sugarG > 0
      ? { label: "Sugar", value: nutrition.sugarG, unit: "g" }
      : null,
    nutrition.addedSugarsG != null && nutrition.addedSugarsG > 0
      ? { label: "Added sugars", value: nutrition.addedSugarsG, unit: "g" }
      : null,
    nutrition.sodiumMg != null && nutrition.sodiumMg > 0
      ? { label: "Sodium", value: nutrition.sodiumMg, unit: "mg" }
      : null,
    nutrition.cholesterolMg != null && nutrition.cholesterolMg > 0
      ? { label: "Cholesterol", value: nutrition.cholesterolMg, unit: "mg" }
      : null,
    nutrition.potassiumMg != null && nutrition.potassiumMg > 0
      ? { label: "Potassium", value: nutrition.potassiumMg, unit: "mg" }
      : null,
    nutrition.saturatedFatG != null && nutrition.saturatedFatG > 0
      ? { label: "Sat fat", value: nutrition.saturatedFatG, unit: "g" }
      : null,
    nutrition.transFatG != null && nutrition.transFatG > 0
      ? { label: "Trans fat", value: nutrition.transFatG, unit: "g" }
      : null,
    nutrition.vitaminCMg != null && nutrition.vitaminCMg > 0
      ? { label: "Vitamin C", value: nutrition.vitaminCMg, unit: "mg" }
      : null,
    nutrition.calciumMg != null && nutrition.calciumMg > 0
      ? { label: "Calcium", value: nutrition.calciumMg, unit: "mg" }
      : null,
    nutrition.ironMg != null && nutrition.ironMg > 0
      ? { label: "Iron", value: nutrition.ironMg, unit: "mg" }
      : null,
    nutrition.vitaminAMcg != null && nutrition.vitaminAMcg > 0
      ? { label: "Vitamin A", value: nutrition.vitaminAMcg, unit: "mcg" }
      : null,
    nutrition.vitaminDMcg != null && nutrition.vitaminDMcg > 0
      ? { label: "Vitamin D", value: nutrition.vitaminDMcg, unit: "mcg" }
      : null,
  ];

  return rows.filter((row): row is NutritionDetailField => row != null);
}

export function servingScaleFactor(
  unitsInput: string,
  numberOfUnits: number,
): number {
  const units = Number.parseFloat(unitsInput);
  if (!Number.isFinite(units) || units <= 0) return 1;
  if (!Number.isFinite(numberOfUnits) || numberOfUnits <= 0) return units;
  return units / numberOfUnits;
}
