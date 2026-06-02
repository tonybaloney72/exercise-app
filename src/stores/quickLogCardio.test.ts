import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DayPlan } from "@/types";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  findCompletedWorkoutForDate,
  findInProgressWorkoutForDate,
} from "@/utils/workoutLogLookup";
import { isWorkoutStartedFromState } from "@/lib/workoutSessionGuard";

const saveWorkout = vi.fn().mockResolvedValue(undefined);

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

vi.mock("@/lib/stretchResolveContext", () => ({
  resolveStretchesForWorkoutStart: vi.fn().mockResolvedValue({
    warmUp: [],
    coolDown: [],
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

describe("quickLogCardio", () => {
  beforeEach(() => {
    saveWorkout.mockClear();
    useAuthStore.setState({ mode: "authenticated", user: null });
    useWorkoutStore.setState({
      activeWorkout: null,
      pausedWorkoutDate: null,
      workoutHistory: [],
    });
  });

  it("starts an in-progress workout (not completed) when no session exists", async () => {
    const ok = await useWorkoutStore
      .getState()
      .quickLogCardio(plan, "2026-05-18", "jog", { distanceMi: 2 });
    expect(ok).toBe(true);

    const state = useWorkoutStore.getState();
    expect(state.activeWorkout?.endTime).toBeUndefined();
    expect(state.activeWorkout?.startTime).toBeTruthy();
    expect(state.activeWorkout?.cardioExercises).toHaveLength(1);
    expect(state.activeWorkout?.cardioExercises[0]?.completed).toBe(true);
    expect(state.activeWorkout?.warmUpCompleted).toBe(false);
    expect(state.activeWorkout?.coolDownCompleted).toBe(false);
    expect(state.activeWorkout?.rounds).toHaveLength(1);

    expect(findCompletedWorkoutForDate(state.workoutHistory, "2026-05-18")).toBeNull();
    expect(findInProgressWorkoutForDate(state.workoutHistory, "2026-05-18")).not.toBeNull();
    expect(isWorkoutStartedFromState("2026-05-18", state)).toBe(true);
  });

  it("appends to an in-progress history log and activates the session", async () => {
    useWorkoutStore.setState({
      workoutHistory: [
        {
          id: "existing",
          date: "2026-05-18",
          dayOfWeek: 1,
          cardioExercises: [],
          warmUpCompleted: false,
          warmUpExercises: [],
          coolDownCompleted: false,
          coolDownExercises: [],
          rounds: [],
          startTime: "2026-05-18T10:00:00.000Z",
        },
      ],
    });

    const ok = await useWorkoutStore
      .getState()
      .quickLogCardio(plan, "2026-05-18", "walk", { durationSeconds: 600 });
    expect(ok).toBe(true);

    const state = useWorkoutStore.getState();
    expect(state.activeWorkout?.id).toBe("existing");
    expect(state.activeWorkout?.endTime).toBeUndefined();
    expect(state.activeWorkout?.cardioExercises).toHaveLength(1);
  });
});
