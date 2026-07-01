import { describe, expect, it } from "vitest";
import {
  buildDailyHealthProgressFromRecords,
  dailyHealthDayMetricsToUpserts,
} from "@/lib/health/dailyHealthRecords";
import {
  buildDailyHealthSyncUpserts,
  shouldSyncDailyHealthForDate,
} from "@/lib/health/dailyHealthSync";
import type { HealthDailyMetricRecord } from "@/types/healthDailyMetrics";

describe("dailyHealthDayMetricsToUpserts", () => {
  it("maps HC day metrics to enabled registry keys", () => {
    const rows = dailyHealthDayMetricsToUpserts("2026-05-18", {
      steps: 4200,
      activeKcal: 310,
      avgHeartRateBpm: 72,
    });

    expect(rows.map((r) => r.metricKey).sort()).toEqual([
      "active_kcal",
      "avg_heart_rate_bpm",
      "steps",
    ]);
    expect(rows.find((r) => r.metricKey === "steps")?.valueNum).toBe(4200);
    expect(rows.find((r) => r.metricKey === "active_kcal")?.category).toBe(
      "activity",
    );
    expect(rows.find((r) => r.metricKey === "avg_heart_rate_bpm")?.category).toBe(
      "vitals",
    );
  });
});

describe("buildDailyHealthProgressFromRecords", () => {
  it("builds today stats and steps chart from stored rows", () => {
    const records: HealthDailyMetricRecord[] = [
      {
        logDate: "2026-05-17",
        category: "activity",
        metricKey: "steps",
        valueNum: 8000,
        valueJson: null,
        unit: "count",
        aggMethod: "sum",
        source: "health_connect",
        syncedAt: "2026-05-18T12:00:00.000Z",
      },
      {
        logDate: "2026-05-18",
        category: "activity",
        metricKey: "steps",
        valueNum: 4200,
        valueJson: null,
        unit: "count",
        aggMethod: "sum",
        source: "health_connect",
        syncedAt: "2026-05-18T12:00:00.000Z",
      },
      {
        logDate: "2026-05-18",
        category: "activity",
        metricKey: "active_kcal",
        valueNum: 310,
        valueJson: null,
        unit: "kcal",
        aggMethod: "sum",
        source: "health_connect",
        syncedAt: "2026-05-18T12:00:00.000Z",
      },
    ];

    const view = buildDailyHealthProgressFromRecords(records, "2026-05-18", [
      "2026-05-17",
      "2026-05-18",
    ]);

    expect(view.todaySteps).toBe(4200);
    expect(view.todayActiveKcal).toBe(310);
    expect(view.stepsChartSeries).toHaveLength(2);
    expect(view.stepsChartSeries[1]?.stepCount).toBe(4200);
    expect(view.activeKcalChartSeries).toHaveLength(1);
    expect(view.activeKcalChartSeries[0]?.value).toBe(310);
  });
});

describe("dailyHealthSync", () => {
  const todayMetrics = {
    steps: 4200,
    activeKcal: 310,
    avgHeartRateBpm: 72,
  };

  it("syncs a new day immediately", () => {
    expect(
      shouldSyncDailyHealthForDate({
        logDate: "2026-05-18",
        todayKey: "2026-05-18",
        metrics: todayMetrics,
        snapshot: { version: 1, lastTodaySyncAtMs: 0, byDate: {} },
        nowMs: Date.now(),
      }),
    ).toBe(true);
  });

  it("skips unchanged today metrics inside throttle window", () => {
    const snapshot = {
      version: 1 as const,
      lastTodaySyncAtMs: Date.now(),
      byDate: {
        "2026-05-18": {
          steps: 4200,
          active_kcal: 310,
          avg_heart_rate_bpm: 72,
        },
      },
    };

    expect(
      shouldSyncDailyHealthForDate({
        logDate: "2026-05-18",
        todayKey: "2026-05-18",
        metrics: todayMetrics,
        snapshot,
        nowMs: Date.now(),
      }),
    ).toBe(false);
  });

  it("builds upserts only for changed days", () => {
    const { upserts } = buildDailyHealthSyncUpserts({
      todayKey: "2026-05-18",
      metricsByDate: {
        "2026-05-17": { steps: 8000, activeKcal: 500 },
        "2026-05-18": todayMetrics,
      },
      snapshot: {
        version: 1,
        lastTodaySyncAtMs: 0,
        byDate: {
          "2026-05-17": { steps: 8000, active_kcal: 500 },
        },
      },
      nowMs: Date.now(),
    });

    expect(upserts.every((row) => row.logDate === "2026-05-18")).toBe(true);
    expect(upserts.length).toBe(3);
  });
});
