import { describe, expect, it } from "vitest";
import { stretchCountsFingerprint } from "@/lib/stretchCounts";

describe("stretchCounts", () => {
  it("builds a stable fingerprint from warm and cool counts", () => {
    expect(stretchCountsFingerprint(4, 5)).toBe("st:w4|c5");
    expect(stretchCountsFingerprint(4, 5)).toBe(stretchCountsFingerprint(4, 5));
    expect(stretchCountsFingerprint(3, 5)).not.toBe(stretchCountsFingerprint(4, 5));
  });
});
