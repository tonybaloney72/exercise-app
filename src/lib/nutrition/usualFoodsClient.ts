"use client";

import { resolveApiUrl } from "@/lib/apiBaseUrl";
import type { UsualFoodItem } from "@/lib/fatsecret/foodUsual";
import type { FatSecretMeal } from "@/lib/nutrition/fatsecretMeals";

export async function fetchUsualFoods(
  meal: FatSecretMeal,
): Promise<
  { ok: true; foods: UsualFoodItem[] } | { ok: false; error: string }
> {
  try {
    const res = await fetch(
      resolveApiUrl(
        `/api/nutrition/suggestions?meal=${encodeURIComponent(meal)}`,
      ),
    );
    const payload = (await res.json()) as
      | { foods?: UsualFoodItem[] }
      | { error?: string };
    if (!res.ok) {
      return {
        ok: false,
        error:
          "error" in payload && payload.error
            ? payload.error
            : "Could not load usual foods.",
      };
    }
    return {
      ok: true,
      foods: "foods" in payload ? (payload.foods ?? []) : [],
    };
  } catch {
    return { ok: false, error: "Could not load usual foods." };
  }
}

export async function setFoodFavorite(args: {
  foodId: string;
  favorite: boolean;
  servingId?: string | null;
  numberOfUnits?: number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (args.favorite) {
      const res = await fetch(resolveApiUrl("/api/nutrition/favorites"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodId: args.foodId,
          servingId: args.servingId ?? undefined,
          numberOfUnits: args.numberOfUnits ?? undefined,
        }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        return { ok: false, error: payload.error ?? "Could not add favorite." };
      }
      return { ok: true };
    }

    const params = new URLSearchParams({ foodId: args.foodId });
    if (args.servingId) params.set("servingId", args.servingId);
    if (args.numberOfUnits != null) {
      params.set("numberOfUnits", String(args.numberOfUnits));
    }
    const res = await fetch(
      resolveApiUrl(`/api/nutrition/favorites?${params.toString()}`),
      { method: "DELETE" },
    );
    const payload = (await res.json()) as { error?: string };
    if (!res.ok) {
      return {
        ok: false,
        error: payload.error ?? "Could not remove favorite.",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not update favorite." };
  }
}
