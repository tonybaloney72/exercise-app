import { describe, expect, it } from "vitest";
import {
  computeGpsTrackDistanceMi,
  computeGpsTrackSnapshot,
} from "@/lib/geo/gpsTrackSession";

describe("computeGpsTrackDistanceMi segments", () => {
  const a = { lat: 40.0, lng: -105.0, timestamp: 0 };
  const b = { lat: 40.01, lng: -105.0, timestamp: 1 };
  const c = { lat: 41.0, lng: -104.0, timestamp: 2 };
  const d = { lat: 41.01, lng: -104.0, timestamp: 3 };

  it("sums only within each segment when pause splits the track", () => {
    const points = [a, b, c, d];
    const continuous = computeGpsTrackDistanceMi(points);
    const segmented = computeGpsTrackDistanceMi(points, [0, 2]);

    const segmentAb = computeGpsTrackDistanceMi([a, b]);
    const segmentCd = computeGpsTrackDistanceMi([c, d]);

    expect(segmented).toBeCloseTo(segmentAb + segmentCd, 2);
    expect(continuous).toBeGreaterThan(segmented);
  });

  it("includes segment starts on snapshots", () => {
    const snapshot = computeGpsTrackSnapshot(
      [a, b, c, d],
      0,
      10_000,
      600,
      [0, 2],
    );

    expect(snapshot.segmentStarts).toEqual([0, 2]);
    expect(snapshot.durationSeconds).toBe(600);
    expect(snapshot.distanceMi).toBeCloseTo(
      computeGpsTrackDistanceMi([a, b, c, d], [0, 2]),
      2,
    );
  });
});
