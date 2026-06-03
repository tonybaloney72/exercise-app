import { describe, expect, it } from "vitest";
import {
  buildWeightChartSeries,
  sanitizeWeightLog,
  upsertWeightEntry,
} from "@/lib/weightLog";

describe("weightLog", () => {
  it("sanitizes and dedupes by date", () => {
    const log = sanitizeWeightLog([
      { date: "2026-05-10", weightLb: 180 },
      { date: "2026-05-10", weightLb: 181 },
      { date: "bad", weightLb: 100 },
      { date: "2026-05-12", weightLb: -1 },
      { date: "2026-05-11", weightLb: 179.5 },
    ]);
    expect(log).toEqual([
      { date: "2026-05-10", weightLb: 181 },
      { date: "2026-05-11", weightLb: 179.5 },
    ]);
  });

  it("upserts one entry per day", () => {
    const a = upsertWeightEntry([], "2026-05-01", 200);
    const b = upsertWeightEntry(a, "2026-05-02", 199);
    const c = upsertWeightEntry(b, "2026-05-01", 198);
    expect(c).toEqual([
      { date: "2026-05-01", weightLb: 198 },
      { date: "2026-05-02", weightLb: 199 },
    ]);
  });

  it("builds chart series with short labels", () => {
    const series = buildWeightChartSeries([
      { date: "2026-05-10", weightLb: 180 },
      { date: "2026-05-17", weightLb: 178 },
    ]);
    expect(series).toHaveLength(2);
    expect(series[0]!.xLabel).toMatch(/^\d+\/\d+$/);
    expect(series[1]!.weightLb).toBe(178);
  });
});
