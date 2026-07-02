import { describe, expect, it } from "vitest";
import {
  isMeOriginatedCardioRow,
  shouldMirrorCardioCaptureToHealth,
} from "@/lib/cardioHealthMirrorPolicy";

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
