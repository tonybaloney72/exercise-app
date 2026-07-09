import { describe, expect, it } from "vitest";
import type { FoodServingOption } from "@/lib/fatsecret/foodDetail";
import {
  convertWeightToGrams,
  defaultWeightEntryAmount,
  formatServingSizeLine,
  numberOfUnitsFromWeightEaten,
  resolveNumberOfUnitsForLog,
  servingMetricGrams,
} from "@/lib/nutrition/servingQuantity";

const cheeriosServing: FoodServingOption = {
  servingId: "4022124",
  description: "1 1/2 cups",
  numberOfUnits: 1,
  metricServingAmount: 39,
  metricServingUnit: "g",
  calories: 140,
  proteinG: 5,
  carbsG: 29,
  fatG: 2.5,
  saturatedFatG: 0.5,
  polyunsaturatedFatG: 1,
  monounsaturatedFatG: 1,
  transFatG: 0,
  cholesterolMg: 0,
  sodiumMg: 190,
  potassiumMg: 250,
  fiberG: 4,
  sugarG: 2,
  vitaminAMcg: 0,
  vitaminCMg: 0,
  vitaminDMcg: 2,
  calciumMg: 130,
  ironMg: 12.6,
  addedSugarsG: 2,
};

const chickenServing: FoodServingOption = {
  ...cheeriosServing,
  servingId: "1",
  description: "4 oz",
  numberOfUnits: 1,
  metricServingAmount: 4,
  metricServingUnit: "oz",
  calories: 120,
};

describe("formatServingSizeLine", () => {
  it("includes metric when available", () => {
    expect(formatServingSizeLine(cheeriosServing)).toBe("1 1/2 cups (39 g)");
  });
});

describe("numberOfUnitsFromWeightEaten", () => {
  it("converts grams eaten for a gram-based serving", () => {
    expect(numberOfUnitsFromWeightEaten(cheeriosServing, 39, "g")).toBe(1);
    expect(numberOfUnitsFromWeightEaten(cheeriosServing, 19.5, "g")).toBe(0.5);
  });

  it("converts ounces eaten for an ounce-based serving", () => {
    expect(numberOfUnitsFromWeightEaten(chickenServing, 3.2, "oz")).toBeCloseTo(
      0.8,
      5,
    );
  });

  it("converts across units using serving grams", () => {
    expect(
      numberOfUnitsFromWeightEaten(cheeriosServing, 3.2, "oz"),
    ).toBeCloseTo(2.326, 2);
  });
});

describe("resolveNumberOfUnitsForLog", () => {
  it("maps weight input to FatSecret number_of_units", () => {
    expect(
      resolveNumberOfUnitsForLog({
        serving: cheeriosServing,
        amountInput: "39",
        weightUnit: "g",
      }),
    ).toBe(1);
  });
});

describe("servingMetricGrams", () => {
  it("normalizes ounce servings to grams", () => {
    expect(servingMetricGrams(chickenServing)).toBeCloseTo(113.398, 2);
  });
});

describe("defaultWeightEntryAmount", () => {
  it("defaults to one full serving in the chosen unit", () => {
    expect(defaultWeightEntryAmount(cheeriosServing, "g")).toBe("39");
    expect(defaultWeightEntryAmount(chickenServing, "oz")).toBe("4");
    expect(convertWeightToGrams(4, "oz")).toBeCloseTo(
      servingMetricGrams(chickenServing)!,
      5,
    );
  });
});
