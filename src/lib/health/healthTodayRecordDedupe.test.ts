import { describe, expect, it } from "vitest";
import { dedupeOverlappingHealthDayRecords } from "@/lib/health/healthTodayRecordDedupe";
import type { HealthDayRecord } from "@/lib/health/healthConnectTypes";

describe("dedupeOverlappingHealthDayRecords", () => {
  it("keeps only the longest duplicate sleep session from the same source", () => {
    const records: HealthDayRecord[] = [
      {
        startTime: "2026-07-09T05:49:00.000Z",
        endTime: "2026-07-09T09:26:00.000Z",
        value: 217,
        unit: "min",
        sourceName: "Nothing Watch",
      },
      {
        startTime: "2026-07-09T05:49:00.000Z",
        endTime: "2026-07-09T11:11:00.000Z",
        value: 322,
        unit: "min",
        sourceName: "Nothing Watch",
      },
      {
        startTime: "2026-07-09T05:49:00.000Z",
        endTime: "2026-07-09T12:03:00.000Z",
        value: 374,
        unit: "min",
        sourceName: "Nothing Watch",
      },
    ];

    const deduped = dedupeOverlappingHealthDayRecords(records, "sleep");
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.value).toBe(374);
    expect(deduped[0]?.sourceName).toBe("Nothing Watch");
  });

  it("drops phone step intervals contained in a watch block", () => {
    const records: HealthDayRecord[] = [
      {
        startTime: "2026-07-09T20:00:00.000Z",
        endTime: "2026-07-09T20:23:00.000Z",
        value: 316,
        unit: "count",
        sourceName: "Nothing Watch",
      },
      {
        startTime: "2026-07-09T20:05:00.000Z",
        endTime: "2026-07-09T20:10:00.000Z",
        value: 15,
        unit: "count",
        sourceName: "Anthony's S23+",
      },
      {
        startTime: "2026-07-09T20:10:00.000Z",
        endTime: "2026-07-09T20:18:00.000Z",
        value: 137,
        unit: "count",
        sourceName: "Anthony's S23+",
      },
    ];

    const deduped = dedupeOverlappingHealthDayRecords(records, "steps");
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.sourceName).toBe("Nothing Watch");
    expect(deduped[0]?.value).toBe(316);
  });

  it("keeps separate non-overlapping sessions", () => {
    const records: HealthDayRecord[] = [
      {
        startTime: "2026-07-09T17:00:00.000Z",
        endTime: "2026-07-09T18:00:00.000Z",
        value: 60,
        unit: "min",
      },
      {
        startTime: "2026-07-09T23:00:00.000Z",
        endTime: "2026-07-10T07:00:00.000Z",
        value: 480,
        unit: "min",
      },
    ];

    expect(dedupeOverlappingHealthDayRecords(records, "sleep")).toHaveLength(2);
  });

  it("passes through heart-rate records unchanged", () => {
    const records: HealthDayRecord[] = [
      { startTime: "2026-07-09T14:00:00.000Z", value: 72, unit: "bpm" },
      { startTime: "2026-07-09T14:30:00.000Z", value: 68, unit: "bpm" },
    ];

    expect(dedupeOverlappingHealthDayRecords(records, "heart-rate")).toEqual(
      records,
    );
  });
});
