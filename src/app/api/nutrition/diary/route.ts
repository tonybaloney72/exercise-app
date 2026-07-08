import { NextResponse } from "next/server";
import {
  createFoodDiaryEntry,
  deleteFoodDiaryEntry,
  getFoodDiaryForDate,
} from "@/lib/fatsecret/foodDiary";
import { isFatSecretMeal } from "@/lib/nutrition/fatsecretMeals";
import { nutritionApiErrorResponse } from "@/lib/nutrition/nutritionApiErrors";
import { requireNutritionUser } from "@/lib/nutrition/requireNutritionApiAccess";
import { requireUserFatSecretOAuth } from "@/lib/nutrition/requireUserFatSecretOAuth";
import { formatLocalDateKey, parseLocalDateKey } from "@/utils/localDateKey";

function parseDateParam(value: string | null): string | null {
  const dateKey = value?.trim() || formatLocalDateKey();
  return parseLocalDateKey(dateKey) ? dateKey : null;
}

export async function GET(request: Request) {
  const user = await requireNutritionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in with an account to view your food diary." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const dateKey = parseDateParam(url.searchParams.get("date"));
  if (!dateKey) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  try {
    const oauth = await requireUserFatSecretOAuth(user.userId);
    const diary = await getFoodDiaryForDate({ userOAuth: oauth, dateKey });
    return NextResponse.json(diary);
  } catch (error) {
    return nutritionApiErrorResponse(
      "diary",
      error,
      "Could not load your food diary.",
    );
  }
}

export async function POST(request: Request) {
  const user = await requireNutritionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in with an account to log food." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = body as {
    date?: string;
    meal?: string;
    foodId?: string;
    foodName?: string;
    servingId?: string;
    numberOfUnits?: number;
  };

  const dateKey = parseDateParam(payload.date ?? null);
  const meal = payload.meal?.trim().toLowerCase();
  const foodId = payload.foodId?.trim();
  const foodName = payload.foodName?.trim();
  const servingId = payload.servingId?.trim();
  const numberOfUnits = payload.numberOfUnits;

  if (!dateKey) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  if (!meal || !isFatSecretMeal(meal)) {
    return NextResponse.json({ error: "Invalid meal." }, { status: 400 });
  }
  if (!foodId || !foodName || !servingId) {
    return NextResponse.json({ error: "Missing food details." }, { status: 400 });
  }
  if (
    numberOfUnits == null ||
    !Number.isFinite(numberOfUnits) ||
    numberOfUnits <= 0 ||
    numberOfUnits > 999
  ) {
    return NextResponse.json({ error: "Invalid serving amount." }, { status: 400 });
  }

  try {
    const oauth = await requireUserFatSecretOAuth(user.userId);
    const entry = await createFoodDiaryEntry({
      userOAuth: oauth,
      dateKey,
      meal,
      foodId,
      foodName,
      servingId,
      numberOfUnits,
    });
    return NextResponse.json({ entry });
  } catch (error) {
    return nutritionApiErrorResponse("diary", error, "Could not log that food.");
  }
}

export async function DELETE(request: Request) {
  const user = await requireNutritionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in with an account to edit your food diary." },
      { status: 401 },
    );
  }

  const entryId = new URL(request.url).searchParams.get("entryId")?.trim();
  if (!entryId) {
    return NextResponse.json({ error: "Missing entryId." }, { status: 400 });
  }

  try {
    const oauth = await requireUserFatSecretOAuth(user.userId);
    await deleteFoodDiaryEntry({ userOAuth: oauth, entryId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return nutritionApiErrorResponse("diary", error, "Could not remove that entry.");
  }
}
