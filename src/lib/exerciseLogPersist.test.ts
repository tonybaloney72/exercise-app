import { describe, expect, it } from "vitest";
import { exerciseLogPersistFields } from "@/lib/exerciseLogPersist";

describe("exerciseLogPersistFields", () => {
  it("maps reps, duration, and weight", () => {
    const row = exerciseLogPersistFields({
      exerciseId: "UP-1",
      completed: true,
      skipped: false,
      actualReps: 10,
      actualDuration: 30,
      weightLb: 15,
      targetDurationSeconds: 45,
    });
    expect(row).toMatchObject({
      actual_reps: 10,
      actual_duration: 30,
      actual_weight_lb: 15,
      target_duration_seconds: 45,
      skipped: false,
    });
  });

  it("omits empty weight and gps", () => {
    const row = exerciseLogPersistFields({
      exerciseId: "UP-1",
      completed: false,
      skipped: true,
      weightLb: 0,
      gpsTrackPoints: [],
    });
    expect(row.actual_weight_lb).toBeNull();
    expect(row.gps_track_points).toBeNull();
    expect(row.skipped).toBe(true);
  });

  it("keeps non-empty gps tracks", () => {
    const points = [{ lat: 1, lng: 2, timestamp: 3 }];
    const row = exerciseLogPersistFields({
      exerciseId: "ME-1",
      completed: true,
      skipped: false,
      gpsTrackPoints: points,
      activitySource: "gps",
    });
    expect(row.gps_track_points).toEqual(points);
    expect(row.activity_source).toBe("gps");
  });
});
