import { describe, expect, it } from "vitest";
import {
  buildNutritionTrendPoints,
  chartDateKeysForNutritionTrend,
  nutritionTrendHasData,
  sumConsumedForDateKeys,
} from "@/lib/nutrition/nutritionTrendChart";
import type { FoodDiaryDay } from "@/lib/fatsecret/foodDiary";

const baseDiaryFields = {
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
  meals: [] as FoodDiaryDay["meals"],
};

describe("chartDateKeysForNutritionTrend", () => {
  it("includes burned dates and range dates", () => {
    const keys = chartDateKeysForNutritionTrend({
      range: "week",
      burnedSeries: [
        { date: "2026-07-02", xLabel: "7/2", sortKey: 1, value: 200 },
        { date: "2026-07-08", xLabel: "7/8", sortKey: 2, value: 300 },
      ],
      ref: new Date(2026, 6, 8),
    });
    expect(keys).toContain("2026-07-02");
    expect(keys).toContain("2026-07-08");
    expect(keys.length).toBeGreaterThanOrEqual(7);
  });
});

describe("buildNutritionTrendPoints", () => {
  it("merges burned and consumed values by date", () => {
    const diary: FoodDiaryDay = {
      date: "2026-07-08",
      ...baseDiaryFields,
      calories: 400,
      proteinG: 20,
      carbsG: 50,
      fatG: 10,
      fiberG: 8,
      sodiumMg: 500,
    };

    const points = buildNutritionTrendPoints({
      dateKeys: ["2026-07-08"],
      burnedSeries: [
        { date: "2026-07-08", xLabel: "7/8", sortKey: 1, value: 500 },
      ],
      diaryByDate: new Map([["2026-07-08", diary]]),
    });

    expect(points).toHaveLength(1);
    expect(points[0]?.burned).toBe(500);
    expect(points[0]?.consumed?.calories).toBe(400);
    expect(points[0]?.consumed?.proteinG).toBe(20);
    expect(points[0]?.consumed?.fiberG).toBe(8);
  });
});

describe("sumConsumedForDateKeys", () => {
  it("sums nutrition across diary days", () => {
    const dayA: FoodDiaryDay = {
      date: "2026-07-07",
      ...baseDiaryFields,
      calories: 200,
      proteinG: 10,
      carbsG: 20,
      fatG: 5,
      fiberG: 4,
      sodiumMg: 300,
    };
    const dayB: FoodDiaryDay = {
      date: "2026-07-08",
      ...baseDiaryFields,
      calories: 300,
      proteinG: 15,
      carbsG: 30,
      fatG: 8,
      fiberG: 6,
      sodiumMg: 200,
    };

    const total = sumConsumedForDateKeys(
      ["2026-07-07", "2026-07-08"],
      new Map([
        ["2026-07-07", dayA],
        ["2026-07-08", dayB],
      ]),
    );

    expect(total.calories).toBe(500);
    expect(total.fiberG).toBe(10);
    expect(total.sodiumMg).toBe(500);
  });
});

describe("nutritionTrendHasData", () => {
  it("detects missing calories data", () => {
    const points = buildNutritionTrendPoints({
      dateKeys: ["2026-07-08"],
      burnedSeries: [],
      diaryByDate: new Map(),
    });
    expect(nutritionTrendHasData(points, "calories")).toBe(false);
  });

  it("detects fiber from consumed totals", () => {
    const diary: FoodDiaryDay = {
      date: "2026-07-08",
      ...baseDiaryFields,
      calories: 100,
      proteinG: 5,
      carbsG: 10,
      fatG: 2,
      fiberG: 3,
    };
    const points = buildNutritionTrendPoints({
      dateKeys: ["2026-07-08"],
      burnedSeries: [],
      diaryByDate: new Map([["2026-07-08", diary]]),
    });
    expect(nutritionTrendHasData(points, "fiber")).toBe(true);
  });
});
