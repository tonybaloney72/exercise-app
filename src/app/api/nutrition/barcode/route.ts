import { NextResponse } from "next/server";
import {
  findFoodByBarcode,
  isBarcodeNotFoundError,
} from "@/lib/fatsecret/foodBarcode";
import { FatSecretApiError, FatSecretConfigError } from "@/lib/fatsecret/errors";
import {
  isValidGtin13,
  normalizeBarcodeToGtin13,
} from "@/lib/nutrition/barcodeGtin";
import { requireNutritionApiAccess } from "@/lib/nutrition/requireNutritionApiAccess";

export async function GET(request: Request) {
  const access = await requireNutritionApiAccess();
  if (!access) {
    return NextResponse.json({ error: "Sign in or continue as guest." }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawCode = url.searchParams.get("code")?.trim() ?? "";
  if (!rawCode) {
    return NextResponse.json({ error: "Missing barcode." }, { status: 400 });
  }

  const gtin13 = normalizeBarcodeToGtin13(rawCode);
  if (!gtin13 || !isValidGtin13(gtin13)) {
    return NextResponse.json({ error: "Invalid barcode." }, { status: 400 });
  }

  try {
    const food = await findFoodByBarcode(gtin13);
    if (!food) {
      return NextResponse.json(
        { error: "No food found for this barcode." },
        { status: 404 },
      );
    }
    return NextResponse.json(food);
  } catch (error) {
    if (error instanceof FatSecretConfigError) {
      console.error("[nutrition/barcode] config", error.message);
      return NextResponse.json(
        { error: "Nutrition search is not configured." },
        { status: 503 },
      );
    }

    if (isBarcodeNotFoundError(error)) {
      return NextResponse.json(
        { error: "No food found for this barcode." },
        { status: 404 },
      );
    }

    if (error instanceof FatSecretApiError) {
      console.error("[nutrition/barcode] fatsecret", error.code, error.message);
      return NextResponse.json(
        { error: "Barcode lookup failed. Try again in a moment." },
        { status: 502 },
      );
    }

    console.error("[nutrition/barcode] unexpected", error);
    return NextResponse.json({ error: "Barcode lookup failed." }, { status: 500 });
  }
}
