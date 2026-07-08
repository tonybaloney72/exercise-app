import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createFoodDiaryEntry,
  parseFoodDiaryResponse,
} from "@/lib/fatsecret/foodDiary";
import { fatsecretSignedRequest } from "@/lib/fatsecret/oauth1";
import {
  fatSecretDateIntToLocalDateKey,
  localDateKeyToFatSecretDateInt,
} from "@/lib/nutrition/fatsecretDateInt";
import { normalizeFatSecretMeal } from "@/lib/nutrition/fatsecretMeals";

describe("localDateKeyToFatSecretDateInt", () => {
  it("round-trips through fatSecretDateIntToLocalDateKey", () => {
    const key = "2026-07-08";
    const dateInt = localDateKeyToFatSecretDateInt(key);
    expect(fatSecretDateIntToLocalDateKey(dateInt)).toBe(key);
  });
});

describe("normalizeFatSecretMeal", () => {
  it("normalizes API meal casing", () => {
    expect(normalizeFatSecretMeal("Breakfast")).toBe("breakfast");
    expect(normalizeFatSecretMeal("other")).toBe("other");
  });
});

describe("parseFoodDiaryResponse", () => {
  it("groups entries by meal and sums calories", () => {
    const diary = parseFoodDiaryResponse("2026-07-08", {
      food_entries: {
        food_entry: [
          {
            food_entry_id: "1",
            food_id: "10",
            serving_id: "20",
            food_entry_name: "Eggs",
            food_entry_description: "2 eggs",
            meal: "Breakfast",
            number_of_units: "1",
            calories: "140",
            protein: "12",
            carbohydrate: "1",
            fat: "10",
            fiber: "1",
            sodium: "200",
          },
          {
            food_entry_id: "2",
            food_id: "11",
            serving_id: "21",
            food_entry_name: "Bar",
            food_entry_description: "1 bar",
            meal: "other",
            calories: "200",
          },
        ],
      },
    });

    expect(diary.calories).toBe(340);
    expect(diary.proteinG).toBe(12);
    expect(diary.carbsG).toBe(1);
    expect(diary.fatG).toBe(10);
    expect(diary.meals.find((meal) => meal.meal === "breakfast")?.calories).toBe(
      140,
    );
    expect(diary.meals.find((meal) => meal.meal === "breakfast")?.fiberG).toBe(1);
    expect(diary.meals.find((meal) => meal.meal === "breakfast")?.sodiumMg).toBe(
      200,
    );
    expect(diary.meals.find((meal) => meal.meal === "other")?.entries).toHaveLength(
      1,
    );
  });

  it("accepts a top-level food_entry object", () => {
    const diary = parseFoodDiaryResponse("2026-07-08", {
      food_entry: {
        food_entry_id: "3",
        food_id: "12",
        serving_id: "22",
        food_entry_name: "Yogurt",
        meal: "Lunch",
        calories: "120",
      },
    });

    expect(diary.calories).toBe(120);
    expect(diary.meals.find((meal) => meal.meal === "lunch")?.entries[0]?.name).toBe(
      "Yogurt",
    );
  });
});

vi.mock("@/lib/fatsecret/oauth1", () => ({
  fatsecretSignedRequest: vi.fn(),
}));

describe("createFoodDiaryEntry", () => {
  const userOAuth = { token: "token", secret: "secret" };

  beforeEach(() => {
    vi.mocked(fatsecretSignedRequest).mockReset();
  });

  it("maps sparse create responses using request fallbacks", async () => {
    vi.mocked(fatsecretSignedRequest).mockResolvedValueOnce({
      food_entries: {
        food_entry: {
          food_entry_id: "99",
          food_id: "10",
          serving_id: "20",
        },
      },
    });

    const entry = await createFoodDiaryEntry({
      userOAuth,
      dateKey: "2026-07-08",
      meal: "breakfast",
      foodId: "10",
      foodName: "Eggs",
      servingId: "20",
      numberOfUnits: 2,
    });

    expect(entry.entryId).toBe("99");
    expect(entry.name).toBe("Eggs");
    expect(entry.meal).toBe("breakfast");
    expect(entry.numberOfUnits).toBe(2);
    expect(fatsecretSignedRequest).toHaveBeenCalledTimes(1);
  });

  it("reloads the diary when create returns no parseable entry", async () => {
    vi.mocked(fatsecretSignedRequest)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        food_entries: {
          food_entry: {
            food_entry_id: "100",
            food_id: "10",
            serving_id: "20",
            food_entry_name: "Eggs",
            meal: "Breakfast",
            number_of_units: "2",
            calories: "140",
          },
        },
      });

    const entry = await createFoodDiaryEntry({
      userOAuth,
      dateKey: "2026-07-08",
      meal: "breakfast",
      foodId: "10",
      foodName: "Eggs",
      servingId: "20",
      numberOfUnits: 2,
    });

    expect(entry.entryId).toBe("100");
    expect(fatsecretSignedRequest).toHaveBeenCalledTimes(2);
  });
});
