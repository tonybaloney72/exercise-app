import { describe, expect, it } from "vitest";
import {
  buildExerciseProgressSeries,
  formatExerciseProgressSetBreakdown,
  formatExerciseProgressWeightCell,
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
    const history = [workoutWithSwap("2026-05-18", "LB-99", "LB-3", 12)];

    expect(listExercisesWithNumericProgress(history).map((o) => o.id)).toEqual([
      "LB-3",
    ]);
    expect(
      listExercisesWithNumericProgress(history).map((o) => o.id),
    ).not.toContain("LB-99");

    const series = buildExerciseProgressSeries(history, "LB-3");
    expect(series).toHaveLength(1);
    expect(series[0]?.value).toBe(12);
    expect(series[0]?.date).toBe("2026-05-18");
  });

  it("does not count swap logs against the prescribed exercise id", () => {
    const history = [workoutWithSwap("2026-05-18", "LB-99", "LB-3", 12)];

    expect(buildExerciseProgressSeries(history, "LB-99")).toEqual([]);
  });

  it("tracks set count and per-set reps while chart value stays total", () => {
    const history: WorkoutLog[] = [
      {
        id: "w1",
        date: "2026-05-19",
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
                exerciseId: "UP-1",
                completed: true,
                skipped: false,
                actualReps: 10,
              },
            ],
          },
        ],
        notes: "",
      },
      {
        id: "w2",
        date: "2026-05-20",
        dayOfWeek: 2,
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
                exerciseId: "UP-1",
                completed: true,
                skipped: false,
                actualReps: 10,
              },
            ],
          },
          {
            roundNumber: 2,
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
        notes: "",
      },
    ];

    const series = buildExerciseProgressSeries(history, "UP-1");
    expect(series).toHaveLength(2);
    expect(series[0]?.value).toBe(10);
    expect(series[0]?.setCount).toBe(1);
    expect(series[0]?.repsPerSet).toEqual([10]);
    expect(series[0]?.weightLbPerSet).toEqual([null]);
    expect(formatExerciseProgressWeightCell(series[0]!)).toBe("-");
    expect(series[1]?.value).toBe(20);
    expect(series[1]?.setCount).toBe(2);
    expect(series[1]?.repsPerSet).toEqual([10, 10]);
    expect(formatExerciseProgressSetBreakdown(series[1]!)).toBe(
      "2 sets (10 + 10)",
    );
  });

  it("includes logged weight in set breakdown and sessions cell", () => {
    const history: WorkoutLog[] = [
      {
        id: "w1",
        date: "2026-07-28",
        dayOfWeek: 2,
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
                exerciseId: "HC-082",
                completed: true,
                skipped: false,
                actualReps: 12,
                weightLb: 25,
              },
            ],
          },
          {
            roundNumber: 2,
            exercises: [
              {
                exerciseId: "HC-082",
                completed: true,
                skipped: false,
                actualReps: 10,
                weightLb: 30,
              },
            ],
          },
        ],
        notes: "",
      },
    ];

    const series = buildExerciseProgressSeries(history, "HC-082");
    expect(series).toHaveLength(1);
    expect(series[0]?.value).toBe(22);
    expect(series[0]?.weightLbPerSet).toEqual([25, 30]);
    expect(formatExerciseProgressSetBreakdown(series[0]!)).toBe(
      "2 sets (12 @ 25 lb + 10 @ 30 lb)",
    );
    expect(formatExerciseProgressWeightCell(series[0]!)).toBe("25 lb, 30 lb");
  });
});
