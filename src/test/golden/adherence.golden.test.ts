import { describe, expect, it } from "vitest";
import { weekToDatePlanAdherence } from "@/utils/progressStats";
import { dayPlanWithExercises, workoutLogForDate } from "./fixtures";

/**
 * Behavior contract: week-to-date adherence counts and span labels for fixed inputs.
 */
describe("adherence golden contract", () => {
  it("counts Sun–Wed planned vs completed when reference is Wednesday", () => {
    const reference = new Date(2026, 4, 20, 12, 0, 0); // Wed May 20 2026
    const weekByDow = {
      0: dayPlanWithExercises(0, ["PC-1", "PC-2"]),
      1: dayPlanWithExercises(1, ["UP-1", "UP-2", "UP-3"]),
      2: dayPlanWithExercises(2, ["LB-1", "LB-2"]),
      3: dayPlanWithExercises(3, ["CS-1", "CS-2"]),
    };
    const history = [
      workoutLogForDate("2026-05-17", 0, [
        { exerciseId: "PC-1", completed: true },
        { exerciseId: "PC-2", completed: true },
      ]),
      workoutLogForDate("2026-05-19", 2, [
        { exerciseId: "LB-1", completed: true },
        { exerciseId: "LB-2", completed: false, skipped: true },
      ]),
    ];

    expect(weekToDatePlanAdherence(history, weekByDow, reference)).toMatchInlineSnapshot(`
      {
        "completed": 3,
        "planned": 9,
        "spanShort": "Sun–Wed",
      }
    `);
  });

  it("uses plan slots for days without a log and counts swapped completions", () => {
    const reference = new Date(2026, 4, 18, 12, 0, 0); // Mon May 18 2026
    const weekByDow = {
      0: dayPlanWithExercises(0, ["PC-1"]),
      1: dayPlanWithExercises(1, ["UP-1"]),
    };
    const history = [
      workoutLogForDate("2026-05-17", 0, [
        { exerciseId: "UP-99", swappedWith: "UP-12", completed: true },
      ]),
    ];

    expect(weekToDatePlanAdherence(history, weekByDow, reference)).toMatchInlineSnapshot(`
      {
        "completed": 1,
        "planned": 2,
        "spanShort": "Sun–Mon",
      }
    `);
  });
});
