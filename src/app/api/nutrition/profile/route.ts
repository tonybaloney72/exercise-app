import { NextResponse } from "next/server";
import { FatSecretApiError, FatSecretConfigError } from "@/lib/fatsecret/errors";
import {
  ensureNutritionFatSecretProfile,
  getNutritionFatSecretProfileStatus,
} from "@/lib/nutrition/fatsecretProfileRepo";
import { requireNutritionUser } from "@/lib/nutrition/requireNutritionApiAccess";

function profileResponse(
  status: Awaited<ReturnType<typeof getNutritionFatSecretProfileStatus>>,
) {
  return NextResponse.json(status);
}

function handleProfileError(error: unknown) {
  if (error instanceof FatSecretConfigError) {
    console.error("[nutrition/profile] config", error.message);
    return NextResponse.json(
      { error: "Nutrition profile is not configured on the server." },
      { status: 503 },
    );
  }

  if (error instanceof FatSecretApiError) {
    console.error("[nutrition/profile] fatsecret", error.code, error.message);
    return NextResponse.json(
      { error: "Could not connect your nutrition profile. Try again later." },
      { status: 502 },
    );
  }

  console.error("[nutrition/profile] unexpected", error);
  return NextResponse.json(
    { error: "Could not load nutrition profile." },
    { status: 500 },
  );
}

export async function GET() {
  const user = await requireNutritionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in with an account to use nutrition logging." },
      { status: 401 },
    );
  }

  try {
    return profileResponse(await getNutritionFatSecretProfileStatus(user.userId));
  } catch (error) {
    return handleProfileError(error);
  }
}

export async function POST() {
  const user = await requireNutritionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in with an account to use nutrition logging." },
      { status: 401 },
    );
  }

  try {
    return profileResponse(await ensureNutritionFatSecretProfile(user.userId));
  } catch (error) {
    return handleProfileError(error);
  }
}
