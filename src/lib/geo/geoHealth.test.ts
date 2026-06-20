import { describe, expect, it } from "vitest";
import { haversineDistanceMeters, metersToMiles } from "@/lib/geo/haversine";
import { computeGpsTrackSnapshot } from "@/lib/geo/gpsTrackSession";
import {
  dominantHealthSampleSource,
  mapWorkoutToImportedSession,
} from "@/lib/health/cardioHealth";
import { sumHealthSampleValues } from "@/lib/health/healthSampleAggregation";
import { withTimeout } from "@/lib/async/withTimeout";
import { applyCardioHealthMeta } from "@/lib/health/cardioHealthFields";
import { formatCardioHealthSummary } from "@/lib/health/cardioHealthDisplay";
import { cardioKindToWorkoutType } from "@/lib/health/cardioKindMap";

describe("haversine", () => {
  it("computes roughly one mile between nearby coordinates", () => {
    const start = { lat: 40.0, lng: -105.0 };
    const end = { lat: 40.0145, lng: -105.0 };
    const meters = haversineDistanceMeters(start, end);
    expect(metersToMiles(meters)).toBeGreaterThan(0.9);
    expect(metersToMiles(meters)).toBeLessThan(1.1);
  });
});

describe("gps track snapshot", () => {
  it("sums segment distances and duration", () => {
    const startedAt = Date.UTC(2026, 5, 16, 12, 0, 0);
    const endedAt = startedAt + 600_000;
    const snapshot = computeGpsTrackSnapshot(
      [
        { lat: 40.0, lng: -105.0, timestamp: startedAt },
        { lat: 40.01, lng: -105.0, timestamp: startedAt + 300_000 },
        { lat: 40.02, lng: -105.0, timestamp: endedAt },
      ],
      startedAt,
      endedAt,
    );
    expect(snapshot.durationSeconds).toBe(600);
    expect(snapshot.distanceMi).toBeGreaterThan(0);
    expect(snapshot.pointCount).toBe(3);
    expect(snapshot.points).toHaveLength(3);
  });
});

describe("cardio health helpers", () => {
  it("maps cardio kinds to workout types", () => {
    expect(cardioKindToWorkoutType("walk")).toBe("walking");
    expect(cardioKindToWorkoutType("jog")).toBe("running");
  });

  it("withTimeout rejects when the promise is too slow", async () => {
    await expect(
      withTimeout(
        new Promise<number>((resolve) => setTimeout(() => resolve(1), 50)),
        5,
      ),
    ).rejects.toThrow(/timed out/i);
  });

  it("sums health sample values", () => {
    expect(
      sumHealthSampleValues([
        { value: 120 },
        { value: 80 },
        { value: -1 },
        { value: Number.NaN },
      ]),
    ).toBe(200);
  });

  it("picks the dominant health sample source", () => {
    expect(
      dominantHealthSampleSource([
        { sourceName: "Samsung Health" },
        { sourceName: "Samsung Health" },
        { sourceName: "Pixel" },
      ]),
    ).toBe("Samsung Health");
  });

  it("formats health summary for display", () => {
    expect(
      formatCardioHealthSummary({
        stepCount: 4832,
        activeCaloriesKcal: 182,
        avgHeartRateBpm: 141,
        activitySource: "gps",
        healthSourceName: "Samsung Health",
      }),
    ).toBe("4,832 steps · 182 active kcal · 141 bpm avg · GPS · Samsung Health");
  });

  it("maps health metadata onto exercise log fields", () => {
    expect(
      applyCardioHealthMeta({
        stepCount: 3200,
        activeCaloriesKcal: 150,
        source: "health_connect",
        healthSourceName: "Health Connect",
      }),
    ).toEqual({
      stepCount: 3200,
      activeCaloriesKcal: 150,
      avgHeartRateBpm: undefined,
      activitySource: "health_connect",
      healthSourceName: "Health Connect",
    });
  });

  it("maps Health Connect workouts into imported sessions", () => {
    const session = mapWorkoutToImportedSession({
      workoutType: "running",
      duration: 1800,
      totalDistance: 3218.68,
      totalEnergyBurned: 220,
      startDate: "2026-06-16T12:00:00.000Z",
      endDate: "2026-06-16T12:30:00.000Z",
      sourceName: "Pixel Watch",
    });
    expect(session.durationSeconds).toBe(1800);
    expect(session.distanceMi).toBeCloseTo(2, 0);
    expect(session.activeCaloriesKcal).toBe(220);
    expect(session.sourceName).toBe("Pixel Watch");
  });
});
