import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DayPlan } from "@/types";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  findCompletedWorkoutForDate,
  findInProgressWorkoutForDate,
  isCardioOnlyQuickLogWorkout,
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

  it("saves a completed cardio-only log without starting a workout session", async () => {
    const ok = await useWorkoutStore
      .getState()
      .quickLogCardio(plan, "2026-05-18", "jog", { distanceMi: 2 });
    expect(ok).toBe(true);

    const state = useWorkoutStore.getState();
    expect(state.activeWorkout).toBeNull();

    const completed = findCompletedWorkoutForDate(state.workoutHistory, "2026-05-18");
    expect(completed).not.toBeNull();
    expect(completed?.endTime).toBeTruthy();
    expect(completed?.cardioExercises).toHaveLength(1);
    expect(completed?.cardioExercises?.[0]?.completed).toBe(true);
    expect(isCardioOnlyQuickLogWorkout(completed!)).toBe(true);
    expect(completed?.rounds).toHaveLength(0);

    expect(findInProgressWorkoutForDate(state.workoutHistory, "2026-05-18")).toBeNull();
    expect(isWorkoutStartedFromState("2026-05-18", state)).toBe(false);
    expect(saveWorkout).toHaveBeenCalledTimes(1);
  });

  it("appends another quick log to the same completed cardio-only day", async () => {
    await useWorkoutStore
      .getState()
      .quickLogCardio(plan, "2026-05-18", "walk", { distanceMi: 1.2 });

    const ok = await useWorkoutStore
      .getState()
      .quickLogCardio(plan, "2026-05-18", "jog", { distanceMi: 2 });
    expect(ok).toBe(true);

    const state = useWorkoutStore.getState();
    expect(state.activeWorkout).toBeNull();
    expect(state.workoutHistory[0]?.cardioExercises).toHaveLength(2);
    expect(saveWorkout).toHaveBeenCalledTimes(2);
  });

  it("still resumes a real in-progress strength workout", async () => {
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
          rounds: [
            {
              roundNumber: 1,
              exercises: [
                {
                  exerciseId: "UP-1",
                  completed: true,
                  skipped: false,
                  actualReps: 10,
                },
              ],
            },
          ],
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
