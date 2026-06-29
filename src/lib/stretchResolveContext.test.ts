import { describe, expect, it } from "vitest";
import { buildStretchResolveContextFromInputs } from "@/lib/stretchResolveContext";
import {
  DEFAULT_COOL_DOWN_STRETCH_COUNT,
  DEFAULT_WARM_UP_STRETCH_COUNT,
} from "@/lib/stretchCounts";

describe("buildStretchResolveContextFromInputs", () => {
  it("uses default stretch counts when omitted", () => {
    const ctx = buildStretchResolveContextFromInputs({
      exercisePreferences: {},
    });
    expect(ctx.warmUpStretchCount).toBe(DEFAULT_WARM_UP_STRETCH_COUNT);
    expect(ctx.coolDownStretchCount).toBe(DEFAULT_COOL_DOWN_STRETCH_COUNT);
    expect(ctx.dislikedExerciseIds.size).toBe(0);
  });

  it("sanitizes stretch counts into the allowed range", () => {
    const ctx = buildStretchResolveContextFromInputs({
      warmUpStretchCount: 99,
      coolDownStretchCount: 0,
      exercisePreferences: {},
    });
    expect(ctx.warmUpStretchCount).toBe(10);
    expect(ctx.coolDownStretchCount).toBe(1);
  });

  it("collects disliked exercise ids from preferences", () => {
    const ctx = buildStretchResolveContextFromInputs({
      exercisePreferences: { "SW-8": "disliked" },
    });
    expect(ctx.dislikedExerciseIds.has("SW-8")).toBe(true);
  });
});
