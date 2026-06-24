import { describe, expect, it } from "vitest";
import type { WorkoutLog } from "@/types";
import {
  filterWorkoutsForCardioProgress,
  findInProgressWorkoutForDateIncludingActive,
  isCardioOnlyQuickLogWorkout,
  workoutsForCardioProgressCharts,
} from "@/utils/workoutLogLookup";

function inProgressWalkLog(): WorkoutLog {
  return {
    id: "w1",
    date: "2026-05-18",
    dayOfWeek: 1,
    cardioExercises: [
      {
        exerciseId: "END-WALK",
        completed: true,
        skipped: false,
        actualDistanceMi: 0.71,
        actualDuration: 632,
        stepCount: 1350,
        activeCaloriesKcal: 55,
      },
    ],
    warmUpCompleted: false,
    warmUpExercises: [],
    coolDownCompleted: false,
    coolDownExercises: [],
    rounds: [],
    startTime: "2026-05-18T12:00:00.000Z",
  };
}

describe("findInProgressWorkoutForDateIncludingActive", () => {
  it("prefers the live session when history has not caught up yet", () => {
    const active = inProgressWalkLog();
    expect(
      findInProgressWorkoutForDateIncludingActive([], "2026-05-18", active),
    ).toBe(active);
  });
});

describe("isCardioOnlyQuickLogWorkout", () => {
  it("detects completed cardio-only quick logs", () => {
    expect(
      isCardioOnlyQuickLogWorkout({
        ...inProgressWalkLog(),
        endTime: "2026-05-18T13:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("returns false when strength work exists", () => {
    const log = inProgressWalkLog();
    log.rounds = [
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
    ];
    expect(isCardioOnlyQuickLogWorkout(log)).toBe(false);
  });
});

describe("filterWorkoutsForCardioProgress", () => {
  it("includes in-progress workouts with completed quick-log cardio", () => {
    const rows = filterWorkoutsForCardioProgress([inProgressWalkLog()]);
    expect(rows).toHaveLength(1);
  });

  it("excludes in-progress workouts without logged cardio", () => {
    const log = inProgressWalkLog();
    log.cardioExercises = [];
    expect(filterWorkoutsForCardioProgress([log])).toHaveLength(0);
  });
});

describe("workoutsForCardioProgressCharts", () => {
  it("appends active workout when missing from history", () => {
    const active = inProgressWalkLog();
    const rows = workoutsForCardioProgressCharts([], active);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("w1");
  });
});
