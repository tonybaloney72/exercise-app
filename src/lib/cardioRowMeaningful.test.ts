import { describe, expect, it } from "vitest";
import {
  isMeaningfulCardioRow,
  stripMeaninglessCardioFromWorkout,
} from "@/lib/cardioRowMeaningful";
import type { ExerciseLog, WorkoutLog } from "@/types";

function cardioRow(partial: Partial<ExerciseLog> = {}): ExerciseLog {
  return {
    exerciseId: "END-JOG",
    completed: false,
    skipped: false,
    ...partial,
  };
}

const baseLog: WorkoutLog = {
  id: "1",
  date: "2026-05-16",
  dayOfWeek: 1,
  warmUpCompleted: false,
  warmUpExercises: [],
  coolDownCompleted: false,
  coolDownExercises: [],
  rounds: [],
};

describe("isMeaningfulCardioRow", () => {
  it("rejects blank plan placeholders", () => {
    expect(isMeaningfulCardioRow(cardioRow())).toBe(false);
    expect(isMeaningfulCardioRow(cardioRow({ completed: true }))).toBe(false);
  });

  it("accepts skipped, logged metrics, and recorder windows", () => {
    expect(isMeaningfulCardioRow(cardioRow({ skipped: true }))).toBe(true);
    expect(
      isMeaningfulCardioRow(cardioRow({ actualDistanceMi: 1.2 })),
    ).toBe(true);
    expect(
      isMeaningfulCardioRow(cardioRow({ actualDuration: 600 })),
    ).toBe(true);
    expect(
      isMeaningfulCardioRow(
        cardioRow({
          activityStartTime: "2026-05-16T10:00:00.000Z",
          activityEndTime: "2026-05-16T10:20:00.000Z",
        }),
      ),
    ).toBe(true);
  });
});

describe("stripMeaninglessCardioFromWorkout", () => {
  it("removes empty cardio rows before persistence", () => {
    const stripped = stripMeaninglessCardioFromWorkout({
      ...baseLog,
      cardioExercises: [cardioRow(), cardioRow({ actualDistanceMi: 2 })],
    });
    expect(stripped.cardioExercises).toHaveLength(1);
    expect(stripped.cardioExercises?.[0]?.actualDistanceMi).toBe(2);
  });

  it("drops cardioExercises when all rows are blank", () => {
    const stripped = stripMeaninglessCardioFromWorkout({
      ...baseLog,
      cardioExercises: [cardioRow()],
    });
    expect(stripped.cardioExercises).toBeUndefined();
  });
});
