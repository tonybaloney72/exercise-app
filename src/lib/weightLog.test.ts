import { describe, expect, it } from "vitest";
import {
  buildWeightChartSeries,
  getWeightForDateOrNearestPrior,
  mergeWeightEntries,
  normalizeWeightDateKey,
  sanitizeWeightLog,
  upsertWeightEntry,
  weightChartSpansYears,
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
    expect(series[0]!.index).toBe(0);
    expect(series[0]!.xLabel).toMatch(/^\d+\/\d+$/);
    expect(series[1]!.weightLb).toBe(178);
  });

  it("keeps one point per entry across years (unique date keys)", () => {
    const log = [
      { date: "2024-05-18", weightLb: 190 },
      { date: "2025-05-18", weightLb: 185 },
      { date: "2026-05-18", weightLb: 180 },
    ];
    const series = buildWeightChartSeries(log);
    expect(series).toHaveLength(3);
    expect(new Set(series.map((p) => p.date)).size).toBe(3);
    expect(weightChartSpansYears(series)).toBe(true);
    expect(series[0]!.xLabel).toContain("/24");
  });

  it("merges sources with later entries winning on the same day", () => {
    const merged = mergeWeightEntries(
      [
        { date: "2026-06-03", weightLb: 190 },
        { date: "2026-06-10", weightLb: 188 },
      ],
      [
        { date: "2026-06-03", weightLb: 189 },
        { date: "2026-06-15", weightLb: 187 },
      ],
    );
    expect(merged).toEqual([
      { date: "2026-06-03", weightLb: 189 },
      { date: "2026-06-10", weightLb: 188 },
      { date: "2026-06-15", weightLb: 187 },
    ]);
  });

  it("normalizes ISO timestamps and string weights", () => {
    const log = sanitizeWeightLog([
      { date: "2026-05-10T00:00:00.000Z", weightLb: "180.5" },
    ]);
    expect(log).toEqual([{ date: "2026-05-10", weightLb: 180.5 }]);
    expect(normalizeWeightDateKey(" 2026-05-10 ")).toBe("2026-05-10");
  });

  it("finds nearest prior weight when the day is missing", () => {
    const log = [
      { date: "2026-07-01", weightLb: 180 },
      { date: "2026-07-08", weightLb: 178 },
    ];
    expect(getWeightForDateOrNearestPrior(log, "2026-07-09")?.weightLb).toBe(178);
    expect(getWeightForDateOrNearestPrior(log, "2026-07-05")?.weightLb).toBe(180);
  });
});
