import type {
  HealthDailyMetricRecord,
  HealthDailyMetricUpsert,
  HealthDailyMetricKey,
  HealthMetricAggMethod,
  HealthMetricCategory,
} from "@/types/healthDailyMetrics";
import type { DailyHealthMetricRepo } from "./types";

export const LOCAL_HEALTH_DAILY_METRICS_KEY =
  "exercise-app-health-daily-metrics";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isMetricKey(value: string): value is HealthDailyMetricKey {
  return typeof value === "string" && value.length > 0;
}

function isCategory(value: string): value is HealthMetricCategory {
  return [
    "activity",
    "body_measurements",
    "cycle_tracking",
    "nutrition",
    "sleep",
    "vitals",
    "wellness",
  ].includes(value);
}

function isAggMethod(value: string): value is HealthMetricAggMethod {
  return ["sum", "avg", "last", "max", "min"].includes(value);
}

function sanitizeRecord(raw: unknown): HealthDailyMetricRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const logDate = row.logDate;
  const metricKey = row.metricKey;
  const category = row.category;
  const unit = row.unit;
  const aggMethod = row.aggMethod;
  const source = row.source;
  const syncedAt = row.syncedAt;
  if (
    typeof logDate !== "string" ||
    typeof metricKey !== "string" ||
    typeof category !== "string" ||
    typeof unit !== "string" ||
    typeof aggMethod !== "string" ||
    typeof source !== "string" ||
    typeof syncedAt !== "string" ||
    !isMetricKey(metricKey) ||
    !isCategory(category) ||
    !isAggMethod(aggMethod)
  ) {
    return null;
  }

  const valueNum =
    row.valueNum == null
      ? null
      : Number.isFinite(Number(row.valueNum))
        ? Number(row.valueNum)
        : null;

  const valueJson =
    row.valueJson != null && typeof row.valueJson === "object"
      ? (row.valueJson as Record<string, unknown>)
      : null;

  return {
    logDate,
    metricKey,
    category,
    unit,
    aggMethod,
    source,
    syncedAt,
    valueNum,
    valueJson,
  };
}

function loadStoredRecords(): HealthDailyMetricRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(LOCAL_HEALTH_DAILY_METRICS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeRecord)
      .filter((row): row is HealthDailyMetricRecord => row != null);
  } catch {
    return [];
  }
}

function persistRecords(records: HealthDailyMetricRecord[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(LOCAL_HEALTH_DAILY_METRICS_KEY, JSON.stringify(records));
}

function recordKey(row: Pick<HealthDailyMetricRecord, "logDate" | "metricKey">) {
  return `${row.logDate}\0${row.metricKey}`;
}

function upsertStoredMany(entries: HealthDailyMetricUpsert[]): void {
  const now = new Date().toISOString();
  const map = new Map<string, HealthDailyMetricRecord>();
  for (const row of loadStoredRecords()) {
    map.set(recordKey(row), row);
  }
  for (const entry of entries) {
    map.set(recordKey(entry), {
      ...entry,
      syncedAt: entry.syncedAt ?? now,
    });
  }
  persistRecords(
    [...map.values()].sort((a, b) =>
      a.logDate === b.logDate
        ? a.metricKey.localeCompare(b.metricKey)
        : a.logDate.localeCompare(b.logDate),
    ),
  );
}

export const localDailyHealthMetricRepo: DailyHealthMetricRepo = {
  async listSince(sinceDateKey: string) {
    return loadStoredRecords().filter((row) => row.logDate >= sinceDateKey);
  },

  async upsertMany(entries) {
    if (entries.length === 0) return;
    upsertStoredMany(entries);
  },
};
