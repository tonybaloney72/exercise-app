import { describe, expect, it } from "vitest";
import type { FoodServingOption } from "@/lib/fatsecret/foodServing";
import {
  amountAfterEntryModeSwitch,
  convertAmountBetweenEntryModes,
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

const cupOnlyServing: FoodServingOption = {
  ...cheeriosServing,
  servingId: "2",
  description: "1 cup",
  numberOfUnits: 1,
  metricServingAmount: null,
  metricServingUnit: null,
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
  it("maps servings input to FatSecret number_of_units", () => {
    expect(
      resolveNumberOfUnitsForLog({
        serving: cheeriosServing,
        amountInput: "1.5",
        weightUnit: "g",
        entryMode: "servings",
      }),
    ).toBe(1.5);
  });

  it("maps weight input to FatSecret number_of_units", () => {
    expect(
      resolveNumberOfUnitsForLog({
        serving: cheeriosServing,
        amountInput: "39",
        weightUnit: "g",
        entryMode: "weight",
      }),
    ).toBe(1);
  });

  it("rejects weight mode when the serving has no metric", () => {
    expect(
      resolveNumberOfUnitsForLog({
        serving: cupOnlyServing,
        amountInput: "100",
        weightUnit: "g",
        entryMode: "weight",
      }),
    ).toBeNull();
  });
});

describe("convertAmountBetweenEntryModes", () => {
  it("converts servings to weight and back", () => {
    expect(
      convertAmountBetweenEntryModes({
        serving: cheeriosServing,
        amountInput: "1.5",
        weightUnit: "g",
        fromMode: "servings",
        toMode: "weight",
      }),
    ).toBe("58.5");

    expect(
      convertAmountBetweenEntryModes({
        serving: cheeriosServing,
        amountInput: "19.5",
        weightUnit: "g",
        fromMode: "weight",
        toMode: "servings",
      }),
    ).toBe("0.5");
  });

  it("converts ounce servings to weight mode", () => {
    expect(
      convertAmountBetweenEntryModes({
        serving: chickenServing,
        amountInput: "0.25",
        weightUnit: "oz",
        fromMode: "servings",
        toMode: "weight",
      }),
    ).toBe("1");
  });
});

describe("amountAfterEntryModeSwitch", () => {
  it("applies a servings-to-weight switch", () => {
    expect(
      amountAfterEntryModeSwitch({
        serving: cheeriosServing,
        amountInput: "2",
        weightUnit: "g",
        fromMode: "servings",
        toMode: "weight",
      }),
    ).toEqual({ entryMode: "weight", amountInput: "78" });
  });

  it("rejects weight mode when the serving has no metric", () => {
    expect(
      amountAfterEntryModeSwitch({
        serving: cupOnlyServing,
        amountInput: "1",
        weightUnit: "g",
        fromMode: "servings",
        toMode: "weight",
      }),
    ).toBeNull();
  });

  it("falls back to 1 serving when weight input cannot convert", () => {
    expect(
      amountAfterEntryModeSwitch({
        serving: cheeriosServing,
        amountInput: "",
        weightUnit: "g",
        fromMode: "weight",
        toMode: "servings",
      }),
    ).toEqual({ entryMode: "servings", amountInput: "1" });
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
