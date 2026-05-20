import { describe, expect, it } from "vitest";
import {
  isCompletedWorkoutLog,
  sessionPlanForWorkoutEdit,
  stretchEntriesFromLogs,
} from "@/lib/workoutEditSession";
import type { DayPlan, WorkoutLog } from "@/types";

const template: DayPlan = {
  dayOfWeek: 1,
  name: "Monday",
  theme: "Test",
  hasJog: false,
  strengthFocus: ["CB"],
  coreGroups: ["CF"],
  rounds: [],
};

describe("workoutEditSession", () => {
  it("isCompletedWorkoutLog checks endTime", () => {
    expect(isCompletedWorkoutLog({ endTime: "2026-01-01T00:00:00Z" } as WorkoutLog)).toBe(
      true,
    );
    expect(isCompletedWorkoutLog({} as WorkoutLog)).toBe(false);
  });

  it("sessionPlanForWorkoutEdit builds rounds from log slots", () => {
    const log: WorkoutLog = {
      id: "w1",
      date: "2026-05-18",
      dayOfWeek: 1,
      warmUpCompleted: true,
      warmUpExercises: [
        { exerciseId: "SW-1", completed: true, skipped: false, targetPrescription: "30 sec" },
      ],
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
              swappedWith: "CB-99",
              targetPrescription: "12",
            },
          ],
        },
      ],
      endTime: "2026-05-18T12:00:00Z",
    };
    const plan = sessionPlanForWorkoutEdit(log, template);
    expect(plan.rounds[0].exercises[0].exerciseId).toBe("CB-1");
    expect(stretchEntriesFromLogs(log.warmUpExercises)[0].targetReps).toBe("30 sec");
  });
});
