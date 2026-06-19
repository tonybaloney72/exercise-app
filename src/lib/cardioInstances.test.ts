import { describe, expect, it } from "vitest";
import { buildCompletedQuickCardioRow } from "@/lib/cardioInstances";

describe("buildCompletedQuickCardioRow", () => {
  it("persists GPS track points and marks activitySource gps", () => {
    const row = buildCompletedQuickCardioRow("walk", {
      distanceMi: 0.71,
      durationSeconds: 1800,
      health: {
        stepCount: 1384,
        source: "health_connect",
        healthSourceName: "Samsung Health",
      },
      gpsTrackPoints: [
        { lat: 40.0, lng: -105.0, timestamp: 1 },
        { lat: 40.01, lng: -105.0, timestamp: 2 },
      ],
    });

    expect(row.actualDistanceMi).toBe(0.71);
    expect(row.activitySource).toBe("gps");
    expect(row.gpsTrackPoints).toHaveLength(2);
    expect(row.stepCount).toBe(1384);
    expect(row.healthSourceName).toBe("Samsung Health");
  });
});
