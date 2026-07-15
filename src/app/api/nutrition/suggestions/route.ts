import { NextResponse } from "next/server";
import { getUsualFoodsForMeal } from "@/lib/fatsecret/foodUsual";
import { isFatSecretMeal } from "@/lib/nutrition/fatsecretMeals";
import { nutritionApiErrorResponse } from "@/lib/nutrition/nutritionApiErrors";
import { requireNutritionUser } from "@/lib/nutrition/requireNutritionApiAccess";
import { requireUserFatSecretOAuth } from "@/lib/nutrition/requireUserFatSecretOAuth";

export async function GET(request: Request) {
  const user = await requireNutritionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in with an account to view usual foods." },
      { status: 401 },
    );
  }

  const meal = new URL(request.url).searchParams.get("meal")?.trim().toLowerCase();
  if (!meal || !isFatSecretMeal(meal)) {
    return NextResponse.json({ error: "Invalid meal." }, { status: 400 });
  }

  try {
    const oauth = await requireUserFatSecretOAuth(user.userId);
    const foods = await getUsualFoodsForMeal({ userOAuth: oauth, meal });
    return NextResponse.json({ foods });
  } catch (error) {
    return nutritionApiErrorResponse(
      "suggestions",
      error,
      "Could not load usual foods.",
    );
  }
}
