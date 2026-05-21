import { describe, expect, it } from "vitest";
import {
  canResumeInProgressForDate,
  getBackfillEligibility,
} from "@/lib/backfillWorkout";
import type { WorkoutLog } from "@/types";

function log(date: string, endTime?: string): WorkoutLog {
  return {
    id: date,
    date,
    dayOfWeek: 1,
    warmUpCompleted: false,
    warmUpExercises: [],
    coolDownCompleted: false,
    coolDownExercises: [],
    rounds: [],
    startTime: `${date}T12:00:00.000Z`,
    endTime,
  };
}

describe("getBackfillEligibility", () => {
  const today = "2026-05-18";

  it("allows past days without a log", () => {
    expect(
      getBackfillEligibility({
        dateKey: "2026-05-10",
        workoutHistory: [],
        activeWorkout: null,
        todayKey: today,
      }).ok,
    ).toBe(true);
  });

  it("rejects today and future", () => {
    expect(
      getBackfillEligibility({
        dateKey: today,
        workoutHistory: [],
        activeWorkout: null,
        todayKey: today,
      }).ok,
    ).toBe(false);
    expect(
      getBackfillEligibility({
        dateKey: "2026-05-20",
        workoutHistory: [],
        activeWorkout: null,
        todayKey: today,
      }).ok,
    ).toBe(false);
  });

  it("rejects when a completed log exists", () => {
    const result = getBackfillEligibility({
      dateKey: "2026-05-10",
      workoutHistory: [log("2026-05-10", "done")],
      activeWorkout: null,
      todayKey: today,
    });
    expect(result.ok).toBe(false);
  });

  it("allows resuming in-progress log for a past day", () => {
    const stale = log("2026-05-10");
    expect(
      canResumeInProgressForDate({
        dateKey: "2026-05-10",
        workoutHistory: [stale],
        activeWorkout: null,
      }).ok,
    ).toBe(true);
  });

  it("rejects resume when another workout is active", () => {
    const stale = log("2026-05-10");
    const result = canResumeInProgressForDate({
      dateKey: "2026-05-10",
      workoutHistory: [stale],
      activeWorkout: log("2026-05-11"),
    });
    expect(result.ok).toBe(false);
  });

  it("rejects when another workout is active", () => {
    const result = getBackfillEligibility({
      dateKey: "2026-05-10",
      workoutHistory: [],
      activeWorkout: log("2026-05-11"),
      todayKey: today,
    });
    expect(result.ok).toBe(false);
  });
});
