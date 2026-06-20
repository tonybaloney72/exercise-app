import type { DailyHealthDayMetrics } from "@/lib/health/cardioHealth";
import {
  dailyHealthDayMetricsToUpserts,
  type DailyHealthProgressView,
} from "@/lib/health/dailyHealthRecords";
import type { DailyHealthMetricRepo } from "@/lib/repos/types";
import type { HealthDailyMetricKey, HealthDailyMetricUpsert } from "@/types/healthDailyMetrics";

const DAILY_HEALTH_SYNC_STORAGE_KEY = "exercise-app-health-daily-sync-v1";
export const DAILY_HEALTH_CHART_DAYS = 14;
const DAILY_HEALTH_TODAY_SYNC_MIN_INTERVAL_MS = 30 * 60 * 1000;
const DAILY_HEALTH_TODAY_STEP_DELTA = 100;

type SyncSnapshot = {
  version: 1;
  lastTodaySyncAtMs: number;
  /** logDate → metricKey → last synced scalar */
  byDate: Record<string, Partial<Record<HealthDailyMetricKey, number>>>;
};

function emptySnapshot(): SyncSnapshot {
  return { version: 1, lastTodaySyncAtMs: 0, byDate: {} };
}

function loadDailyHealthSyncSnapshot(): SyncSnapshot {
  if (typeof window === "undefined") return emptySnapshot();
  try {
    const raw = localStorage.getItem(DAILY_HEALTH_SYNC_STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as SyncSnapshot;
    if (parsed?.version !== 1 || typeof parsed.byDate !== "object") {
      return emptySnapshot();
    }
    return {
      version: 1,
      lastTodaySyncAtMs: parsed.lastTodaySyncAtMs ?? 0,
      byDate: parsed.byDate ?? {},
    };
  } catch {
    return emptySnapshot();
  }
}

function saveDailyHealthSyncSnapshot(snapshot: SyncSnapshot): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAILY_HEALTH_SYNC_STORAGE_KEY, JSON.stringify(snapshot));
}

function snapshotValuesForDay(
  snapshot: SyncSnapshot,
  logDate: string,
): Partial<Record<HealthDailyMetricKey, number>> {
  return snapshot.byDate[logDate] ?? {};
}

function metricsChanged(
  logDate: string,
  metrics: DailyHealthDayMetrics,
  snapshot: SyncSnapshot,
): boolean {
  const upserts = dailyHealthDayMetricsToUpserts(logDate, metrics);
  const prev = snapshotValuesForDay(snapshot, logDate);
  return upserts.some((row) => {
    if (row.valueNum == null) return false;
    return prev[row.metricKey] !== row.valueNum;
  });
}

export function shouldSyncDailyHealthForDate(options: {
  logDate: string;
  todayKey: string;
  metrics: DailyHealthDayMetrics;
  snapshot: SyncSnapshot;
  nowMs: number;
  force?: boolean;
}): boolean {
  const { logDate, todayKey, metrics, snapshot, nowMs, force } = options;
  if (force) return true;

  const prev = snapshotValuesForDay(snapshot, logDate);
  const hasSnapshot = Object.keys(prev).length > 0;

  if (logDate !== todayKey) {
    return !hasSnapshot || metricsChanged(logDate, metrics, snapshot);
  }

  if (!hasSnapshot || metricsChanged(logDate, metrics, snapshot)) return true;

  if (nowMs - snapshot.lastTodaySyncAtMs >= DAILY_HEALTH_TODAY_SYNC_MIN_INTERVAL_MS) {
    return true;
  }

  const stepDelta = Math.abs(metrics.steps - (prev.steps ?? metrics.steps));
  return stepDelta >= DAILY_HEALTH_TODAY_STEP_DELTA;
}

export function buildDailyHealthSyncUpserts(options: {
  todayKey: string;
  metricsByDate: Record<string, DailyHealthDayMetrics>;
  snapshot: SyncSnapshot;
  nowMs: number;
  force?: boolean;
}): { upserts: HealthDailyMetricUpsert[]; snapshot: SyncSnapshot } {
  const { todayKey, metricsByDate, nowMs, force } = options;
  let snapshot = options.snapshot;
  const upserts: HealthDailyMetricUpsert[] = [];
  let syncedToday = false;

  for (const [logDate, metrics] of Object.entries(metricsByDate)) {
    if (
      !shouldSyncDailyHealthForDate({
        logDate,
        todayKey,
        metrics,
        snapshot,
        nowMs,
        force,
      })
    ) {
      continue;
    }

    upserts.push(...dailyHealthDayMetricsToUpserts(logDate, metrics));
    snapshot = {
      ...snapshot,
      byDate: {
        ...snapshot.byDate,
        [logDate]: {
          steps: metrics.steps,
          active_kcal: metrics.activeKcal,
          ...(metrics.avgHeartRateBpm != null
            ? { avg_heart_rate_bpm: metrics.avgHeartRateBpm }
            : {}),
        },
      },
    };
    if (logDate === todayKey) syncedToday = true;
  }

  if (syncedToday) {
    snapshot = { ...snapshot, lastTodaySyncAtMs: nowMs };
  }

  return { upserts, snapshot };
}

export async function syncDailyHealthMetricsToRepo(options: {
  repo: DailyHealthMetricRepo;
  todayKey: string;
  metricsByDate: Record<string, DailyHealthDayMetrics>;
  force?: boolean;
}): Promise<boolean> {
  const nowMs = Date.now();
  const snapshot = loadDailyHealthSyncSnapshot();
  const { upserts, snapshot: nextSnapshot } = buildDailyHealthSyncUpserts({
    todayKey: options.todayKey,
    metricsByDate: options.metricsByDate,
    snapshot,
    nowMs,
    force: options.force,
  });

  if (upserts.length === 0) return false;

  await options.repo.upsertMany(upserts);
  saveDailyHealthSyncSnapshot(nextSnapshot);
  return true;
}
