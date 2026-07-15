import { describe, expect, it } from "vitest";
import {
  isLoggableFoodServing,
  parseFoodDetailResponse,
} from "@/lib/fatsecret/foodDetail";
import { defaultFoodServing } from "@/lib/nutrition/servingQuantity";

describe("isLoggableFoodServing", () => {
  it("rejects food.get.v5 derived servings with serving_id 0", () => {
    expect(isLoggableFoodServing({ servingId: "0" })).toBe(false);
    expect(isLoggableFoodServing({ servingId: "4022124" })).toBe(true);
  });
});

describe("parseFoodDetailResponse", () => {
  it("keeps catalog and standardized servings from a v5-shaped payload", () => {
    const food = parseFoodDetailResponse({
      food: {
        food_id: "50953",
        food_name: "Whole Grain Cheerios",
        brand_name: "General Mills",
        food_type: "Brand",
        servings: {
          serving: [
            {
              serving_id: "100675",
              serving_description: "1 cup",
              number_of_units: "1.000",
              metric_serving_amount: "30.000",
              metric_serving_unit: "g",
              calories: "100",
              protein: "3.00",
              carbohydrate: "20.00",
              fat: "2.00",
            },
            {
              serving_id: "0",
              serving_description: "100 g",
              number_of_units: "1.000",
              metric_serving_amount: "100.000",
              metric_serving_unit: "g",
              calories: "333",
              protein: "10.00",
              carbohydrate: "66.67",
              fat: "6.67",
            },
          ],
        },
      },
    });

    expect(food?.servings).toHaveLength(2);
    expect(food?.servings.map((s) => s.servingId)).toEqual(["100675", "0"]);
  });
});

describe("defaultFoodServing with v5 derived servings", () => {
  it("never defaults to serving_id 0", () => {
    const food = parseFoodDetailResponse({
      food: {
        food_id: "1",
        food_name: "Bar",
        food_type: "Brand",
        servings: {
          serving: [
            {
              serving_id: "0",
              serving_description: "100 g",
              number_of_units: "1",
              metric_serving_amount: "100",
              metric_serving_unit: "g",
              calories: "300",
              protein: "10",
              carbohydrate: "40",
              fat: "10",
            },
            {
              serving_id: "99",
              serving_description: "1 bar",
              number_of_units: "1",
              metric_serving_amount: "68",
              metric_serving_unit: "g",
              calories: "250",
              protein: "10",
              carbohydrate: "30",
              fat: "8",
            },
          ],
        },
      },
    });

    expect(defaultFoodServing(food?.servings ?? [])?.servingId).toBe("99");
  });
});
