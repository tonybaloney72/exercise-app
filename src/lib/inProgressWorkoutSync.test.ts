import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkoutLog } from "@/types";
import {
  clearWorkoutCompleting,
  flushPersistInProgressWorkout,
  invalidateInProgressPersists,
  markWorkoutCompleting,
  schedulePersistInProgressWorkout,
  upsertWorkoutInHistory,
} from "@/lib/inProgressWorkoutSync";

const saveWorkout = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/repos", () => ({
  getWorkoutRepo: () => ({ saveWorkout }),
}));

vi.mock("@/utils/saveErrorToast", () => ({
  toastSaveError: vi.fn(),
}));

function emptyLog(overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: "w1",
    date: "2026-05-12",
    dayOfWeek: 1,
    cardioExercises: [],
    warmUpCompleted: false,
    warmUpExercises: [],
    coolDownCompleted: false,
    coolDownExercises: [],
    rounds: [],
    startTime: "2026-05-12T12:00:00.000Z",
    ...overrides,
  };
}

describe("upsertWorkoutInHistory", () => {
  it("replaces same id and removes duplicates", () => {
    const open = emptyLog({ id: "a", endTime: undefined });
    const done = emptyLog({
      id: "a",
      endTime: "2026-05-12T18:00:00.000Z",
    });
    const history = [open, emptyLog({ id: "b" })];
    const next = upsertWorkoutInHistory(history, done);
    expect(next).toHaveLength(2);
    expect(next[0].endTime).toBe(done.endTime);
    expect(next.find((w) => w.id === "a" && !w.endTime)).toBeUndefined();
  });
});

describe("in-progress persist race guards", () => {
  beforeEach(() => {
    saveWorkout.mockClear();
    invalidateInProgressPersists();
    clearWorkoutCompleting("w1");
  });

  it("skips save when generation was invalidated before flush", async () => {
    const log = emptyLog();
    const generation = 1;
    invalidateInProgressPersists();
    const result = await flushPersistInProgressWorkout(
      log,
      { paused: false },
      generation,
    );
    expect(result).toBeNull();
    expect(saveWorkout).not.toHaveBeenCalled();
  });

  it("skips save while workout is completing", async () => {
    const log = emptyLog();
    markWorkoutCompleting(log.id);
    const result = await flushPersistInProgressWorkout(log, { paused: false }, 2);
    expect(result).toBeNull();
    expect(saveWorkout).not.toHaveBeenCalled();
    clearWorkoutCompleting(log.id);
  });

  it("does not schedule persist for a completing workout id", () => {
    vi.useFakeTimers();
    const log = emptyLog();
    markWorkoutCompleting(log.id);
    schedulePersistInProgressWorkout(log, { paused: false });
    vi.advanceTimersByTime(500);
    expect(saveWorkout).not.toHaveBeenCalled();
    clearWorkoutCompleting(log.id);
    vi.useRealTimers();
  });
});
