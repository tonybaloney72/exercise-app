import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DayPlan } from "@/types";
import { resetWorkoutSessionStartLockForTests } from "@/lib/workoutSessionStartLock";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { findInProgressWorkoutForDate } from "@/utils/workoutLogLookup";
import { formatLocalDateKey } from "@/utils/localDateKey";

const saveWorkout = vi.fn().mockResolvedValue(undefined);

let stretchResolveDelayMs = 0;

vi.mock("@/lib/repos", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/repos")>();
  return {
    ...actual,
    getWorkoutRepo: () => ({ saveWorkout }),
  };
});

vi.mock("@/utils/saveErrorToast", () => ({
  toastSaveError: vi.fn(),
}));

vi.mock("@/lib/workoutStretchStart", () => ({
  resolveStretchesForWorkoutStart: vi.fn(async () => {
    if (stretchResolveDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, stretchResolveDelayMs));
    }
    return { warmUp: [], coolDown: [] };
  }),
}));

const plan: DayPlan = {
  dayOfWeek: 1,
  name: "Test day",
  theme: "Test",
  hasJog: false,
  strengthFocus: ["UP"],
  coreGroups: [],
  rounds: [
    {
      roundNumber: 1,
      exercises: [
        {
          exerciseId: "UP-1",
          category: "UP",
          targetReps: "10",
        },
      ],
    },
  ],
};

describe("startWorkout", () => {
  beforeEach(() => {
    stretchResolveDelayMs = 0;
    saveWorkout.mockClear();
    resetWorkoutSessionStartLockForTests();
    useAuthStore.setState({ mode: "authenticated", user: null });
    useWorkoutStore.setState({
      activeWorkout: null,
      pausedWorkoutDate: null,
      workoutHistory: [],
    });
  });

  it("does not create duplicate in-progress logs when start is invoked twice in parallel", async () => {
    stretchResolveDelayMs = 50;
    const store = useWorkoutStore.getState();

    store.startWorkout(plan);
    store.startWorkout(plan);

    await vi.waitFor(() => {
      const state = useWorkoutStore.getState();
      const dateKey = state.activeWorkout?.date;
      expect(dateKey).toBeTruthy();
      const inProgressForDay = state.workoutHistory.filter(
        (w) => w.endTime == null && w.date === dateKey,
      );
      expect(inProgressForDay).toHaveLength(1);
    });

    const state = useWorkoutStore.getState();
    const dateKey = state.activeWorkout!.date;
    const inProgressForDay = state.workoutHistory.filter(
      (w) => w.endTime == null && w.date === dateKey,
    );
    expect(state.activeWorkout?.id).toBe(inProgressForDay[0]?.id);
    expect(findInProgressWorkoutForDate(state.workoutHistory, dateKey)).not.toBeNull();
  });

  it("resumes an in-progress log from history instead of creating a second one", async () => {
    const dateKey = formatLocalDateKey();
    useWorkoutStore.setState({
      workoutHistory: [
        {
          id: "existing",
          date: dateKey,
          dayOfWeek: 2,
          cardioExercises: [],
          warmUpCompleted: false,
          warmUpExercises: [],
          coolDownCompleted: false,
          coolDownExercises: [],
          rounds: [],
          startTime: "2026-06-23T14:50:11.243Z",
          paused: true,
        },
      ],
    });

    useWorkoutStore.getState().startWorkout(plan);

    await vi.waitFor(() => {
      expect(useWorkoutStore.getState().activeWorkout?.id).toBe("existing");
    });

    const inProgress = useWorkoutStore
      .getState()
      .workoutHistory.filter((w) => w.endTime == null && w.date === dateKey);
    expect(inProgress).toHaveLength(1);
    expect(inProgress[0]?.id).toBe("existing");
  });
});
