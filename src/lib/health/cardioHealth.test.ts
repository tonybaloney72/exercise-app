import { describe, expect, it } from "vitest";
import { healthConnectAggregatedDayValue } from "@/lib/health/cardioHealth";

describe("healthConnectAggregatedDayValue", () => {
  it("returns 0 when HC returns no buckets", () => {
    expect(healthConnectAggregatedDayValue([])).toBe(0);
  });

  it("uses a single HC day bucket as-is", () => {
    expect(healthConnectAggregatedDayValue([{ value: 2795 }])).toBe(2795);
  });

  it("sums multiple HC time segments for the same day window", () => {
    expect(
      healthConnectAggregatedDayValue([{ value: 1156 }, { value: 1639 }]),
    ).toBe(2795);
  });
});
