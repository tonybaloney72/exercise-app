import { describe, expect, it } from "vitest";
import type { WorkoutLog } from "@/types";
import {
  exerciseWorkoutTypeForLog,
  totalCompletedCardioDistanceMeters,
} from "@/lib/health/healthWorkoutType";

function baseLog(partial: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: "w1",
    date: "2026-06-23",
    dayOfWeek: 2,
    cardioExercises: [],
    warmUpCompleted: false,
    warmUpExercises: [],
    coolDownCompleted: false,
    coolDownExercises: [],
    rounds: [],
    startTime: "2026-06-23T14:50:13.518Z",
    endTime: "2026-06-23T15:35:35.801Z",
    ...partial,
  };
}

describe("exerciseWorkoutTypeForLog", () => {
  it("maps strength workouts to calisthenics", () => {
    const log = baseLog({
      rounds: [
        {
          roundNumber: 1,
          exercises: [
            {
              exerciseId: "UP-1",
              completed: true,
              skipped: false,
              actualReps: 10,
            },
          ],
        },
      ],
    });
    expect(exerciseWorkoutTypeForLog(log)).toBe("calisthenics");
  });

  it("maps cardio-only quick logs to the logged activity type", () => {
    const log = baseLog({
      rounds: [],
      cardioExercises: [
        {
          exerciseId: "END-WALK",
          completed: true,
          skipped: false,
          actualDistanceMi: 1.2,
          actualDuration: 900,
        },
      ],
    });
    expect(exerciseWorkoutTypeForLog(log)).toBe("walking");
  });
});

describe("totalCompletedCardioDistanceMeters", () => {
  it("sums completed cardio distances in meters", () => {
    const log = baseLog({
      cardioExercises: [
        {
          exerciseId: "END-WALK",
          completed: true,
          skipped: false,
          actualDistanceMi: 1,
        },
        {
          exerciseId: "END-JOG",
          completed: true,
          skipped: false,
          actualDistanceMi: 0.5,
        },
        {
          exerciseId: "END-WALK",
          completed: false,
          skipped: false,
          actualDistanceMi: 2,
        },
      ],
    });
    expect(totalCompletedCardioDistanceMeters(log)).toBeCloseTo(1.5 * 1609.344, 1);
  });
});
