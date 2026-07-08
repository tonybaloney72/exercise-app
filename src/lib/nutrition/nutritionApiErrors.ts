import { NextResponse } from "next/server";
import { FatSecretApiError, FatSecretConfigError } from "@/lib/fatsecret/errors";

export function nutritionApiErrorResponse(
  scope: string,
  error: unknown,
  fallbackMessage: string,
): NextResponse {
  if (error instanceof FatSecretConfigError) {
    console.error(`[nutrition/${scope}] config`, error.message);
    return NextResponse.json(
      { error: "Nutrition is not configured on the server." },
      { status: 503 },
    );
  }

  if (error instanceof FatSecretApiError) {
    console.error(`[nutrition/${scope}] fatsecret`, error.code, error.message);
    return NextResponse.json({ error: fallbackMessage }, { status: 502 });
  }

  console.error(`[nutrition/${scope}] unexpected`, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
