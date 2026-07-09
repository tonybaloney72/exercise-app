import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  FATSECRET_BARCODE_NOT_FOUND_CODE,
  findFoodByBarcode,
  isBarcodeNotFoundError,
} from "@/lib/fatsecret/foodBarcode";
import { FatSecretApiError } from "@/lib/fatsecret/errors";
import { fatsecretSignedRequest } from "@/lib/fatsecret/oauth1";

vi.mock("@/lib/fatsecret/oauth1", () => ({
  fatsecretSignedRequest: vi.fn(),
}));

describe("findFoodByBarcode", () => {
  beforeEach(() => {
    vi.mocked(fatsecretSignedRequest).mockReset();
  });

  it("parses food detail from barcode response", async () => {
    vi.mocked(fatsecretSignedRequest).mockResolvedValue({
      food: {
        food_id: "99",
        food_name: "Cereal",
        servings: {
          serving: {
            serving_id: "1",
            serving_description: "1 cup",
            calories: "100",
            protein: "2",
            carbohydrate: "20",
            fat: "1",
          },
        },
      },
    });

    const food = await findFoodByBarcode("4006381333931");
    expect(food?.foodId).toBe("99");
    expect(food?.name).toBe("Cereal");
    expect(fatsecretSignedRequest).toHaveBeenCalledWith({
      method: "food.find_id_for_barcode.v2",
      params: { barcode: "4006381333931" },
    });
  });
});

describe("isBarcodeNotFoundError", () => {
  it("detects FatSecret error 211", () => {
    expect(
      isBarcodeNotFoundError(
        new FatSecretApiError("Not found", FATSECRET_BARCODE_NOT_FOUND_CODE),
      ),
    ).toBe(true);
    expect(isBarcodeNotFoundError(new FatSecretApiError("Other", 500))).toBe(
      false,
    );
  });
});
