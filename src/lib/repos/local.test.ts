import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/repos/types";
import type { WorkoutLog } from "@/types";
import { createMemoryStorageMock } from "@/test/memoryStorageMock";
import {
  clearLocalData,
  localSettingsRepo,
  localWorkoutRepo,
} from "./local";

describe("local repos", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorageMock());
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips settings through localStorage", async () => {
    const custom = {
      ...DEFAULT_SETTINGS,
      restTimerAutoStart: false,
      timerVibrationEnabled: false,
    };
    await localSettingsRepo.save(custom);
    const loaded = await localSettingsRepo.load();
    expect(loaded.restTimerAutoStart).toBe(false);
    expect(loaded.timerVibrationEnabled).toBe(false);
  });

  it("upserts workout history by id", async () => {
    const first: WorkoutLog = {
      id: "w1",
      date: "2026-05-17",
      dayOfWeek: 0,
      warmUpCompleted: true,
      warmUpExercises: [],
      coolDownCompleted: true,
      coolDownExercises: [],
      rounds: [],
      endTime: "2026-05-17T20:00:00.000Z",
    };
    const updated: WorkoutLog = {
      ...first,
      notes: "felt good",
    };

    await localWorkoutRepo.saveWorkout(first);
    await localWorkoutRepo.saveWorkout(updated);

    const history = await localWorkoutRepo.loadHistory();
    expect(history).toHaveLength(1);
    expect(history[0]?.notes).toBe("felt good");
  });

  it("deletes a workout from history", async () => {
    const log: WorkoutLog = {
      id: "w-delete",
      date: "2026-05-18",
      dayOfWeek: 1,
      warmUpCompleted: true,
      warmUpExercises: [],
      coolDownCompleted: true,
      coolDownExercises: [],
      rounds: [],
      endTime: "2026-05-18T20:00:00.000Z",
    };
    await localWorkoutRepo.saveWorkout(log);
    await localWorkoutRepo.deleteWorkout("w-delete");
    expect(await localWorkoutRepo.loadHistory()).toEqual([]);
  });

  it("clearLocalData removes persisted guest keys", async () => {
    await localSettingsRepo.save(DEFAULT_SETTINGS);
    await localWorkoutRepo.saveWorkout({
      id: "w2",
      date: "2026-05-19",
      dayOfWeek: 2,
      warmUpCompleted: true,
      warmUpExercises: [],
      coolDownCompleted: true,
      coolDownExercises: [],
      rounds: [],
      endTime: "2026-05-19T20:00:00.000Z",
    });

    clearLocalData();

    expect(await localSettingsRepo.load()).toEqual(DEFAULT_SETTINGS);
    expect(await localWorkoutRepo.loadHistory()).toEqual([]);
  });
});
