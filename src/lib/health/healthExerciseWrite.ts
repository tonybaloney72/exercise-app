import { registerPlugin } from "@capacitor/core";
import type { WorkoutType } from "@capgo/capacitor-health";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { clientTrace } from "@/lib/diagnostics/clientTrace";
import { cardioKindToWorkoutType } from "@/lib/health/cardioKindMap";
import type { CardioActivityKind } from "@/types";

export type SaveExerciseSessionOptions = {
  kind: CardioActivityKind;
  startDate: string;
  endDate: string;
  distanceMeters?: number;
  activeCaloriesKcal?: number;
};

type HealthExerciseWritePlugin = {
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

export async function saveExerciseSessionToHealth(
  options: SaveExerciseSessionOptions,
): Promise<void> {
  if (!isNativePlatform()) return;

  const workoutType = cardioKindToWorkoutType(options.kind);
  if (!workoutType) {
    clientTrace("health-write", "exercise_session_skip", {
      reason: "unsupported_kind",
      kind: options.kind,
    });
    return;
  }

  try {
    await HealthExerciseWrite.saveExerciseSession({
      workoutType,
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
      kind: options.kind,
      workoutType,
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
