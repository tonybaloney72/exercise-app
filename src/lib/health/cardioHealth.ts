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
  queryNativeHealthAggregated,
  requestNativeHealthAuthorization,
  writeNativeHealthSample,
} from "@/lib/health/nativeHealth";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { withTimeout } from "@/lib/async/withTimeout";
import { clientTrace, clientTraceAsync } from "@/lib/diagnostics/clientTrace";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { rankCardioSessionsForImport } from "@/lib/health/cardioSessionMatch";
import type { HealthDataType } from "@capgo/capacitor-health";
import {
  aggregateDailyHealthSampleTotal,
  aggregatedBucketTotal,
  perSourceDailySampleTotals,
  resolveDailyHealthMetricTotal,
  sumHealthSampleValues,
} from "@/lib/health/healthSampleAggregation";

/** Max wait for optional Health Connect reads during GPS/quick-log save. */
const CARDIO_HEALTH_ENRICH_TIMEOUT_MS = 8_000;

export interface CardioHealthMeta {
  stepCount?: number;
  activeCaloriesKcal?: number;
  avgHeartRateBpm?: number;
  /** Distance from HC samples in the user window (miles). */
  distanceMi?: number;
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
  workoutType?: string;
}

export {
  aggregateDailyHealthSampleTotal,
  resolveDailyHealthMetricTotal,
  sumHealthSampleValues,
} from "@/lib/health/healthSampleAggregation";

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
    workoutType: workout.workoutType,
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
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - lookbackHours * 60 * 60 * 1000);
  const workouts = await queryWorkoutsOverlappingWindow(startDate, endDate, {
    limit: 40,
  });
  const sessions = workouts
    .map(mapWorkoutToImportedSession)
    .filter((s) => s.durationSeconds > 0);
  const ranked = rankCardioSessionsForImport(kind, sessions);
  return ranked.slice(0, limit).map((row) => row.session);
}

const WORKOUT_WINDOW_PAD_MS = 2 * 60 * 1000;

/** All HC exercise sessions overlapping a time window (no strict type filter). */
export async function queryWorkoutsOverlappingWindow(
  startDate: Date,
  endDate: Date,
  options?: { limit?: number },
): Promise<Workout[]> {
  if (!isNativePlatform()) return [];
  if (!(await hasCardioHealthReadAccess())) return [];

  const paddedStart = new Date(startDate.getTime() - WORKOUT_WINDOW_PAD_MS);
  const paddedEnd = new Date(endDate.getTime() + WORKOUT_WINDOW_PAD_MS);

  const workouts = await queryNativeWorkouts({
    startDate: paddedStart.toISOString(),
    endDate: paddedEnd.toISOString(),
    limit: options?.limit ?? 30,
    ascending: false,
  });

  const windowStart = startDate.getTime();
  const windowEnd = endDate.getTime();

  return workouts.filter((workout) => {
    const s = Date.parse(workout.startDate);
    const e = Date.parse(workout.endDate);
    if (!Number.isFinite(s) || !Number.isFinite(e)) return false;
    return e > windowStart && s < windowEnd;
  });
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

  const [stepSamples, distanceSamples, calorieSamples, avgHeartRateBpm] =
    await Promise.all([
      readNativeHealthSamples({
        dataType: "steps",
        startDate: isoStart,
        endDate: isoEnd,
        limit: 500,
      }),
      readNativeHealthSamples({
        dataType: "distance",
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
  const distanceMeters = sumHealthSampleValues(distanceSamples);
  const distanceMi =
    distanceMeters > 0
      ? Math.round(metersToMiles(distanceMeters) * 100) / 100
      : undefined;
  const calorieTotal = needsCalories
    ? sumHealthSampleValues(calorieSamples)
    : options?.activeCaloriesKcal ?? 0;

  const healthSourceName =
    options?.healthSourceName?.trim() ||
    dominantHealthSampleSource(stepSamples) ||
    dominantHealthSampleSource(distanceSamples) ||
    dominantHealthSampleSource(calorieSamples);

  return {
    stepCount: stepTotal > 0 ? Math.round(stepTotal) : undefined,
    activeCaloriesKcal:
      calorieTotal > 0 ? Math.round(calorieTotal) : options?.activeCaloriesKcal,
    avgHeartRateBpm,
    distanceMi,
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
      distanceMi: fetched.distanceMi ?? base?.distanceMi,
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

/** Local calendar-day window for Health Connect daily aggregates. Today ends at `now`. */
export function localDayHealthWindow(
  dateKey: string,
  now: Date = new Date(),
): { start: Date; end: Date } {
  const [y, m, d] = dateKey.split("-").map(Number);
  const start = new Date(y!, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  if (dateKey === formatLocalDateKey(now)) {
    return { start, end: new Date(now) };
  }
  const end = new Date(y!, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999);
  return { start, end };
}

export function lastNLocalDateKeys(
  dayCount: number,
  now: Date = new Date(),
): string[] {
  const keys: string[] = [];
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    keys.push(formatLocalDateKey(d));
  }
  return keys;
}

export type DailyHealthDayMetrics = {
  steps: number;
  activeKcal: number;
  avgHeartRateBpm?: number;
};

function averageHealthSampleValues(
  samples: ReadonlyArray<{ value: number }>,
): number | undefined {
  const values = samples
    .map((sample) => sample.value)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (values.length === 0) return undefined;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

async function readDailyHealthMetricTotal(
  isoStart: string,
  isoEnd: string,
  dataType: HealthDataType,
): Promise<number> {
  const samplesPromise = readNativeHealthSamples({
    dataType,
    startDate: isoStart,
    endDate: isoEnd,
    limit: 500,
  });

  const [buckets, samples] = await Promise.all([
    dataType === "totalCalories"
      ? Promise.resolve([])
      : queryNativeHealthAggregated({
          dataType,
          startDate: isoStart,
          endDate: isoEnd,
          bucket: "day",
          aggregation: "sum",
        }),
    samplesPromise,
  ]);

  const aggregate = aggregatedBucketTotal(buckets);
  const fromSamples = aggregateDailyHealthSampleTotal(samples);
  const resolved = resolveDailyHealthMetricTotal(aggregate, samples);

  clientTrace("health-cardio", "daily_metric_resolve", {
    dataType,
    startDate: isoStart,
    endDate: isoEnd,
    aggregate,
    sampleCount: samples.length,
    fromSamples,
    resolved,
    perSourceTotals: perSourceDailySampleTotals(samples),
    sourceNames: [
      ...new Set(
        samples
          .map((sample) => sample.sourceName?.trim())
          .filter((name): name is string => Boolean(name)),
      ),
    ],
  });

  return resolved;
}

/** Health Connect totals for one local calendar day (midnight → now if today). */
export async function fetchDailyHealthMetrics(
  dateKey: string,
  now: Date = new Date(),
): Promise<DailyHealthDayMetrics | undefined> {
  if (!isNativePlatform()) return undefined;
  if (!(await hasCardioHealthReadAccess())) return undefined;

  const { start, end } = localDayHealthWindow(dateKey, now);
  const isoStart = start.toISOString();
  const isoEnd = end.toISOString();

  const [steps, caloriesFromActive, caloriesFromTotal, heartRateSamples] =
    await Promise.all([
      readDailyHealthMetricTotal(isoStart, isoEnd, "steps"),
      readDailyHealthMetricTotal(isoStart, isoEnd, "calories"),
      readDailyHealthMetricTotal(isoStart, isoEnd, "totalCalories"),
      readNativeHealthSamples({
        dataType: "heartRate",
        startDate: isoStart,
        endDate: isoEnd,
        limit: 500,
      }),
    ]);

  const activeKcal =
    caloriesFromActive > 0 ? caloriesFromActive : caloriesFromTotal;

  const avgHeartRateBpm = averageHealthSampleValues(heartRateSamples);

  return {
    steps,
    activeKcal,
    ...(avgHeartRateBpm != null ? { avgHeartRateBpm } : {}),
  };
}

export async function fetchDailyHealthMetricsForKeys(
  dateKeys: readonly string[],
  now: Date = new Date(),
): Promise<Record<string, DailyHealthDayMetrics>> {
  if (!isNativePlatform() || dateKeys.length === 0) return {};
  if (!(await hasCardioHealthReadAccess())) return {};

  const entries = await Promise.all(
    dateKeys.map(async (dateKey) => {
      const metrics = await fetchDailyHealthMetrics(dateKey, now);
      return [dateKey, metrics] as const;
    }),
  );

  const out: Record<string, DailyHealthDayMetrics> = {};
  for (const [dateKey, metrics] of entries) {
    if (metrics != null) out[dateKey] = metrics;
  }
  return out;
}

/** Steps from Health Connect for one local calendar day (midnight → now if today). */
export async function fetchDailyStepCount(
  dateKey: string,
  now: Date = new Date(),
): Promise<number | undefined> {
  const metrics = await fetchDailyHealthMetrics(dateKey, now);
  return metrics?.steps;
}

export async function fetchDailyStepCountsForKeys(
  dateKeys: readonly string[],
  now: Date = new Date(),
): Promise<Record<string, number>> {
  const byDate = await fetchDailyHealthMetricsForKeys(dateKeys, now);
  const out: Record<string, number> = {};
  for (const [dateKey, metrics] of Object.entries(byDate)) {
    out[dateKey] = metrics.steps;
  }
  return out;
}

/** Read-only check — does not open the Health Connect permission UI. */
export async function checkCardioHealthReadAccess(): Promise<boolean> {
  return hasCardioHealthReadAccess();
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
