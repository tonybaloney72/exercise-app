import { describe, expect, it } from "vitest";
import {
  parseFatSecretNutritionRaw,
  scaleNutrition,
  servingScaleFactor,
  sumMacroTotals,
  sumNutrition,
} from "@/lib/nutrition/foodNutrition";
import { formatMacroSummary } from "@/lib/nutrition/formatNutrition";

const baseNutrition = {
  calories: 200,
  proteinG: 10,
  carbsG: 20,
  fatG: 8,
  saturatedFatG: 2,
  polyunsaturatedFatG: null,
  monounsaturatedFatG: null,
  transFatG: null,
  cholesterolMg: 50,
  sodiumMg: 400,
  potassiumMg: null,
  fiberG: 3,
  sugarG: 5,
  vitaminAMcg: null,
  vitaminCMg: 12,
  vitaminDMcg: null,
  calciumMg: null,
  ironMg: 1.2,
  addedSugarsG: null,
};

describe("parseFatSecretNutritionRaw", () => {
  it("parses extended nutrition fields", () => {
    const nutrition = parseFatSecretNutritionRaw({
      calories: "140",
      protein: "12",
      carbohydrate: "1",
      fat: "10",
      fiber: "1.6",
      sodium: "640",
      vitamin_c: "8",
    });
    expect(nutrition.fiberG).toBe(1.6);
    expect(nutrition.sodiumMg).toBe(640);
    expect(nutrition.vitaminCMg).toBe(8);
  });
});

describe("sumNutrition", () => {
  it("aggregates optional micronutrients", () => {
    const total = sumNutrition([
      parseFatSecretNutritionRaw({ calories: "100", fiber: "2", sodium: "100" }),
      parseFatSecretNutritionRaw({ calories: "50", fiber: "1", sodium: "50" }),
    ]);
    expect(total.calories).toBe(150);
    expect(total.fiberG).toBe(3);
    expect(total.sodiumMg).toBe(150);
  });
});

describe("servingScaleFactor", () => {
  it("scales units against the serving baseline", () => {
    expect(servingScaleFactor("2", 1)).toBe(2);
    expect(servingScaleFactor("0.5", 1)).toBe(0.5);
    expect(servingScaleFactor("1", 2)).toBe(0.5);
  });
});

describe("scaleNutrition", () => {
  it("scales macros and optional micronutrients", () => {
    const scaled = scaleNutrition(baseNutrition, 2);
    expect(scaled.calories).toBe(400);
    expect(scaled.proteinG).toBe(20);
    expect(scaled.sodiumMg).toBe(800);
    expect(scaled.fiberG).toBe(6);
  });
});

describe("sumMacroTotals", () => {
  it("adds macro rows", () => {
    const total = sumMacroTotals([
      { calories: 100, proteinG: 5, carbsG: 10, fatG: 2 },
      { calories: 50, proteinG: 2, carbsG: 4, fatG: 1 },
    ]);
    expect(total).toEqual({
      calories: 150,
      proteinG: 7,
      carbsG: 14,
      fatG: 3,
    });
  });
});

describe("formatMacroSummary", () => {
  it("formats calories and macros", () => {
    expect(
      formatMacroSummary({
        calories: 140.4,
        proteinG: 12.2,
        carbsG: 1.1,
        fatG: 10,
      }),
    ).toBe("140 kcal · P 12.2g · C 1.1g · F 10g");
  });
});
