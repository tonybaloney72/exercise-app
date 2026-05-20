import { describe, expect, it } from "vitest";
import type { WorkoutLog } from "@/types";
import {
  findCompletedWorkoutForDate,
  findInProgressWorkoutForDate,
  getPausedWorkoutDateFromHistory,
  shouldAutoRestoreInProgressFromHistory,
} from "@/utils/workoutLogLookup";

function emptyLog(overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: "w1",
    date: "2026-05-18",
    dayOfWeek: 1,
    cardioExercises: [],
    warmUpCompleted: false,
    warmUpExercises: [],
    coolDownCompleted: false,
    coolDownExercises: [],
    rounds: [],
    ...overrides,
  };
}

describe("workoutLogLookup", () => {
  it("findCompletedWorkoutForDate requires endTime", () => {
    const history = [
      emptyLog({ id: "a", endTime: undefined }),
      emptyLog({ id: "b", endTime: "2026-05-18T12:00:00Z" }),
    ];
    expect(findCompletedWorkoutForDate(history, "2026-05-18")?.id).toBe("b");
    expect(findInProgressWorkoutForDate(history, "2026-05-18")?.id).toBe("a");
  });

  it("getPausedWorkoutDateFromHistory returns paused in-progress date", () => {
    const history = [
      emptyLog({ date: "2026-05-17", paused: true }),
      emptyLog({ date: "2026-05-18", paused: false }),
    ];
    expect(getPausedWorkoutDateFromHistory(history)).toBe("2026-05-17");
  });

  it("shouldAutoRestoreInProgressFromHistory skips paused and completed days", () => {
    const today = "2026-05-18";
    expect(
      shouldAutoRestoreInProgressFromHistory(
        [emptyLog({ paused: true })],
        today,
      ),
    ).toBeNull();
    expect(
      shouldAutoRestoreInProgressFromHistory(
        [
          emptyLog({ endTime: "2026-05-18T10:00:00Z" }),
          emptyLog({ paused: false }),
        ],
        today,
      ),
    ).toBeNull();
    const open = emptyLog({ paused: false, startTime: "2026-05-18T09:00:00Z" });
    expect(
      shouldAutoRestoreInProgressFromHistory([open], today),
    ).toEqual(open);
  });
});
