import { describe, expect, it } from "vitest";
import {
  filterWeightEntriesByRange,
  weightRangeFromDate,
} from "@/lib/weightRangePresets";

describe("weightRangePresets", () => {
  const ref = new Date(2026, 5, 15, 12, 0, 0, 0);

  it("returns null for all time", () => {
    expect(weightRangeFromDate("all", ref)).toBeNull();
  });

  it("computes month and year lookbacks", () => {
    expect(weightRangeFromDate("1mo", ref)).toBe("2026-05-15");
    expect(weightRangeFromDate("1y", ref)).toBe("2025-06-15");
  });

  it("filters entries from the computed start date", () => {
    const entries = [
      { date: "2026-04-01", weightLb: 180 },
      { date: "2026-05-20", weightLb: 175 },
      { date: "2026-06-10", weightLb: 174 },
    ];
    const filtered = filterWeightEntriesByRange(entries, "1mo", ref);
    expect(filtered.map((e) => e.date)).toEqual(["2026-05-20", "2026-06-10"]);
  });
});
