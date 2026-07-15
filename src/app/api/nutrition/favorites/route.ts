import { NextResponse } from "next/server";
import {
  addFavoriteFood,
  deleteFavoriteFood,
} from "@/lib/fatsecret/foodUsual";
import { nutritionApiErrorResponse } from "@/lib/nutrition/nutritionApiErrors";
import { requireNutritionUser } from "@/lib/nutrition/requireNutritionApiAccess";
import { requireUserFatSecretOAuth } from "@/lib/nutrition/requireUserFatSecretOAuth";

type FavoriteBody = {
  foodId?: string;
  servingId?: string;
  numberOfUnits?: number;
};

function parseFavoriteBody(body: unknown): {
  foodId: string;
  servingId: string | null;
  numberOfUnits: number | null;
} | null {
  const payload = body as FavoriteBody;
  const foodId = payload.foodId?.trim();
  if (!foodId) return null;
  const servingId = payload.servingId?.trim() || null;
  const numberOfUnits =
    payload.numberOfUnits != null && Number.isFinite(payload.numberOfUnits)
      ? payload.numberOfUnits
      : null;
  return { foodId, servingId, numberOfUnits };
}

export async function POST(request: Request) {
  const user = await requireNutritionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in with an account to save favorites." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseFavoriteBody(body);
  if (!parsed) {
    return NextResponse.json({ error: "Missing foodId." }, { status: 400 });
  }

  try {
    const oauth = await requireUserFatSecretOAuth(user.userId);
    await addFavoriteFood({
      userOAuth: oauth,
      foodId: parsed.foodId,
      servingId: parsed.servingId,
      numberOfUnits: parsed.numberOfUnits,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return nutritionApiErrorResponse(
      "favorites",
      error,
      "Could not add that favorite.",
    );
  }
}

export async function DELETE(request: Request) {
  const user = await requireNutritionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in with an account to edit favorites." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const foodId = url.searchParams.get("foodId")?.trim();
  if (!foodId) {
    return NextResponse.json({ error: "Missing foodId." }, { status: 400 });
  }
  const servingId = url.searchParams.get("servingId")?.trim() || null;
  const unitsRaw = url.searchParams.get("numberOfUnits");
  const numberOfUnits =
    unitsRaw != null && unitsRaw !== ""
      ? Number.parseFloat(unitsRaw)
      : null;

  try {
    const oauth = await requireUserFatSecretOAuth(user.userId);
    await deleteFavoriteFood({
      userOAuth: oauth,
      foodId,
      servingId,
      numberOfUnits:
        numberOfUnits != null && Number.isFinite(numberOfUnits)
          ? numberOfUnits
          : null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return nutritionApiErrorResponse(
      "favorites",
      error,
      "Could not remove that favorite.",
    );
  }
}
