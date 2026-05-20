import { describe, expect, it } from "vitest";
import {
  groupCompletedWorkoutsByMonth,
  workoutHistoryRowMeta,
} from "@/lib/workoutHistoryGroups";
import type { WorkoutLog } from "@/types";

function logFor(date: string, id: string): WorkoutLog {
  return {
    id,
    date,
    dayOfWeek: 1,
    warmUpCompleted: true,
    warmUpExercises: [],
    coolDownCompleted: true,
    coolDownExercises: [],
    rounds: [
      {
        roundNumber: 1,
        exercises: [
          {
            exerciseId: "CB-1",
            completed: true,
            skipped: false,
            targetPrescription: "10",
            loggingMode: "reps",
          },
          {
            exerciseId: "CB-2",
            completed: false,
            skipped: false,
            targetPrescription: "10",
            loggingMode: "reps",
          },
        ],
      },
    ],
    startTime: `${date}T10:00:00.000Z`,
    endTime: `${date}T10:30:00.000Z`,
  };
}

describe("groupCompletedWorkoutsByMonth", () => {
  it("groups by month and sorts newest first", () => {
    const groups = groupCompletedWorkoutsByMonth([
      logFor("2026-04-10", "a"),
      logFor("2026-05-12", "b"),
      logFor("2026-05-03", "c"),
      { ...logFor("2026-05-01", "draft"), endTime: undefined },
    ]);
    expect(groups.map((g) => g.monthKey)).toEqual(["2026-05", "2026-04"]);
    expect(groups[0]!.logs.map((l) => l.id)).toEqual(["b", "c"]);
  });
});

describe("workoutHistoryRowMeta", () => {
  it("counts completed strength slots and duration", () => {
    const meta = workoutHistoryRowMeta(logFor("2026-05-12", "x"));
    expect(meta.exercisesDone).toBe(1);
    expect(meta.exercisesTotal).toBe(2);
    expect(meta.durationLabel).toBeTruthy();
  });
});
