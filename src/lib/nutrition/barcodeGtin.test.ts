import { describe, expect, it } from "vitest";
import {
  isValidGtin13,
  normalizeBarcodeToGtin13,
} from "@/lib/nutrition/barcodeGtin";

describe("normalizeBarcodeToGtin13", () => {
  it("left-pads UPC-A (12 digits) to GTIN-13", () => {
    expect(normalizeBarcodeToGtin13("012345678905")).toBe("0012345678905");
  });

  it("keeps EAN-13 as-is", () => {
    expect(normalizeBarcodeToGtin13("4006381333931")).toBe("4006381333931");
  });

  it("strips spaces and dashes from scanned values", () => {
    expect(normalizeBarcodeToGtin13("4006 3813 33931")).toBe("4006381333931");
  });

  it("rejects empty and overlong codes", () => {
    expect(normalizeBarcodeToGtin13("")).toBeNull();
    expect(normalizeBarcodeToGtin13("12345678901234")).toBeNull();
  });
});

describe("isValidGtin13", () => {
  it("accepts 13 digits", () => {
    expect(isValidGtin13("4006381333931")).toBe(true);
    expect(isValidGtin13("0123")).toBe(false);
  });
});
