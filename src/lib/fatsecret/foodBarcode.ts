import { FatSecretApiError } from "@/lib/fatsecret/errors";
import {
  parseFoodDetailResponse,
  type FoodDetail,
} from "@/lib/fatsecret/foodDetail";
import { fatsecretSignedRequest } from "@/lib/fatsecret/oauth1";

type RawFoodResponse = Parameters<typeof parseFoodDetailResponse>[0];

export const FATSECRET_BARCODE_NOT_FOUND_CODE = 211;

export async function findFoodByBarcode(gtin13: string): Promise<FoodDetail | null> {
  const payload = await fatsecretSignedRequest<RawFoodResponse>({
    method: "food.find_id_for_barcode.v2",
    params: { barcode: gtin13 },
  });

  return parseFoodDetailResponse(payload);
}

export function isBarcodeNotFoundError(error: unknown): boolean {
  return (
    error instanceof FatSecretApiError &&
    error.code === FATSECRET_BARCODE_NOT_FOUND_CODE
  );
}
