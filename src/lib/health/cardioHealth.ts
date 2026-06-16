import type { Workout } from "@capgo/capacitor-health";
import type { CardioActivityKind } from "@/types";
import { metersToMiles } from "@/lib/geo/haversine";
import { cardioKindToWorkoutType } from "@/lib/health/cardioKindMap";
import {
  CARDIO_HEALTH_READ_TYPES,
  CARDIO_HEALTH_WRITE_TYPES,
  isNativeHealthAvailable,
  queryNativeWorkouts,
  readNativeHealthSamples,
  requestNativeHealthAuthorization,
  writeNativeHealthSample,
} from "@/lib/health/nativeHealth";

export interface CardioHealthMeta {
  activeCaloriesKcal?: number;
  avgHeartRateBpm?: number;
  source?: "manual" | "gps" | "health_connect";
}

export interface ImportedCardioSession {
  distanceMi?: number;
  durationSeconds: number;
  activeCaloriesKcal?: number;
  avgHeartRateBpm?: number;
  startDate: Date;
  endDate: Date;
  sourceName?: string;
}

export function formatCardioHealthNotes(meta?: CardioHealthMeta): string | undefined {
  if (!meta) return undefined;
  const parts: string[] = [];
  if (meta.activeCaloriesKcal != null && meta.activeCaloriesKcal > 0) {
    parts.push(`${Math.round(meta.activeCaloriesKcal)} active kcal`);
  }
  if (meta.avgHeartRateBpm != null && meta.avgHeartRateBpm > 0) {
    parts.push(`${Math.round(meta.avgHeartRateBpm)} bpm avg`);
  }
  if (meta.source === "gps") parts.push("GPS");
  if (meta.source === "health_connect") parts.push("Health Connect");
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function workoutDurationSeconds(workout: Workout): number {
  if (workout.duration > 0) return Math.round(workout.duration);
  const start = Date.parse(workout.startDate);
  const end = Date.parse(workout.endDate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 1000);
}

export function mapWorkoutToImportedSession(workout: Workout): ImportedCardioSession {
  const distanceMi =
    workout.totalDistance != null && workout.totalDistance > 0
      ? Math.round(metersToMiles(workout.totalDistance) * 100) / 100
      : undefined;
  return {
    distanceMi,
    durationSeconds: workoutDurationSeconds(workout),
    activeCaloriesKcal:
      workout.totalEnergyBurned != null && workout.totalEnergyBurned > 0
        ? Math.round(workout.totalEnergyBurned)
        : undefined,
    startDate: new Date(workout.startDate),
    endDate: new Date(workout.endDate),
    sourceName: workout.sourceName,
  };
}

export async function ensureCardioHealthReadAccess(): Promise<boolean> {
  if (!(await isNativeHealthAvailable())) return false;
  const status = await requestNativeHealthAuthorization({
    read: CARDIO_HEALTH_READ_TYPES,
    write: [],
  });
  return (status?.readAuthorized.length ?? 0) > 0;
}

export async function importRecentCardioSessions(
  kind: CardioActivityKind,
  lookbackHours = 48,
  limit = 8,
): Promise<ImportedCardioSession[]> {
  const workoutType = cardioKindToWorkoutType(kind);
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - lookbackHours * 60 * 60 * 1000);
  const workouts = await queryNativeWorkouts({
    workoutType,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    limit,
    ascending: false,
  });
  return workouts.map(mapWorkoutToImportedSession).filter((s) => s.durationSeconds > 0);
}

export async function fetchHeartRateAverage(
  startDate: Date,
  endDate: Date,
): Promise<number | undefined> {
  const samples = await readNativeHealthSamples({
    dataType: "heartRate",
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    limit: 200,
  });
  const values = samples
    .map((sample) => sample.value)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (values.length === 0) return undefined;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

export async function writeCardioSessionToHealth(options: {
  distanceMi?: number;
  durationSeconds: number;
  activeCaloriesKcal?: number;
  startDate: Date;
  endDate: Date;
}): Promise<void> {
  if (!(await isNativeHealthAvailable())) return;

  await requestNativeHealthAuthorization({
    read: [],
    write: CARDIO_HEALTH_WRITE_TYPES,
  });

  const startDate = options.startDate.toISOString();
  const endDate = options.endDate.toISOString();

  if (options.distanceMi != null && options.distanceMi > 0) {
    await writeNativeHealthSample({
      dataType: "distance",
      value: options.distanceMi * 1609.344,
      startDate,
      endDate,
    });
  }

  if (options.activeCaloriesKcal != null && options.activeCaloriesKcal > 0) {
    await writeNativeHealthSample({
      dataType: "calories",
      value: options.activeCaloriesKcal,
      startDate,
      endDate,
    });
  }
}
