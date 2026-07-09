import { registerPlugin } from "@capacitor/core";
import type { WorkoutType } from "@/lib/health/healthConnectTypes";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { clientTrace } from "@/lib/diagnostics/clientTrace";

/** Minimum span before mirroring an exercise session to Health Connect. */
export const MIN_HEALTH_EXERCISE_WRITE_SECONDS = 120;

export function exerciseSessionDurationSeconds(
  startDate: string | Date,
  endDate: string | Date,
): number | null {
  const startMs =
    typeof startDate === "string" ? Date.parse(startDate) : startDate.getTime();
  const endMs =
    typeof endDate === "string" ? Date.parse(endDate) : endDate.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return null;
  }
  return Math.round((endMs - startMs) / 1000);
}

export function shouldWriteExerciseSessionToHealth(
  startDate: string | Date,
  endDate: string | Date,
): boolean {
  const durationSeconds = exerciseSessionDurationSeconds(startDate, endDate);
  return (
    durationSeconds != null &&
    durationSeconds >= MIN_HEALTH_EXERCISE_WRITE_SECONDS
  );
}

export type SaveExerciseSessionOptions = {
  workoutType: WorkoutType;
  startDate: string;
  endDate: string;
  distanceMeters?: number;
  activeCaloriesKcal?: number;
  speedMetersPerSecond?: number;
};

type HealthExerciseWritePlugin = {
  ensureWritePermission(): Promise<{ granted: boolean }>;
  saveExerciseSession(options: {
    workoutType: WorkoutType;
    startDate: string;
    endDate: string;
    distanceMeters?: number;
    activeCaloriesKcal?: number;
    speedMetersPerSecond?: number;
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

  if (
    !shouldWriteExerciseSessionToHealth(options.startDate, options.endDate)
  ) {
    clientTrace("health-write", "exercise_session_skip", {
      reason: "duration_too_short",
      workoutType: options.workoutType,
      durationSeconds: exerciseSessionDurationSeconds(
        options.startDate,
        options.endDate,
      ),
    });
    return;
  }

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
      ...(options.speedMetersPerSecond != null &&
      options.speedMetersPerSecond > 0
        ? { speedMetersPerSecond: options.speedMetersPerSecond }
        : {}),
    });
    clientTrace("health-write", "exercise_session_ok", {
      workoutType: options.workoutType,
      hasSpeed: (options.speedMetersPerSecond ?? 0) > 0,
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
