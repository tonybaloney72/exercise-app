import { resolveActiveCaloriesForWrite } from "@/lib/health/cardioCalorieEstimate";
import {
  isNativeHealthAvailable,
  requestNativeHealthAuthorization,
  writeNativeHealthSample,
  CARDIO_HEALTH_WRITE_TYPES,
} from "@/lib/health/nativeHealth";
import { saveExerciseSessionToHealth } from "@/lib/health/healthExerciseWrite";
import { clientTrace } from "@/lib/diagnostics/clientTrace";
import type { CardioActivityKind } from "@/types";

const LB_TO_KG = 0.45359237;

export type AppTrackedCardioWriteInput = {
  kind: CardioActivityKind;
  distanceMi?: number;
  durationSeconds: number;
  startDate: Date;
  endDate: Date;
  activeCaloriesKcal?: number;
  weightLb?: number;
};

/** Mirror ME-tracked cardio to Health Connect (samples + exercise session). */
export async function writeAppTrackedCardioToHealth(
  input: AppTrackedCardioWriteInput,
): Promise<void> {
  if (!(await isNativeHealthAvailable())) return;

  await requestNativeHealthAuthorization({
    read: [],
    write: [...CARDIO_HEALTH_WRITE_TYPES, "weight"],
  });

  const isoStart = input.startDate.toISOString();
  const isoEnd = input.endDate.toISOString();
  const activeKcal = resolveActiveCaloriesForWrite({
    kind: input.kind,
    durationSeconds: input.durationSeconds,
    fromHealth: input.activeCaloriesKcal,
    weightLb: input.weightLb,
  });

  if (input.distanceMi != null && input.distanceMi > 0) {
    await writeNativeHealthSample({
      dataType: "distance",
      value: input.distanceMi * 1609.344,
      startDate: isoStart,
      endDate: isoEnd,
    });
  }

  if (activeKcal != null && activeKcal > 0) {
    await writeNativeHealthSample({
      dataType: "calories",
      value: activeKcal,
      startDate: isoStart,
      endDate: isoEnd,
    });
  }

  await saveExerciseSessionToHealth({
    kind: input.kind,
    startDate: isoStart,
    endDate: isoEnd,
    ...(input.distanceMi != null && input.distanceMi > 0
      ? { distanceMeters: input.distanceMi * 1609.344 }
      : {}),
    ...(activeKcal != null && activeKcal > 0
      ? { activeCaloriesKcal: activeKcal }
      : {}),
  });

  clientTrace("health-write", "app_tracked_cardio_ok", {
    kind: input.kind,
    distanceMi: input.distanceMi,
    activeKcal,
    durationSeconds: input.durationSeconds,
  });
}

export async function writeWeightToHealth(options: {
  weightLb: number;
  recordedAt?: Date;
}): Promise<void> {
  if (!(await isNativeHealthAvailable())) return;
  if (!Number.isFinite(options.weightLb) || options.weightLb <= 0) return;

  await requestNativeHealthAuthorization({
    read: [],
    write: ["weight"],
  });

  const at = options.recordedAt ?? new Date();
  const iso = at.toISOString();
  const weightKg = options.weightLb * LB_TO_KG;

  await writeNativeHealthSample({
    dataType: "weight",
    value: weightKg,
    startDate: iso,
    endDate: iso,
  });

  clientTrace("health-write", "weight_ok", { weightLb: options.weightLb });
}

/** @deprecated Use {@link writeAppTrackedCardioToHealth}. */
export async function writeCardioSessionToHealth(options: {
  distanceMi?: number;
  durationSeconds: number;
  activeCaloriesKcal?: number;
  startDate: Date;
  endDate: Date;
}): Promise<void> {
  await writeAppTrackedCardioToHealth({
    kind: "walk",
    distanceMi: options.distanceMi,
    durationSeconds: options.durationSeconds,
    startDate: options.startDate,
    endDate: options.endDate,
    activeCaloriesKcal: options.activeCaloriesKcal,
  });
}
