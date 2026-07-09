import { resolveApiUrl } from "@/lib/apiBaseUrl";
import type { FoodDetail } from "@/lib/fatsecret/foodDetail";

export type BarcodeLookupResult =
  | { ok: true; food: FoodDetail }
  | { ok: false; error: string };

export async function fetchFoodByBarcode(code: string): Promise<BarcodeLookupResult> {
  const res = await fetch(
    resolveApiUrl(`/api/nutrition/barcode?code=${encodeURIComponent(code)}`),
  );
  const payload = (await res.json()) as FoodDetail | { error?: string };
  if (!res.ok || !("foodId" in payload)) {
    return {
      ok: false,
      error:
        payload && "error" in payload && payload.error
          ? payload.error
          : "Could not look up that barcode.",
    };
  }
  return { ok: true, food: payload };
}
