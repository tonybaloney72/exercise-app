import { describe, expect, it } from "vitest";
import { buildDailyHealthMetricChartSeries } from "@/lib/health/dailyHealthChart";

describe("buildDailyHealthMetricChartSeries", () => {
  it("orders days for chart axis", () => {
    const series = buildDailyHealthMetricChartSeries({
      "2026-05-18": 154,
      "2026-05-17": 420,
    });

    expect(series).toHaveLength(2);
    expect(series[0]?.date).toBe("2026-05-17");
    expect(series[1]?.value).toBe(154);
  });
});
