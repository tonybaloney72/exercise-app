import type { Workout } from "@/lib/health/healthConnectTypes";
import type { CardioActivityKind, CardioActivitySource } from "@/types";
import { metersToMiles } from "@/lib/geo/haversine";
import { cardioKindToWorkoutType } from "@/lib/health/cardioKindMap";
import { ensureExerciseSessionWriteAccess } from "@/lib/health/healthExerciseWrite";
import {
  CARDIO_HEALTH_READ_TYPES,
  checkNativeHealthAuthorization,
  isNativeHealthAvailable,
  queryNativeWorkouts,
  requestNativeHealthAuthorization,
} from "@/lib/health/nativeHealth";
import { isNativePlatform } from "@/lib/capacitorRuntime";
import { withTimeout } from "@/lib/async/withTimeout";
import { clientTrace, clientTraceAsync } from "@/lib/diagnostics/clientTrace";
import { formatLocalDateKey, parseLocalDateKey } from "@/utils/localDateKey";
import { rankCardioSessionsForImport } from "@/lib/health/cardioSessionMatch";
import type { HealthDataType } from "@/lib/health/healthConnectTypes";
import {
  queryHealthConnectLocalDayTotal,
  queryHealthConnectRangeTotal,
} from "@/lib/health/healthConnectAggregate";

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
  if (await hasCardioHealthReadAccess()) {
    await ensureExerciseSessionWriteAccess();
    return true;
  }
  // Skip isAvailable() — it can hang on some devices; requestAuthorization opens HC directly.
  const status = await requestNativeHealthAuthorization({
    read: CARDIO_HEALTH_READ_TYPES,
    write: [],
  });
  const granted = (status?.readAuthorized.length ?? 0) > 0;
  if (granted) {
    await ensureExerciseSessionWriteAccess();
  }
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
  const avg = await queryHealthConnectRangeTotal({
    dataType: "heartRate",
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
  if (avg == null || avg <= 0) return undefined;
  return avg;
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

  const [stepCount, distanceMeters, calorieTotal, avgHeartRateBpm] =
    await Promise.all([
      queryHealthConnectRangeTotal({
        dataType: "steps",
        startDate: isoStart,
        endDate: isoEnd,
      }),
      queryHealthConnectRangeTotal({
        dataType: "distance",
        startDate: isoStart,
        endDate: isoEnd,
      }),
      needsCalories
        ? queryHealthConnectRangeTotal({
            dataType: "calories",
            startDate: isoStart,
            endDate: isoEnd,
          })
        : Promise.resolve(undefined),
      fetchHeartRateAverage(startDate, endDate),
    ]);

  const distanceMi =
    distanceMeters != null && distanceMeters > 0
      ? Math.round(metersToMiles(distanceMeters) * 100) / 100
      : undefined;

  return {
    stepCount: stepCount != null && stepCount > 0 ? stepCount : undefined,
    activeCaloriesKcal:
      calorieTotal != null && calorieTotal > 0
        ? Math.round(calorieTotal)
        : options?.activeCaloriesKcal,
    avgHeartRateBpm,
    distanceMi,
    healthSourceName: options?.healthSourceName,
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
  const day = parseLocalDateKey(dateKey);
  if (!day) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end: new Date(now) };
  }
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  if (dateKey === formatLocalDateKey(now)) {
    return { start, end: new Date(now) };
  }
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
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

function isAggregateMetric(dataType: HealthDataType): boolean {
  return (
    dataType === "steps" ||
    dataType === "calories" ||
    dataType === "totalCalories" ||
    dataType === "heartRate"
  );
}

async function readDailyHealthMetricTotal(
  isoStart: string,
  isoEnd: string,
  dataType: HealthDataType,
): Promise<number> {
  if (!isAggregateMetric(dataType)) return 0;

  const nativeTotal = await queryHealthConnectRangeTotal({
    dataType,
    startDate: isoStart,
    endDate: isoEnd,
  });
  return nativeTotal ?? 0;
}

/** Health Connect totals for one local calendar day (midnight → now if today). */
export async function fetchDailyHealthMetrics(
  dateKey: string,
  now: Date = new Date(),
): Promise<DailyHealthDayMetrics | undefined> {
  if (!isNativePlatform()) return undefined;
  if (!(await hasCardioHealthReadAccess())) return undefined;

  const isToday = dateKey === formatLocalDateKey(now);

  async function readDailyMetric(dataType: HealthDataType): Promise<number> {
    if (
      dataType === "steps" ||
      dataType === "calories" ||
      dataType === "totalCalories"
    ) {
      const localDayTotal = await queryHealthConnectLocalDayTotal({
        dateKey,
        isToday,
        dataType,
      });
      if (localDayTotal != null) return localDayTotal;
    }

    const { start, end } = localDayHealthWindow(dateKey, now);
    return readDailyHealthMetricTotal(
      start.toISOString(),
      end.toISOString(),
      dataType,
    );
  }

  const { start, end } = localDayHealthWindow(dateKey, now);
  const isoStart = start.toISOString();
  const isoEnd = end.toISOString();
  const [steps, caloriesFromActive, caloriesFromTotal, avgHeartRateBpm] =
    await Promise.all([
      readDailyMetric("steps"),
      readDailyMetric("calories"),
      readDailyMetric("totalCalories"),
      readDailyHealthMetricTotal(isoStart, isoEnd, "heartRate").then((v) =>
        v > 0 ? v : undefined,
      ),
    ]);

  const activeKcal =
    caloriesFromActive > 0 ? caloriesFromActive : caloriesFromTotal;

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

/** Read-only check — does not open the Health Connect permission UI. */
export async function checkCardioHealthReadAccess(): Promise<boolean> {
  return hasCardioHealthReadAccess();
}

