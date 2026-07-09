import { fatsecretSignedRequest } from "@/lib/fatsecret/oauth1";
import type { FatSecretProfileAuth } from "@/lib/fatsecret/profile";
import { normalizeFatSecretList } from "@/lib/fatsecret/normalize";
import {
  FATSECRET_MEALS,
  normalizeFatSecretMeal,
  type FatSecretMeal,
} from "@/lib/nutrition/fatsecretMeals";
import { localDateKeyToFatSecretDateInt } from "@/lib/nutrition/fatsecretDateInt";
import type { FoodNutrition } from "@/lib/nutrition/foodNutrition";
import {
  parseFatSecretNutritionRaw,
  sumNutrition,
} from "@/lib/nutrition/foodNutrition";

export type FoodDiaryEntry = {
  entryId: string;
  foodId: string;
  servingId: string;
  name: string;
  description: string;
  meal: FatSecretMeal;
  numberOfUnits: number;
} & FoodNutrition;

export type FoodDiaryMealSummary = {
  meal: FatSecretMeal;
  entries: FoodDiaryEntry[];
} & FoodNutrition;

export type FoodDiaryDay = {
  date: string;
  meals: FoodDiaryMealSummary[];
} & FoodNutrition;

type RawDiaryEntry = {
  food_entry_id?: string;
  food_id?: string;
  serving_id?: string;
  food_entry_name?: string;
  food_entry_description?: string;
  meal?: string;
  number_of_units?: string;
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

type RawDiaryResponse = {
  food_entries?: {
    food_entry?: RawDiaryEntry | RawDiaryEntry[];
  };
  food_entry?: RawDiaryEntry | RawDiaryEntry[];
};

function parseDecimal(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractRawDiaryEntries(payload: unknown): RawDiaryEntry[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as RawDiaryResponse;
  if (root.food_entries?.food_entry != null) {
    return normalizeFatSecretList(root.food_entries.food_entry);
  }
  if (root.food_entry != null) {
    return normalizeFatSecretList(root.food_entry);
  }
  return [];
}

type DiaryEntryFallback = {
  meal: FatSecretMeal;
  foodName: string;
  foodId: string;
  servingId: string;
  numberOfUnits: number;
};

function mapDiaryEntry(
  row: RawDiaryEntry,
  fallback?: DiaryEntryFallback,
): FoodDiaryEntry | null {
  const entryId = row.food_entry_id?.trim();
  const foodId = row.food_id?.trim() || fallback?.foodId;
  const servingId = row.serving_id?.trim() || fallback?.servingId;
  const meal = normalizeFatSecretMeal(row.meal) ?? fallback?.meal ?? null;
  const name =
    row.food_entry_name?.trim() ||
    row.food_entry_description?.trim() ||
    fallback?.foodName;
  if (!entryId || !foodId || !servingId || !meal || !name) return null;

  return {
    entryId,
    foodId,
    servingId,
    name,
    description: row.food_entry_description?.trim() || name,
    meal,
    numberOfUnits: parseDecimal(
      row.number_of_units,
      fallback?.numberOfUnits ?? 1,
    ),
    ...parseFatSecretNutritionRaw(row),
  };
}

export function parseFoodDiaryResponse(
  dateKey: string,
  payload: RawDiaryResponse,
): FoodDiaryDay {
  const entries = extractRawDiaryEntries(payload)
    .map((row) => mapDiaryEntry(row))
    .filter((entry): entry is FoodDiaryEntry => entry != null);

  const meals: FoodDiaryMealSummary[] = FATSECRET_MEALS.map((meal) => {
    const mealEntries = entries.filter((entry) => entry.meal === meal);
    return { meal, entries: mealEntries, ...sumNutrition(mealEntries) };
  });

  return {
    date: dateKey,
    meals,
    ...sumNutrition(entries),
  };
}

export async function getFoodDiaryForDate(args: {
  userOAuth: FatSecretProfileAuth;
  dateKey: string;
}): Promise<FoodDiaryDay> {
  const payload = await fatsecretSignedRequest<RawDiaryResponse>({
    method: "food_entries.get.v2",
    params: {
      date: localDateKeyToFatSecretDateInt(args.dateKey),
    },
    userOAuth: {
      token: args.userOAuth.token,
      secret: args.userOAuth.secret,
    },
  });

  return parseFoodDiaryResponse(args.dateKey, payload);
}

export async function createFoodDiaryEntry(args: {
  userOAuth: FatSecretProfileAuth;
  dateKey: string;
  meal: FatSecretMeal;
  foodId: string;
  foodName: string;
  servingId: string;
  numberOfUnits: number;
}): Promise<FoodDiaryEntry> {
  const payload = await fatsecretSignedRequest<RawDiaryResponse>({
    method: "food_entry.create",
    params: {
      date: localDateKeyToFatSecretDateInt(args.dateKey),
      meal: args.meal,
      food_id: args.foodId,
      food_entry_name: args.foodName,
      serving_id: args.servingId,
      number_of_units: args.numberOfUnits,
    },
    userOAuth: {
      token: args.userOAuth.token,
      secret: args.userOAuth.secret,
    },
  });

  const fallback: DiaryEntryFallback = {
    meal: args.meal,
    foodName: args.foodName,
    foodId: args.foodId,
    servingId: args.servingId,
    numberOfUnits: args.numberOfUnits,
  };

  const rows = extractRawDiaryEntries(payload);
  const created =
    rows
      .map((row) => mapDiaryEntry(row, fallback))
      .find((entry) => entry != null) ?? null;
  if (created) {
    return created;
  }

  // Create often succeeds with a sparse response - reload the diary for this date.
  const diary = await getFoodDiaryForDate({
    userOAuth: args.userOAuth,
    dateKey: args.dateKey,
  });
  const mealEntries =
    diary.meals.find((meal) => meal.meal === args.meal)?.entries ?? [];
  const match =
    [...mealEntries]
      .reverse()
      .find(
        (entry) =>
          entry.foodId === args.foodId &&
          entry.servingId === args.servingId &&
          Math.abs(entry.numberOfUnits - args.numberOfUnits) < 0.001,
      ) ?? mealEntries.at(-1);
  if (match) {
    return match;
  }

  throw new Error("FatSecret food_entry.create returned no entry.");
}

export async function deleteFoodDiaryEntry(args: {
  userOAuth: FatSecretProfileAuth;
  entryId: string;
}): Promise<void> {
  await fatsecretSignedRequest({
    method: "food_entry.delete",
    params: {
      food_entry_id: args.entryId,
    },
    userOAuth: {
      token: args.userOAuth.token,
      secret: args.userOAuth.secret,
    },
  });
}
