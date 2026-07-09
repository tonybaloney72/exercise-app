import { describe, expect, it } from "vitest";
import {
  exerciseSessionDurationSeconds,
  MIN_HEALTH_EXERCISE_WRITE_SECONDS,
  shouldWriteExerciseSessionToHealth,
} from "@/lib/health/healthExerciseWrite";

describe("shouldWriteExerciseSessionToHealth", () => {
  it("rejects zero-length and sub-2-minute sessions", () => {
    const start = "2026-07-09T10:00:00.000Z";
    expect(shouldWriteExerciseSessionToHealth(start, start)).toBe(false);
    expect(
      shouldWriteExerciseSessionToHealth(
        start,
        "2026-07-09T10:01:00.000Z",
      ),
    ).toBe(false);
    expect(
      shouldWriteExerciseSessionToHealth(
        start,
        "2026-07-09T10:01:59.000Z",
      ),
    ).toBe(false);
  });

  it("allows sessions at or above the minimum duration", () => {
    const start = "2026-07-09T10:00:00.000Z";
    expect(
      shouldWriteExerciseSessionToHealth(
        start,
        "2026-07-09T10:02:00.000Z",
      ),
    ).toBe(true);
    expect(
      shouldWriteExerciseSessionToHealth(
        start,
        "2026-07-09T10:30:00.000Z",
      ),
    ).toBe(true);
  });

  it("computes duration in seconds", () => {
    expect(
      exerciseSessionDurationSeconds(
        "2026-07-09T10:00:00.000Z",
        "2026-07-09T10:05:00.000Z",
      ),
    ).toBe(300);
    expect(MIN_HEALTH_EXERCISE_WRITE_SECONDS).toBe(120);
  });
});
