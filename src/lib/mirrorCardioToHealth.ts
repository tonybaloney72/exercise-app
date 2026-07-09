import { writeAppTrackedCardioToHealth } from "@/lib/health";
import { shouldMirrorCardioCaptureToHealth } from "@/lib/cardioHealthMirrorPolicy";
import {
  MIN_HEALTH_EXERCISE_WRITE_SECONDS,
  shouldWriteExerciseSessionToHealth,
} from "@/lib/health/healthExerciseWrite";
import type { CardioQuickLogResolution } from "@/lib/health/resolveCardioQuickLog";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import type { CardioActivityKind, CardioActivitySource } from "@/types";

type MirrorTimeWindow = {
  startDate: Date;
  endDate: Date;
  durationSeconds: number;
};

/** Resolve a real activity window for HC mirroring (no synthetic 1-min padding). */
export function resolveCardioMirrorTimeWindow(input: {
  durationSeconds?: number;
  activityStartTime?: string;
  activityEndTime?: string;
}): MirrorTimeWindow | null {
  const hasDuration =
    input.durationSeconds != null &&
    input.durationSeconds > 0 &&
    !Number.isNaN(input.durationSeconds);

  if (input.activityStartTime && input.activityEndTime) {
    const startDate = new Date(input.activityStartTime);
    const endDate = new Date(input.activityEndTime);
    let durationSeconds = Math.round(
      (endDate.getTime() - startDate.getTime()) / 1000,
    );
    if (
      durationSeconds < MIN_HEALTH_EXERCISE_WRITE_SECONDS &&
      hasDuration &&
      input.durationSeconds! >= MIN_HEALTH_EXERCISE_WRITE_SECONDS
    ) {
      durationSeconds = input.durationSeconds!;
      return {
        startDate: new Date(endDate.getTime() - durationSeconds * 1000),
        endDate,
        durationSeconds,
      };
    }
    if (!shouldWriteExerciseSessionToHealth(startDate, endDate)) {
      return null;
    }
    return { startDate, endDate, durationSeconds };
  }

  if (
    hasDuration &&
    input.durationSeconds! >= MIN_HEALTH_EXERCISE_WRITE_SECONDS
  ) {
    const endDate = new Date();
    const durationSeconds = input.durationSeconds!;
    return {
      startDate: new Date(endDate.getTime() - durationSeconds * 1000),
      endDate,
      durationSeconds,
    };
  }

  return null;
}

export async function mirrorCardioCaptureToHealth(input: {
  kind: CardioActivityKind;
  distanceMi?: number;
  durationSeconds?: number;
  activeCaloriesKcal?: number;
  activityStartTime?: string;
  activityEndTime?: string;
  weightLb?: number;
  healthSource?: CardioActivitySource;
  resolution?: CardioQuickLogResolution | null;
}): Promise<void> {
  if (!isNativePlatform()) return;
  if (!shouldMirrorCardioCaptureToHealth(input)) return;

  const hasDistance =
    input.distanceMi != null &&
    input.distanceMi > 0 &&
    !Number.isNaN(input.distanceMi);
  const hasDuration =
    input.durationSeconds != null &&
    input.durationSeconds > 0 &&
    !Number.isNaN(input.durationSeconds);
  if (!hasDistance && !hasDuration) return;

  const window = resolveCardioMirrorTimeWindow(input);
  if (!window) return;

  await writeAppTrackedCardioToHealth({
    kind: input.kind,
    distanceMi: hasDistance ? input.distanceMi : undefined,
    durationSeconds: window.durationSeconds,
    activeCaloriesKcal: input.activeCaloriesKcal,
    startDate: window.startDate,
    endDate: window.endDate,
    weightLb: input.weightLb,
  });
}
