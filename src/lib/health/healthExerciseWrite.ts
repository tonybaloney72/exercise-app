import { registerPlugin } from "@capacitor/core";
import type { WorkoutType } from "@capgo/capacitor-health";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { clientTrace } from "@/lib/diagnostics/clientTrace";

export type SaveExerciseSessionOptions = {
  workoutType: WorkoutType;
  startDate: string;
  endDate: string;
  distanceMeters?: number;
  activeCaloriesKcal?: number;
};

type HealthExerciseWritePlugin = {
  ensureWritePermission(): Promise<{ granted: boolean }>;
  saveExerciseSession(options: {
    workoutType: WorkoutType;
    startDate: string;
    endDate: string;
    distanceMeters?: number;
    activeCaloriesKcal?: number;
  }): Promise<void>;
};

const HealthExerciseWrite = registerPlugin<HealthExerciseWritePlugin>(
  "HealthExerciseWrite",
);

export async function ensureExerciseSessionWriteAccess(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { granted } = await HealthExerciseWrite.ensureWritePermission();
    clientTrace("health-write", "exercise_write_permission", { granted });
    return granted;
  } catch (err) {
    clientTrace(
      "health-write",
      "exercise_write_permission_error",
      { message: err instanceof Error ? err.message : String(err) },
      "warn",
    );
    return false;
  }
}

export async function saveExerciseSessionToHealth(
  options: SaveExerciseSessionOptions,
): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    await HealthExerciseWrite.saveExerciseSession({
      workoutType: options.workoutType,
      startDate: options.startDate,
      endDate: options.endDate,
      ...(options.distanceMeters != null && options.distanceMeters > 0
        ? { distanceMeters: options.distanceMeters }
        : {}),
      ...(options.activeCaloriesKcal != null && options.activeCaloriesKcal > 0
        ? { activeCaloriesKcal: options.activeCaloriesKcal }
        : {}),
    });
    clientTrace("health-write", "exercise_session_ok", {
      workoutType: options.workoutType,
    });
  } catch (err) {
    clientTrace(
      "health-write",
      "exercise_session_error",
      { message: err instanceof Error ? err.message : String(err) },
      "warn",
    );
  }
}
