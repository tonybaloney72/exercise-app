import { describe, expect, it } from "vitest";
import { hydrateWorkoutLog } from "@/utils/exerciseLogDefaults";
import type { WorkoutLog } from "@/types";

function baseLog(over: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: "w1",
    date: "2026-08-18",
    dayOfWeek: 2,
    warmUpCompleted: false,
    warmUpExercises: [],
    coolDownCompleted: false,
    coolDownExercises: [],
    rounds: [],
    ...over,
  };
}

describe("hydrateWorkoutLog session fields", () => {
  it("restores reps prescription and logging mode after a server load", () => {
    const hydrated = hydrateWorkoutLog(
      baseLog({
        rounds: [
          {
            roundNumber: 1,
            exercises: [
              {
                exerciseId: "HC-226",
                completed: false,
                skipped: false,
              },
            ],
          },
        ],
      }),
    );
    const row = hydrated.rounds[0]!.exercises[0]!;
    expect(row.loggingMode).toBe("reps");
    expect(row.targetPrescription).toMatch(/\d/);
  });

  it("keeps an existing session prescription", () => {
    const hydrated = hydrateWorkoutLog(
      baseLog({
        rounds: [
          {
            roundNumber: 1,
            exercises: [
              {
                exerciseId: "HC-226",
                completed: false,
                skipped: false,
                targetPrescription: "15",
                loggingMode: "reps",
              },
            ],
          },
        ],
      }),
    );
    expect(hydrated.rounds[0]!.exercises[0]!.targetPrescription).toBe("15");
  });
});
