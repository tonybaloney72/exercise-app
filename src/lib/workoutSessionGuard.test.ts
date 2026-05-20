import { describe, expect, it, beforeEach } from "vitest";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import {
  isPrescribedPlanFrozenFromState,
  isWorkoutStartedFromState,
} from "@/lib/workoutSessionGuard";
import type { WorkoutLog } from "@/types";

function emptyLog(date: string): WorkoutLog {
  return {
    id: "w1",
    date,
    dayOfWeek: 1,
    cardioExercises: [],
    warmUpCompleted: false,
    warmUpExercises: [],
    coolDownCompleted: false,
    coolDownExercises: [],
    rounds: [],
  };
}

describe("workoutSessionGuard", () => {
  beforeEach(() => {
    useWorkoutStore.setState({
      activeWorkout: null,
      pausedWorkoutDate: null,
      workoutHistory: [],
    });
  });

  it("freezes today when a workout is in progress", () => {
    useWorkoutStore.setState({
      activeWorkout: { ...emptyLog("2026-05-11"), startTime: "2026-05-11T10:00:00Z" },
    });
    const state = useWorkoutStore.getState();
    expect(isWorkoutStartedFromState("2026-05-11", state)).toBe(true);
    expect(isPrescribedPlanFrozenFromState("2026-05-11", state)).toBe(true);
  });

  it("freezes today when a workout is completed (endTime set)", () => {
    useWorkoutStore.setState({
      workoutHistory: [
        {
          ...emptyLog("2026-05-11"),
          endTime: "2026-05-11T11:00:00Z",
        },
      ],
    });
    const state = useWorkoutStore.getState();
    expect(isWorkoutStartedFromState("2026-05-11", state)).toBe(false);
    expect(isPrescribedPlanFrozenFromState("2026-05-11", state)).toBe(true);
  });

  it("does not freeze today with no log for that date", () => {
    expect(
      isPrescribedPlanFrozenFromState("2026-05-11", useWorkoutStore.getState()),
    ).toBe(false);
  });

  it("freezes when an in-progress log exists in history (cloud draft)", () => {
    useWorkoutStore.setState({
      workoutHistory: [
        {
          ...emptyLog("2026-05-11"),
          startTime: "2026-05-11T10:00:00Z",
          paused: false,
        },
      ],
    });
    const state = useWorkoutStore.getState();
    expect(isWorkoutStartedFromState("2026-05-11", state)).toBe(true);
    expect(isPrescribedPlanFrozenFromState("2026-05-11", state)).toBe(true);
  });
});
