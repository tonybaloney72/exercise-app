import { describe, expect, it } from "vitest";
import {
  buildHealthRecordLogEntries,
  buildHourlyHealthSeries,
  buildHourlySeriesFromTotals,
  hourlySeriesHasData,
} from "@/lib/health/healthTodayDetail";
import type { HealthDayRecord } from "@/lib/health/healthConnectTypes";

const ref = new Date(2026, 6, 9, 15, 30, 0);

function localIso(hour: number, minute = 0): string {
  return new Date(2026, 6, 9, hour, minute).toISOString();
}

describe("buildHourlyHealthSeries", () => {
  it("sums steps by start hour", () => {
    const records: HealthDayRecord[] = [
      {
        startTime: localIso(8, 15),
        endTime: localIso(8, 45),
        value: 400,
        unit: "count",
      },
      {
        startTime: localIso(9, 0),
        endTime: localIso(9, 10),
        value: 250,
        unit: "count",
      },
    ];

    const series = buildHourlyHealthSeries(records, {
      aggregation: "sum",
      slug: "steps",
      ref,
    });

    const hour8 = series.find((row) => row.hour === 8);
    const hour9 = series.find((row) => row.hour === 9);
    expect(hour8?.value).toBe(400);
    expect(hour9?.value).toBe(250);
    expect(hourlySeriesHasData(series)).toBe(true);
  });

  it("averages heart rate readings per hour", () => {
    const records: HealthDayRecord[] = [
      {
        startTime: localIso(14, 0),
        value: 60,
        unit: "bpm",
      },
      {
        startTime: localIso(14, 30),
        value: 80,
        unit: "bpm",
      },
    ];

    const series = buildHourlyHealthSeries(records, {
      aggregation: "avg",
      slug: "heart-rate",
      ref,
    });

    const hour14 = series.find((row) => row.hour === 14);
    expect(hour14?.value).toBe(70);
  });
});

describe("buildHourlySeriesFromTotals", () => {
  it("maps native hourly totals to chart points", () => {
    const series = buildHourlySeriesFromTotals([
      { hour: 7, value: 1405 },
      { hour: 13, value: 316 },
    ]);
    expect(series).toHaveLength(2);
    expect(series[0]?.hour).toBe(7);
    expect(series[0]?.value).toBe(1405);
    expect(series[1]?.value).toBe(316);
  });
});

describe("buildHealthRecordLogEntries", () => {
  it("formats newest-first log rows", () => {
    const entries = buildHealthRecordLogEntries(
      [
        {
          startTime: "2026-07-09T08:00:00.000Z",
          endTime: "2026-07-09T08:30:00.000Z",
          value: 900,
          unit: "count",
          sourceName: "Samsung Health",
        },
      ],
      "steps",
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.detailLabel).toBe("900 steps");
    expect(entries[0]?.sourceName).toBe("Samsung Health");
  });
});
