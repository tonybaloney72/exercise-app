import { describe, expect, it } from "vitest";
import {
  buildSeedDefaultWeightSettings,
  collectDefaultWeightSeeds,
  hasStoredDefaultWeight,
} from "@/lib/seedDefaultExerciseWeight";
import type { WorkoutLog } from "@/types";

describe("seedDefaultExerciseWeight", () => {
  it("detects existing defaults", () => {
    expect(hasStoredDefaultWeight(undefined)).toBe(false);
    expect(hasStoredDefaultWeight({ defaultSetMode: "reps" })).toBe(false);
    expect(
      hasStoredDefaultWeight({
        defaultSetMode: "reps",
        defaultWeightLb: 15,
      }),
    ).toBe(true);
  });

  it("builds seed settings only when unset", () => {
    expect(
      buildSeedDefaultWeightSettings(
        { defaultSetMode: "reps", defaultTargetReps: 10 },
        20,
        { isTimeBased: false, defaultReps: "10" },
      ),
    ).toMatchObject({
      defaultSetMode: "reps",
      defaultTargetReps: 10,
      defaultWeightLb: 20,
    });

    expect(
      buildSeedDefaultWeightSettings(
        { defaultSetMode: "reps", defaultWeightLb: 10 },
        20,
        { isTimeBased: false, defaultReps: "10" },
      ),
    ).toBeNull();
  });

  it("collects first completed weight per exercise without overwriting defaults", () => {
    const workout: WorkoutLog = {
      id: "w1",
      date: "2026-07-24",
      dayOfWeek: 5,
      warmUpCompleted: false,
      warmUpExercises: [],
      coolDownCompleted: false,
      coolDownExercises: [],
      rounds: [
        {
          roundNumber: 1,
          exercises: [
            {
              exerciseId: "HC-148",
              completed: true,
              skipped: false,
              actualReps: 10,
              weightLb: 5,
            },
            {
              exerciseId: "HC-148",
              completed: true,
              skipped: false,
              actualReps: 10,
              weightLb: 10,
            },
            {
              exerciseId: "UP-5",
              completed: true,
              skipped: false,
              actualReps: 8,
              weightLb: 25,
            },
            {
              exerciseId: "UP-1",
              completed: false,
              skipped: false,
              weightLb: 50,
            },
          ],
        },
      ],
      endTime: "2026-07-24T12:00:00.000Z",
    };

    expect(
      collectDefaultWeightSeeds(workout, {
        "UP-5": { defaultSetMode: "reps", defaultWeightLb: 20 },
      }),
    ).toEqual([{ exerciseId: "HC-148", weightLb: 5 }]);
  });
});
