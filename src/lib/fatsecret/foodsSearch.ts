import { fatsecretSignedRequest } from "@/lib/fatsecret/oauth1";

export type FatSecretFoodSearchItem = {
  foodId: string;
  name: string;
  brandName: string | null;
  foodType: string | null;
  description: string | null;
  url: string | null;
};

export type FatSecretFoodSearchResult = {
  maxResults: number;
  totalResults: number;
  pageNumber: number;
  foods: FatSecretFoodSearchItem[];
};

type RawFood = {
  food_id?: string;
  food_name?: string;
  brand_name?: string;
  food_type?: string;
  food_description?: string;
  food_url?: string;
};

type RawFoodsSearchResponse = {
  foods?: {
    max_results?: string;
    total_results?: string;
    page_number?: string;
    food?: RawFood | RawFood[];
  };
};

function parseIntField(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeFoodRows(food: RawFood | RawFood[] | undefined): RawFood[] {
  if (!food) return [];
  return Array.isArray(food) ? food : [food];
}

function mapFoodRow(row: RawFood): FatSecretFoodSearchItem {
  return {
    foodId: row.food_id ?? "",
    name: row.food_name?.trim() ?? "",
    brandName: row.brand_name?.trim() || null,
    foodType: row.food_type?.trim() || null,
    description: row.food_description?.trim() || null,
    url: row.food_url?.trim() || null,
  };
}

export function parseFoodsSearchResponse(
  payload: RawFoodsSearchResponse,
): FatSecretFoodSearchResult {
  const foodsNode = payload.foods;
  const items = normalizeFoodRows(foodsNode?.food)
    .map(mapFoodRow)
    .filter((item) => item.foodId && item.name);

  return {
    maxResults: parseIntField(foodsNode?.max_results, items.length),
    totalResults: parseIntField(foodsNode?.total_results, items.length),
    pageNumber: parseIntField(foodsNode?.page_number, 0),
    foods: items,
  };
}

export async function searchFoods(args: {
  expression: string;
  pageNumber?: number;
  maxResults?: number;
}): Promise<FatSecretFoodSearchResult> {
  const maxResults = Math.min(Math.max(args.maxResults ?? 20, 1), 50);
  const pageNumber = Math.max(args.pageNumber ?? 0, 0);

  const payload = await fatsecretSignedRequest<RawFoodsSearchResponse>({
    method: "foods.search",
    params: {
      search_expression: args.expression.trim(),
      page_number: pageNumber,
      max_results: maxResults,
      generic_description: "portion",
    },
  });

  return parseFoodsSearchResponse(payload);
}
