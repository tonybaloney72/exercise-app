import type { DailyHealthDayMetrics } from "@/lib/health/cardioHealth";
import { buildDailyStepsChartSeries } from "@/lib/health/dailyStepsChart";
import type { DailyStepsChartPoint } from "@/lib/health/dailyStepsChart";
import {
  healthMetricDefinition,
  SYNC_ENABLED_HEALTH_METRIC_KEYS,
} from "@/lib/health/dailyMetricRegistry";
import type {
  HealthDailyMetricKey,
  HealthDailyMetricRecord,
  HealthDailyMetricUpsert,
} from "@/types/healthDailyMetrics";

export type DailyHealthProgressView = {
  todaySteps: number | null;
  todayActiveKcal: number | null;
  todayAvgHeartRateBpm: number | null;
  chartSeries: DailyStepsChartPoint[];
};

const METRIC_FIELD_BY_KEY: Partial<
  Record<HealthDailyMetricKey, keyof DailyHealthDayMetrics>
> = {
  steps: "steps",
  active_kcal: "activeKcal",
  avg_heart_rate_bpm: "avgHeartRateBpm",
};

export function dailyHealthDayMetricsToUpserts(
  logDate: string,
  metrics: DailyHealthDayMetrics,
  source = "health_connect",
): HealthDailyMetricUpsert[] {
  const upserts: HealthDailyMetricUpsert[] = [];

  for (const key of SYNC_ENABLED_HEALTH_METRIC_KEYS) {
    const field = METRIC_FIELD_BY_KEY[key];
    if (!field) continue;

    const raw = metrics[field];
    if (raw == null) continue;

    const def = healthMetricDefinition(key);
    upserts.push({
      logDate,
      category: def.category,
      metricKey: key,
      valueNum: raw,
      valueJson: null,
      unit: def.unit,
      aggMethod: def.aggMethod,
      source,
    });
  }

  return upserts;
}

function indexDailyMetricRecords(
  records: readonly HealthDailyMetricRecord[],
): Map<string, Map<HealthDailyMetricKey, HealthDailyMetricRecord>> {
  const byDate = new Map<string, Map<HealthDailyMetricKey, HealthDailyMetricRecord>>();
  for (const row of records) {
    let day = byDate.get(row.logDate);
    if (!day) {
      day = new Map();
      byDate.set(row.logDate, day);
    }
    day.set(row.metricKey, row);
  }
  return byDate;
}

function metricValue(
  byDate: Map<string, Map<HealthDailyMetricKey, HealthDailyMetricRecord>>,
  logDate: string,
  key: HealthDailyMetricKey,
): number | null {
  const value = byDate.get(logDate)?.get(key)?.valueNum;
  return value != null && Number.isFinite(value) ? value : null;
}

export function buildDailyHealthProgressFromRecords(
  records: readonly HealthDailyMetricRecord[],
  todayKey: string,
  chartDayKeys: readonly string[],
): DailyHealthProgressView {
  const byDate = indexDailyMetricRecords(records);

  const stepsByDate: Record<string, number> = {};
  for (const dateKey of chartDayKeys) {
    const steps = metricValue(byDate, dateKey, "steps");
    if (steps != null) stepsByDate[dateKey] = steps;
  }

  return {
    todaySteps: metricValue(byDate, todayKey, "steps"),
    todayActiveKcal: metricValue(byDate, todayKey, "active_kcal"),
    todayAvgHeartRateBpm: metricValue(byDate, todayKey, "avg_heart_rate_bpm"),
    chartSeries: buildDailyStepsChartSeries(stepsByDate),
  };
}

export function mergeLiveTodayOverProgressView(
  view: DailyHealthProgressView,
  todayKey: string,
  live: DailyHealthDayMetrics | undefined,
): DailyHealthProgressView {
  if (!live) return view;

  const stepsByDate = Object.fromEntries(
    view.chartSeries.map((point) => [point.date, point.stepCount]),
  );
  stepsByDate[todayKey] = live.steps;

  return {
    todaySteps: live.steps,
    todayActiveKcal: live.activeKcal,
    todayAvgHeartRateBpm: live.avgHeartRateBpm ?? null,
    chartSeries: buildDailyStepsChartSeries(stepsByDate),
  };
}

export function recordsHaveAnySyncedData(
  records: readonly HealthDailyMetricRecord[],
): boolean {
  return records.some((row) => row.valueNum != null);
}
