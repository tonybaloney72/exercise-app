import { describe, expect, it } from "vitest";
import { weekToDatePlanAdherence } from "@/utils/progressStats";
import type { DayPlan, WorkoutLog } from "@/types";

describe("weekToDatePlanAdherence", () => {
  it("uses log slot count when workout had more exercises than the week plan", () => {
    const sunday = new Date(2026, 4, 17, 12, 0, 0);
    const weekByDow: Record<number, DayPlan> = {
      0: {
        dayOfWeek: 0,
        name: "Sunday",
        theme: "Test",
        hasJog: false,
        strengthFocus: ["PC"],
        coreGroups: [],
        rounds: [
          {
            roundNumber: 1,
            exercises: [
              {
                exerciseId: "PC-1",
                targetReps: "12",
                category: "PC",
              },
            ],
          },
        ],
      },
    };
    const log: WorkoutLog = {
      id: "w1",
      date: "2026-05-17",
      dayOfWeek: 0,
      warmUpCompleted: true,
      warmUpExercises: [],
      coolDownCompleted: true,
      coolDownExercises: [],
      rounds: [
        {
          roundNumber: 1,
          exercises: [
            { exerciseId: "PC-1", completed: true, skipped: false },
            { exerciseId: "PC-2", completed: true, skipped: false },
          ],
        },
        {
          roundNumber: 2,
          exercises: [
            { exerciseId: "PC-3", completed: true, skipped: false },
          ],
        },
      ],
      endTime: "2026-05-17T20:00:00.000Z",
    };

    const result = weekToDatePlanAdherence([log], weekByDow, sunday);
    expect(result.planned).toBe(3);
    expect(result.completed).toBe(3);
  });
});
