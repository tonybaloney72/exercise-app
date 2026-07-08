import { NextResponse } from "next/server";
import { getFoodDetail } from "@/lib/fatsecret/foodDetail";
import { nutritionApiErrorResponse } from "@/lib/nutrition/nutritionApiErrors";
import { requireNutritionApiAccess } from "@/lib/nutrition/requireNutritionApiAccess";

type RouteContext = { params: Promise<{ foodId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireNutritionApiAccess();
  if (!access) {
    return NextResponse.json({ error: "Sign in or continue as guest." }, { status: 401 });
  }

  const { foodId: rawFoodId } = await context.params;
  const foodId = rawFoodId?.trim();
  if (!foodId) {
    return NextResponse.json({ error: "Missing food id." }, { status: 400 });
  }

  try {
    const food = await getFoodDetail(foodId);
    if (!food) {
      return NextResponse.json({ error: "Food not found." }, { status: 404 });
    }
    return NextResponse.json(food);
  } catch (error) {
    return nutritionApiErrorResponse(
      "foods",
      error,
      "Could not load food details.",
    );
  }
}
