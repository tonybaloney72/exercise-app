import { describe, expect, it } from "vitest";
import {
  mergeUsualFoods,
  parseUsualFoodsResponse,
  type UsualFoodItem,
} from "@/lib/fatsecret/foodUsual";

describe("parseUsualFoodsResponse", () => {
  it("maps a single food object and an array", () => {
    const single = parseUsualFoodsResponse(
      {
        foods: {
          food: {
            food_id: "1",
            food_name: "Oatmeal",
            food_description: "Per 1 cup",
            serving_id: "10",
            number_of_units: "1.000",
          },
        },
      },
      "most_eaten",
      false,
    );
    expect(single).toEqual([
      {
        foodId: "1",
        name: "Oatmeal",
        brandName: null,
        foodType: null,
        description: "Per 1 cup",
        servingId: "10",
        numberOfUnits: 1,
        source: "most_eaten",
        isFavorite: false,
      },
    ]);

    const many = parseUsualFoodsResponse(
      {
        foods: {
          food: [
            { food_id: "2", food_name: "Banana", brand_name: "Chiquita" },
            { food_id: "", food_name: "Skip me" },
          ],
        },
      },
      "favorite",
      true,
    );
    expect(many).toHaveLength(1);
    expect(many[0]?.foodId).toBe("2");
    expect(many[0]?.brandName).toBe("Chiquita");
    expect(many[0]?.isFavorite).toBe(true);
  });
});

describe("mergeUsualFoods", () => {
  const mostEaten: UsualFoodItem[] = [
    {
      foodId: "a",
      name: "Oats",
      brandName: null,
      foodType: null,
      description: null,
      servingId: "1",
      numberOfUnits: 1,
      source: "most_eaten",
      isFavorite: false,
    },
    {
      foodId: "b",
      name: "Eggs",
      brandName: null,
      foodType: null,
      description: null,
      servingId: "2",
      numberOfUnits: 2,
      source: "most_eaten",
      isFavorite: false,
    },
  ];
  const favorites: UsualFoodItem[] = [
    {
      foodId: "b",
      name: "Eggs",
      brandName: null,
      foodType: null,
      description: null,
      servingId: "2",
      numberOfUnits: 2,
      source: "favorite",
      isFavorite: true,
    },
    {
      foodId: "c",
      name: "Yogurt",
      brandName: null,
      foodType: null,
      description: null,
      servingId: "3",
      numberOfUnits: 1,
      source: "favorite",
      isFavorite: true,
    },
  ];

  it("keeps only most-eaten for the meal and stars overlapping favorites", () => {
    expect(mergeUsualFoods({ mostEaten, favorites })).toEqual([
      { ...mostEaten[0], isFavorite: false },
      { ...mostEaten[1], isFavorite: true },
    ]);
  });

  it("does not append favorites that are not most-eaten for the meal", () => {
    const foods = mergeUsualFoods({ mostEaten, favorites });
    expect(foods.map((food) => food.foodId)).not.toContain("c");
  });

  it("respects the limit", () => {
    expect(mergeUsualFoods({ mostEaten, favorites, limit: 1 })).toHaveLength(1);
  });
});
