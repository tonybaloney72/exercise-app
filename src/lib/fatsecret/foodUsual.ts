import { fatsecretSignedRequest } from "@/lib/fatsecret/oauth1";
import type { FatSecretProfileAuth } from "@/lib/fatsecret/profile";
import { normalizeFatSecretList } from "@/lib/fatsecret/normalize";
import type { FatSecretMeal } from "@/lib/nutrition/fatsecretMeals";

export type UsualFoodSource = "most_eaten" | "favorite";

export type UsualFoodItem = {
  foodId: string;
  name: string;
  brandName: string | null;
  foodType: string | null;
  description: string | null;
  servingId: string | null;
  numberOfUnits: number | null;
  source: UsualFoodSource;
  isFavorite: boolean;
};

type RawUsualFood = {
  food_id?: string;
  food_name?: string;
  brand_name?: string;
  food_type?: string;
  food_description?: string;
  food_url?: string;
  serving_id?: string;
  number_of_units?: string;
};

type RawFoodsResponse = {
  foods?: {
    food?: RawUsualFood | RawUsualFood[];
  };
};

function parseDecimal(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractRawFoods(payload: unknown): RawUsualFood[] {
  if (!payload || typeof payload !== "object") return [];
  const foods = (payload as RawFoodsResponse).foods?.food;
  return normalizeFatSecretList(foods);
}

function mapUsualFoodRow(
  row: RawUsualFood,
  source: UsualFoodSource,
  isFavorite: boolean,
): UsualFoodItem | null {
  const foodId = row.food_id?.trim();
  const name = row.food_name?.trim();
  if (!foodId || !name) return null;

  return {
    foodId,
    name,
    brandName: row.brand_name?.trim() || null,
    foodType: row.food_type?.trim() || null,
    description: row.food_description?.trim() || null,
    servingId: row.serving_id?.trim() || null,
    numberOfUnits: parseDecimal(row.number_of_units),
    source,
    isFavorite,
  };
}

export function parseUsualFoodsResponse(
  payload: unknown,
  source: UsualFoodSource,
  isFavorite: boolean,
): UsualFoodItem[] {
  return extractRawFoods(payload)
    .map((row) => mapUsualFoodRow(row, source, isFavorite))
    .filter((item): item is UsualFoodItem => item != null);
}

/**
 * Usual list is meal-scoped: only most-eaten for this meal.
 * Favorites mark matching rows with ★ but are not appended on their own
 * (FatSecret favorites are global and would leak across meals).
 */
export function mergeUsualFoods(args: {
  mostEaten: UsualFoodItem[];
  favorites: UsualFoodItem[];
  limit?: number;
}): UsualFoodItem[] {
  const limit = Math.min(Math.max(args.limit ?? 4, 1), 20);
  const favoriteIds = new Set(args.favorites.map((item) => item.foodId));
  const seen = new Set<string>();
  const out: UsualFoodItem[] = [];

  for (const item of args.mostEaten) {
    if (seen.has(item.foodId)) continue;
    seen.add(item.foodId);
    out.push({
      ...item,
      source: "most_eaten",
      isFavorite: favoriteIds.has(item.foodId),
    });
    if (out.length >= limit) break;
  }

  return out;
}

async function getMostEatenFoods(args: {
  userOAuth: FatSecretProfileAuth;
  meal: FatSecretMeal;
}): Promise<UsualFoodItem[]> {
  const payload = await fatsecretSignedRequest<RawFoodsResponse>({
    method: "foods.get_most_eaten.v2",
    params: { meal: args.meal },
    userOAuth: {
      token: args.userOAuth.token,
      secret: args.userOAuth.secret,
    },
  });

  return parseUsualFoodsResponse(payload, "most_eaten", false);
}

async function getFavoriteFoods(args: {
  userOAuth: FatSecretProfileAuth;
}): Promise<UsualFoodItem[]> {
  const payload = await fatsecretSignedRequest<RawFoodsResponse>({
    method: "foods.get_favorites.v2",
    userOAuth: {
      token: args.userOAuth.token,
      secret: args.userOAuth.secret,
    },
  });

  return parseUsualFoodsResponse(payload, "favorite", true);
}

export async function addFavoriteFood(args: {
  userOAuth: FatSecretProfileAuth;
  foodId: string;
  servingId?: string | null;
  numberOfUnits?: number | null;
}): Promise<void> {
  const params: Record<string, string | number | undefined> = {
    food_id: args.foodId,
  };
  if (args.servingId) {
    params.serving_id = args.servingId;
    if (args.numberOfUnits != null && Number.isFinite(args.numberOfUnits)) {
      params.number_of_units = args.numberOfUnits;
    }
  }

  await fatsecretSignedRequest({
    method: "food.add_favorite",
    params,
    userOAuth: {
      token: args.userOAuth.token,
      secret: args.userOAuth.secret,
    },
  });
}

export async function deleteFavoriteFood(args: {
  userOAuth: FatSecretProfileAuth;
  foodId: string;
  servingId?: string | null;
  numberOfUnits?: number | null;
}): Promise<void> {
  const params: Record<string, string | number | undefined> = {
    food_id: args.foodId,
  };
  if (args.servingId) {
    params.serving_id = args.servingId;
    if (args.numberOfUnits != null && Number.isFinite(args.numberOfUnits)) {
      params.number_of_units = args.numberOfUnits;
    }
  }

  await fatsecretSignedRequest({
    method: "food.delete_favorite",
    params,
    userOAuth: {
      token: args.userOAuth.token,
      secret: args.userOAuth.secret,
    },
  });
}

export async function getUsualFoodsForMeal(args: {
  userOAuth: FatSecretProfileAuth;
  meal: FatSecretMeal;
  limit?: number;
}): Promise<UsualFoodItem[]> {
  const [mostEaten, favorites] = await Promise.all([
    getMostEatenFoods({ userOAuth: args.userOAuth, meal: args.meal }),
    getFavoriteFoods({ userOAuth: args.userOAuth }),
  ]);

  return mergeUsualFoods({
    mostEaten,
    favorites,
    limit: args.limit,
  });
}
