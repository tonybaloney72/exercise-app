import type { Workout } from "@capgo/capacitor-health";
import type { CardioActivityKind, CardioActivitySource } from "@/types";
import { metersToMiles } from "@/lib/geo/haversine";
import { cardioKindToWorkoutType } from "@/lib/health/cardioKindMap";
import {
  CARDIO_HEALTH_READ_TYPES,
  CARDIO_HEALTH_WRITE_TYPES,
  checkNativeHealthAuthorization,
  isNativeHealthAvailable,
  queryNativeWorkouts,
  readNativeHealthSamples,
  requestNativeHealthAuthorization,
  writeNativeHealthSample,
} from "@/lib/health/nativeHealth";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { withTimeout } from "@/lib/async/withTimeout";
import { clientTrace, clientTraceAsync } from "@/lib/diagnostics/clientTrace";

/** Max wait for optional Health Connect reads during GPS/quick-log save. */
const CARDIO_HEALTH_ENRICH_TIMEOUT_MS = 8_000;

export interface CardioHealthMeta {
  stepCount?: number;
  activeCaloriesKcal?: number;
  avgHeartRateBpm?: number;
  source?: CardioActivitySource;
  healthSourceName?: string;
}

export interface ImportedCardioSession {
  distanceMi?: number;
  durationSeconds: number;
  activeCaloriesKcal?: number;
  avgHeartRateBpm?: number;
  stepCount?: number;
  startDate: Date;
  endDate: Date;
  sourceName?: string;
}

export function sumHealthSampleValues(
  samples: ReadonlyArray<{ value: number }>,
): number {
  return samples
    .map((sample) => sample.value)
    .filter((value) => Number.isFinite(value) && value > 0)
    .reduce((sum, value) => sum + value, 0);
}

export function dominantHealthSampleSource(
  samples: ReadonlyArray<{ sourceName?: string }>,
): string | undefined {
  const counts = new Map<string, number>();
  for (const sample of samples) {
    const name = sample.sourceName?.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
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

async function hasCardioHealthReadAccess(): Promise<boolean> {
  if (!isNativePlatform()) {
    clientTrace("health-cardio", "hasReadAccess_skip", { reason: "not_native" });
    return false;
  }
  const status = await checkNativeHealthAuthorization({
    read: CARDIO_HEALTH_READ_TYPES,
    write: [],
  });
  const granted = (status?.readAuthorized.length ?? 0) > 0;
  clientTrace("health-cardio", "hasReadAccess", {
    granted,
    readAuthorized: status?.readAuthorized?.length ?? 0,
    readDenied: status?.readDenied?.length ?? 0,
  });
  return granted;
}

/** Prompts for Health Connect read access (use Import / explicit health flows only). */
export async function ensureCardioHealthReadAccess(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  if (await hasCardioHealthReadAccess()) return true;
  // Skip isAvailable() — it can hang on some devices; requestAuthorization opens HC directly.
  const status = await requestNativeHealthAuthorization({
    read: CARDIO_HEALTH_READ_TYPES,
    write: [],
  });
  const granted = (status?.readAuthorized.length ?? 0) > 0;
  clientTrace("health-cardio", "ensureReadAccess", { granted });
  return granted;
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

async function fetchHeartRateAverage(
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

export async function fetchCardioHealthMetricsForWindow(
  startDate: Date,
  endDate: Date,
  options?: {
    /** When already known (e.g. imported workout totalEnergyBurned). */
    activeCaloriesKcal?: number;
    healthSourceName?: string;
  },
): Promise<CardioHealthMeta> {
  const isoStart = startDate.toISOString();
  const isoEnd = endDate.toISOString();

  const needsCalories =
    options?.activeCaloriesKcal == null || options.activeCaloriesKcal <= 0;

  const [stepSamples, calorieSamples, avgHeartRateBpm] = await Promise.all([
    readNativeHealthSamples({
      dataType: "steps",
      startDate: isoStart,
      endDate: isoEnd,
      limit: 500,
    }),
    needsCalories
      ? readNativeHealthSamples({
          dataType: "calories",
          startDate: isoStart,
          endDate: isoEnd,
          limit: 500,
        })
      : Promise.resolve([]),
    fetchHeartRateAverage(startDate, endDate),
  ]);

  const stepTotal = sumHealthSampleValues(stepSamples);
  const calorieTotal = needsCalories
    ? sumHealthSampleValues(calorieSamples)
    : options?.activeCaloriesKcal ?? 0;

  const healthSourceName =
    options?.healthSourceName?.trim() ||
    dominantHealthSampleSource(stepSamples) ||
    dominantHealthSampleSource(calorieSamples);

  return {
    stepCount: stepTotal > 0 ? Math.round(stepTotal) : undefined,
    activeCaloriesKcal:
      calorieTotal > 0 ? Math.round(calorieTotal) : options?.activeCaloriesKcal,
    avgHeartRateBpm,
    healthSourceName,
  };
}

export async function enrichCardioHealthMeta(
  startDate: Date,
  endDate: Date,
  base?: CardioHealthMeta,
): Promise<CardioHealthMeta | undefined> {
  clientTrace("health-cardio", "enrich_start", {
    source: base?.source,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
  if (!(await hasCardioHealthReadAccess())) {
    clientTrace("health-cardio", "enrich_skip", { reason: "not_authorized" });
    return base;
  }

  try {
    const fetched = await withTimeout(
      clientTraceAsync(
        "health-cardio",
        "fetchMetricsForWindow",
        () =>
          fetchCardioHealthMetricsForWindow(startDate, endDate, {
            activeCaloriesKcal: base?.activeCaloriesKcal,
            healthSourceName: base?.healthSourceName,
          }),
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      ),
      CARDIO_HEALTH_ENRICH_TIMEOUT_MS,
      "Health Connect read timed out",
    );
    clientTrace("health-cardio", "enrich_ok", {
      stepCount: fetched.stepCount,
      activeCaloriesKcal: fetched.activeCaloriesKcal,
      avgHeartRateBpm: fetched.avgHeartRateBpm,
    });
    return {
      ...base,
      stepCount: fetched.stepCount ?? base?.stepCount,
      activeCaloriesKcal: fetched.activeCaloriesKcal ?? base?.activeCaloriesKcal,
      avgHeartRateBpm: fetched.avgHeartRateBpm ?? base?.avgHeartRateBpm,
      healthSourceName: fetched.healthSourceName ?? base?.healthSourceName,
      source: base?.source,
    };
  } catch (err) {
    clientTrace(
      "health-cardio",
      "enrich_error",
      {
        message: err instanceof Error ? err.message : String(err),
      },
      "error",
    );
    return base;
  }
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
