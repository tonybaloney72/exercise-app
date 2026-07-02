import { describe, expect, it } from "vitest";
import { sumHealthSampleValues } from "@/lib/health/healthSampleAggregation";

describe("sumHealthSampleValues", () => {
  it("sums positive delta buckets", () => {
    expect(
      sumHealthSampleValues([{ value: 120 }, { value: 80 }, { value: -1 }]),
    ).toBe(200);
  });
});
