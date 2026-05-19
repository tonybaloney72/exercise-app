import { describe, expect, it } from "vitest";
import {
  countExerciseSlots,
  formatWorkoutDuration,
  summarizeWorkoutLog,
} from "@/lib/workoutLogSummary";
import type { DayPlan, ExerciseLog, WorkoutLog } from "@/types";

function slot(
  partial: Partial<ExerciseLog> & Pick<ExerciseLog, "exerciseId">,
): ExerciseLog {
  return {
    completed: false,
    skipped: false,
    ...partial,
  };
}

const minimalPlan: DayPlan = {
  dayOfWeek: 1,
  name: "Test",
  theme: "Test",
  strengthFocus: ["UP"],
  coreGroups: [],
  hasJog: true,
  cardioActivities: [{ kind: "jog", exerciseId: "END-JOG" }],
  rounds: [{ roundNumber: 1, exercises: [] }],
};

const minimalLog: WorkoutLog = {
  id: "1",
  date: "2026-05-16",
  dayOfWeek: 1,
  cardioExercises: [
    {
      exerciseId: "END-JOG",
      completed: true,
      skipped: false,
      actualDistanceMi: 1.5,
    },
  ],
  warmUpCompleted: true,
  warmUpExercises: [slot({ exerciseId: "w1", completed: true })],
  coolDownCompleted: true,
  coolDownExercises: [
    slot({ exerciseId: "c1", completed: true }),
    slot({ exerciseId: "c2", skipped: true }),
  ],
  rounds: [
    {
      roundNumber: 1,
      exercises: [
        slot({ exerciseId: "e1", completed: true }),
        slot({ exerciseId: "e2", completed: true }),
        slot({ exerciseId: "e3", skipped: true }),
      ],
    },
  ],
  startTime: "2026-05-16T10:00:00.000Z",
  endTime: "2026-05-16T10:45:00.000Z",
};

describe("countExerciseSlots", () => {
  it("counts completed and skipped separately", () => {
    expect(
      countExerciseSlots([
        slot({ exerciseId: "a", completed: true }),
        slot({ exerciseId: "b", skipped: true }),
        slot({ exerciseId: "c", completed: false, skipped: false }),
      ]),
    ).toEqual({ total: 3, completed: 1, skipped: 1 });
  });
});

describe("formatWorkoutDuration", () => {
  it("formats minutes and seconds", () => {
    expect(
      formatWorkoutDuration(
        "2026-05-16T10:00:00.000Z",
        "2026-05-16T10:45:30.000Z",
      ),
    ).toBe("45m 30s");
  });
});

describe("summarizeWorkoutLog", () => {
  it("aggregates strength and stretch counts", () => {
    const summary = summarizeWorkoutLog(minimalLog, minimalPlan);
    expect(summary.strength).toEqual({ total: 3, completed: 2, skipped: 1 });
    expect(summary.stretches).toEqual({ total: 3, completed: 2, skipped: 1 });
    expect(summary.cardio).toHaveLength(1);
    expect(summary.cardio[0]?.completed).toBe(true);
    expect(summary.cardio[0]?.distanceMi).toBe(1.5);
    expect(summary.durationLabel).toBe("45m");
  });
});
