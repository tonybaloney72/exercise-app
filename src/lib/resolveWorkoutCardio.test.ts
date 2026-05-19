import { describe, expect, it } from "vitest";
import {
  buildCardioMilesTotals,
  resolveWorkoutCardioExercises,
} from "@/lib/resolveWorkoutCardio";
import type { WorkoutLog } from "@/types";

describe("resolveWorkoutCardioExercises", () => {
  it("reads cardio rows from workout", () => {
    const log: WorkoutLog = {
      id: "1",
      date: "2026-05-16",
      dayOfWeek: 1,
      cardioExercises: [
        {
          exerciseId: "END-HIKE",
          completed: true,
          skipped: false,
          actualDistanceMi: 5,
        },
      ],
      warmUpCompleted: false,
      warmUpExercises: [],
      coolDownCompleted: false,
      coolDownExercises: [],
      rounds: [],
    };
    expect(resolveWorkoutCardioExercises(log)).toHaveLength(1);
    expect(resolveWorkoutCardioExercises(log)[0]?.exerciseId).toBe("END-HIKE");
  });

  it("hydrates legacy jog fields from old localStorage payloads", () => {
    const legacy = {
      id: "1",
      date: "2026-05-16",
      dayOfWeek: 1,
      jogCompleted: true,
      jogSkipped: false,
      jogDistance: 2,
      warmUpCompleted: false,
      warmUpExercises: [],
      coolDownCompleted: false,
      coolDownExercises: [],
      rounds: [],
    } as WorkoutLog & { jogCompleted: boolean; jogDistance: number };
    const rows = resolveWorkoutCardioExercises(legacy);
    expect(rows[0]?.exerciseId).toBe("END-JOG");
    expect(rows[0]?.actualDistanceMi).toBe(2);
  });
});

describe("buildCardioMilesTotals", () => {
  it("sums miles per endurance exercise", () => {
    const history: WorkoutLog[] = [
      {
        id: "1",
        date: "2026-05-16",
        dayOfWeek: 1,
        cardioExercises: [
          {
            exerciseId: "END-JOG",
            completed: true,
            skipped: false,
            actualDistanceMi: 3,
          },
        ],
        warmUpCompleted: false,
        warmUpExercises: [],
        coolDownCompleted: false,
        coolDownExercises: [],
        rounds: [],
      },
    ];
    expect(buildCardioMilesTotals(history)["END-JOG"]?.totalMiles).toBe(3);
  });
});
