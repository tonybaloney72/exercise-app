import { describe, expect, it } from "vitest";
import {
  buildExerciseProgressSeries,
  listExercisesWithNumericProgress,
} from "@/utils/exerciseProgressStats";
import type { WorkoutLog } from "@/types";

function workoutWithSwap(
  date: string,
  prescribedId: string,
  swappedId: string,
  actualReps: number,
): WorkoutLog {
  return {
    id: "w1",
    date,
    dayOfWeek: 1,
    warmUpCompleted: false,
    warmUpExercises: [],
    coolDownCompleted: false,
    coolDownExercises: [],
    cardioExercises: [],
    rounds: [
      {
        roundNumber: 1,
        exercises: [
          {
            exerciseId: prescribedId,
            swappedWith: swappedId,
            completed: true,
            skipped: false,
            actualReps,
          },
        ],
      },
    ],
    notes: "",
  };
}

describe("exerciseProgressStats", () => {
  it("attributes swapped-in exercises to the substitute id", () => {
    const history = [workoutWithSwap("2026-05-18", "LB-99", "LB-12", 12)];

    expect(listExercisesWithNumericProgress(history).map((o) => o.id)).toEqual([
      "LB-12",
    ]);
    expect(listExercisesWithNumericProgress(history).map((o) => o.id)).not.toContain(
      "LB-99",
    );

    const series = buildExerciseProgressSeries(history, "LB-12");
    expect(series).toHaveLength(1);
    expect(series[0]?.value).toBe(12);
    expect(series[0]?.date).toBe("2026-05-18");
  });

  it("does not count swap logs against the prescribed exercise id", () => {
    const history = [workoutWithSwap("2026-05-18", "LB-99", "LB-12", 12)];

    expect(buildExerciseProgressSeries(history, "LB-99")).toEqual([]);
  });
});
