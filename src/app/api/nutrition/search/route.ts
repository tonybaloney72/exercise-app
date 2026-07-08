import { NextResponse } from "next/server";
import { FatSecretApiError, FatSecretConfigError } from "@/lib/fatsecret/errors";
import { searchFoods } from "@/lib/fatsecret/foodsSearch";
import { requireNutritionApiAccess } from "@/lib/nutrition/requireNutritionApiAccess";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 120;

export async function GET(request: Request) {
  const access = await requireNutritionApiAccess();
  if (!access) {
    return NextResponse.json({ error: "Sign in or continue as guest." }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const pageNumberRaw = url.searchParams.get("page");
  const maxResultsRaw = url.searchParams.get("maxResults");

  if (q.length < MIN_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query must be at least ${MIN_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }

  if (q.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query must be at most ${MAX_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const pageNumber = pageNumberRaw ? Number.parseInt(pageNumberRaw, 10) : 0;
  const maxResults = maxResultsRaw ? Number.parseInt(maxResultsRaw, 10) : 20;

  if (!Number.isFinite(pageNumber) || pageNumber < 0) {
    return NextResponse.json({ error: "Invalid page." }, { status: 400 });
  }

  if (!Number.isFinite(maxResults) || maxResults < 1 || maxResults > 50) {
    return NextResponse.json({ error: "maxResults must be between 1 and 50." }, { status: 400 });
  }

  try {
    const result = await searchFoods({
      expression: q,
      pageNumber,
      maxResults,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof FatSecretConfigError) {
      console.error("[nutrition/search] config", error.message);
      return NextResponse.json(
        { error: "Nutrition search is not configured." },
        { status: 503 },
      );
    }

    if (error instanceof FatSecretApiError) {
      console.error("[nutrition/search] fatsecret", error.code, error.message, error.details);
      return NextResponse.json(
        { error: "Food search failed. Try again in a moment." },
        { status: 502 },
      );
    }

    console.error("[nutrition/search] unexpected", error);
    return NextResponse.json({ error: "Food search failed." }, { status: 500 });
  }
}
