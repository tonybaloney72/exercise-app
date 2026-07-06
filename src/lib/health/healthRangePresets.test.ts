import { describe, expect, it } from "vitest";
import {
  filterEntriesByHealthRange,
  healthRangeFromDate,
} from "@/lib/health/healthRangePresets";

describe("healthRangePresets", () => {
  const ref = new Date(2026, 6, 6, 12, 0, 0);

  it("filters today to a single day", () => {
    expect(healthRangeFromDate("today", ref)).toBe("2026-07-06");
    const entries = [
      { date: "2026-07-05", value: 1 },
      { date: "2026-07-06", value: 2 },
    ];
    expect(filterEntriesByHealthRange(entries, "today", ref)).toEqual([
      { date: "2026-07-06", value: 2 },
    ]);
  });

  it("filters week to seven inclusive days", () => {
    expect(healthRangeFromDate("week", ref)).toBe("2026-06-30");
    const entries = [
      { date: "2026-06-29", value: 1 },
      { date: "2026-06-30", value: 2 },
      { date: "2026-07-06", value: 3 },
    ];
    expect(filterEntriesByHealthRange(entries, "week", ref).map((e) => e.date)).toEqual(
      ["2026-06-30", "2026-07-06"],
    );
  });
});
