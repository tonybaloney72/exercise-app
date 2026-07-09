import { describe, expect, it } from "vitest";
import {
  isMeOriginatedCardioRow,
  shouldMirrorCardioCaptureToHealth,
} from "@/lib/cardioHealthMirrorPolicy";
import { resolveCardioMirrorTimeWindow } from "@/lib/mirrorCardioToHealth";

describe("resolveCardioMirrorTimeWindow", () => {
  it("does not synthesize a window when duration and activity times are missing", () => {
    expect(resolveCardioMirrorTimeWindow({})).toBeNull();
  });

  it("rejects sub-2-minute explicit durations", () => {
    expect(resolveCardioMirrorTimeWindow({ durationSeconds: 60 })).toBeNull();
    expect(resolveCardioMirrorTimeWindow({ durationSeconds: 0 })).toBeNull();
  });

  it("accepts explicit durations at or above the minimum", () => {
    const window = resolveCardioMirrorTimeWindow({ durationSeconds: 1800 });
    expect(window).not.toBeNull();
    expect(window!.durationSeconds).toBe(1800);
    expect(window!.endDate.getTime() - window!.startDate.getTime()).toBe(
      1800 * 1000,
    );
  });

  it("uses activity times when the span is long enough", () => {
    const window = resolveCardioMirrorTimeWindow({
      activityStartTime: "2026-07-09T10:00:00.000Z",
      activityEndTime: "2026-07-09T10:20:00.000Z",
    });
    expect(window?.durationSeconds).toBe(1200);
  });

  it("rejects same-instant activity times without a long explicit duration", () => {
    expect(
      resolveCardioMirrorTimeWindow({
        activityStartTime: "2026-07-09T10:00:00.000Z",
        activityEndTime: "2026-07-09T10:00:00.000Z",
        durationSeconds: 60,
      }),
    ).toBeNull();
  });

  it("prefers explicit duration when activity times are same-instant", () => {
    const window = resolveCardioMirrorTimeWindow({
      activityStartTime: "2026-07-09T10:00:00.000Z",
      activityEndTime: "2026-07-09T10:00:00.000Z",
      durationSeconds: 1800,
    });
    expect(window?.durationSeconds).toBe(1800);
  });
});

describe("shouldMirrorCardioCaptureToHealth", () => {
  it("skips when health metadata is from Health Connect", () => {
    expect(
      shouldMirrorCardioCaptureToHealth({ healthSource: "health_connect" }),
    ).toBe(false);
  });

  it("skips HC session and sample resolutions", () => {
    expect(
      shouldMirrorCardioCaptureToHealth({
        resolution: "health_connect_session",
      }),
    ).toBe(false);
    expect(
      shouldMirrorCardioCaptureToHealth({
        resolution: "health_connect_samples",
      }),
    ).toBe(false);
  });

  it("allows ME-originated GPS and timer captures", () => {
    expect(
      shouldMirrorCardioCaptureToHealth({
        healthSource: "gps",
        resolution: "gps",
      }),
    ).toBe(true);
    expect(
      shouldMirrorCardioCaptureToHealth({ resolution: "timer_only" }),
    ).toBe(true);
  });
});

describe("isMeOriginatedCardioRow", () => {
  it("rejects Health Connect-imported rows", () => {
    expect(isMeOriginatedCardioRow({ activitySource: "health_connect" })).toBe(
      false,
    );
  });

  it("allows GPS and manual rows", () => {
    expect(isMeOriginatedCardioRow({ activitySource: "gps" })).toBe(true);
    expect(isMeOriginatedCardioRow({ activitySource: "manual" })).toBe(true);
    expect(isMeOriginatedCardioRow({})).toBe(true);
  });
});
