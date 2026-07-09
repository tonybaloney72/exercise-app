import { fatsecretSignedRequest } from "@/lib/fatsecret/oauth1";
import { normalizeFatSecretList } from "@/lib/fatsecret/normalize";
import type {
  FatSecretNutritionRaw,
  FoodNutrition,
} from "@/lib/nutrition/foodNutrition";
import { parseFatSecretNutritionRaw } from "@/lib/nutrition/foodNutrition";

export type FoodServingOption = FoodNutrition & {
  servingId: string;
  description: string;
  numberOfUnits: number;
  metricServingAmount: number | null;
  metricServingUnit: string | null;
};

export type FoodDetail = {
  foodId: string;
  name: string;
  brandName: string | null;
  foodType: string | null;
  servings: FoodServingOption[];
};

type RawServing = FatSecretNutritionRaw & {
  serving_id?: string;
  serving_description?: string;
  number_of_units?: string;
  metric_serving_amount?: string;
  metric_serving_unit?: string;
};

type RawFoodResponse = {
  food?: {
    food_id?: string;
    food_name?: string;
    brand_name?: string;
    food_type?: string;
    servings?: {
      serving?: RawServing | RawServing[];
    };
  };
};

function parseDecimal(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mapServing(row: RawServing): FoodServingOption | null {
  const servingId = row.serving_id?.trim();
  const description = row.serving_description?.trim();
  if (!servingId || !description) return null;

  const metricAmountRaw = row.metric_serving_amount?.trim();
  const metricAmount =
    metricAmountRaw != null && metricAmountRaw !== ""
      ? parseDecimal(metricAmountRaw)
      : null;

  return {
    servingId,
    description,
    numberOfUnits: parseDecimal(row.number_of_units, 1),
    metricServingAmount: metricAmount,
    metricServingUnit: row.metric_serving_unit?.trim() || null,
    ...parseFatSecretNutritionRaw(row),
  };
}

export function parseFoodDetailResponse(payload: RawFoodResponse): FoodDetail | null {
  const food = payload.food;
  const foodId = food?.food_id?.trim();
  const name = food?.food_name?.trim();
  if (!foodId || !name) return null;

  const servings = normalizeFatSecretList(food?.servings?.serving)
    .map(mapServing)
    .filter((serving): serving is FoodServingOption => serving != null);

  return {
    foodId,
    name,
    brandName: food?.brand_name?.trim() || null,
    foodType: food?.food_type?.trim() || null,
    servings,
  };
}

export async function getFoodDetail(foodId: string): Promise<FoodDetail | null> {
  const payload = await fatsecretSignedRequest<RawFoodResponse>({
    method: "food.get.v2",
    params: { food_id: foodId },
  });

  return parseFoodDetailResponse(payload);
}
