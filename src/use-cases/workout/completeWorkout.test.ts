import { describe, expect, it, vi } from "vitest";
import type { WorkoutLog } from "@/types";
import { completeWorkout } from "@/use-cases/workout/completeWorkout";

function log(partial: Partial<WorkoutLog> & { id: string; date: string }): WorkoutLog {
  return {
    startTime: "2026-05-18T10:00:00.000Z",
    rounds: [],
    warmUpExercises: [],
    coolDownExercises: [],
    cardioExercises: [],
    ...partial,
  } as WorkoutLog;
}

describe("completeWorkout", () => {
  it("persists a completed log and returns updated history", async () => {
    const active = log({ id: "w1", date: "2026-05-18" });
    const saveWorkout = vi.fn().mockResolvedValue(undefined);

    const result = await completeWorkout({
      activeWorkout: active,
      workoutHistory: [],
      todayKey: "2026-05-18",
      mode: "guest",
      workoutRepo: { saveWorkout, loadHistory: vi.fn(), deleteWorkout: vi.fn() },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.completed.id).toBe("w1");
    expect(result.completed.endTime).toBeTruthy();
    expect(result.completed.paused).toBe(false);
    expect(result.workoutHistory).toHaveLength(1);
    expect(saveWorkout).toHaveBeenCalledOnce();
  });

  it("returns failure when repo save throws", async () => {
    const active = log({ id: "w2", date: "2026-05-18" });
    const saveWorkout = vi.fn().mockRejectedValue(new Error("network"));

    const result = await completeWorkout({
      activeWorkout: active,
      workoutHistory: [],
      todayKey: "2026-05-18",
      mode: "authenticated",
      workoutRepo: { saveWorkout, loadHistory: vi.fn(), deleteWorkout: vi.fn() },
    });

    expect(result).toEqual({ ok: false, error: expect.any(Error) });
  });
});
