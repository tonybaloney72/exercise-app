import { describe, expect, it } from "vitest";
import {
  localDayHealthWindow,
  lastNLocalDateKeys,
} from "@/lib/health/cardioHealth";
import { buildDailyStepsChartSeries } from "@/lib/health/dailyStepsChart";

describe("localDayHealthWindow", () => {
  it("uses midnight through now for today", () => {
    const now = new Date(2026, 4, 18, 15, 30, 0);
    const { start, end } = localDayHealthWindow("2026-05-18", now);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(4);
    expect(start.getDate()).toBe(18);
    expect(start.getHours()).toBe(0);
    expect(end.getTime()).toBe(now.getTime());
  });

  it("uses full calendar day for past dates", () => {
    const now = new Date(2026, 4, 18, 15, 30, 0);
    const { start, end } = localDayHealthWindow("2026-05-17", now);
    expect(start.getDate()).toBe(17);
    expect(end.getDate()).toBe(17);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });
});

describe("lastNLocalDateKeys", () => {
  it("returns consecutive local date keys ending today", () => {
    const now = new Date(2026, 4, 18, 12, 0, 0);
    expect(lastNLocalDateKeys(3, now)).toEqual([
      "2026-05-16",
      "2026-05-17",
      "2026-05-18",
    ]);
  });
});

describe("buildDailyStepsChartSeries", () => {
  it("sorts chart points by date", () => {
    const series = buildDailyStepsChartSeries({
      "2026-05-17": 8000,
      "2026-05-16": 6000,
      "2026-05-18": 4200,
    });
    expect(series.map((p) => p.date)).toEqual([
      "2026-05-16",
      "2026-05-17",
      "2026-05-18",
    ]);
    expect(series[2]?.stepCount).toBe(4200);
  });
});
