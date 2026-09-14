import "server-only";

import {
  parseFoodDetailResponse,
  type FoodDetail,
} from "@/lib/fatsecret/foodServing";
import { fatsecretSignedRequest } from "@/lib/fatsecret/oauth1";

type RawFoodResponse = Parameters<typeof parseFoodDetailResponse>[0];

/** Server-only: signed FatSecret food.get.v5. Client code must use /api instead. */
export async function getFoodDetail(foodId: string): Promise<FoodDetail | null> {
  const payload = await fatsecretSignedRequest<RawFoodResponse>({
    method: "food.get.v5",
    params: { food_id: foodId },
  });

  return parseFoodDetailResponse(payload);
}
