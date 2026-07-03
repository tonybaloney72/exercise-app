import type { DailyHealthDayMetrics } from "@/lib/health/cardioHealth";
import { buildDailyHealthMetricChartSeries } from "@/lib/health/dailyHealthChart";
import type { DailyHealthMetricChartPoint } from "@/lib/health/dailyHealthChart";
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
  todayRestingHeartRateBpm: number | null;
  todayOxygenSaturationPct: number | null;
  todaySleepTotalMin: number | null;
  todayVo2MaxMlKgMin: number | null;
  stepsChartSeries: DailyStepsChartPoint[];
  activeKcalChartSeries: DailyHealthMetricChartPoint[];
  avgHeartRateChartSeries: DailyHealthMetricChartPoint[];
  restingHeartRateChartSeries: DailyHealthMetricChartPoint[];
  oxygenSaturationChartSeries: DailyHealthMetricChartPoint[];
  sleepTotalChartSeries: DailyHealthMetricChartPoint[];
  vo2MaxChartSeries: DailyHealthMetricChartPoint[];
};

const METRIC_FIELD_BY_KEY: Partial<
  Record<HealthDailyMetricKey, keyof DailyHealthDayMetrics>
> = {
  steps: "steps",
  active_kcal: "activeKcal",
  avg_heart_rate_bpm: "avgHeartRateBpm",
  resting_heart_rate_bpm: "restingHeartRateBpm",
  oxygen_saturation_pct: "oxygenSaturationPct",
  sleep_total_min: "sleepTotalMin",
  sleep_deep_min: "sleepDeepMin",
  sleep_rem_min: "sleepRemMin",
  sleep_light_min: "sleepLightMin",
  sleep_awake_min: "sleepAwakeMin",
  vo2_max_ml_kg_min: "vo2MaxMlKgMin",
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

function collectSeries(
  byDate: Map<string, Map<HealthDailyMetricKey, HealthDailyMetricRecord>>,
  chartDayKeys: readonly string[],
  key: HealthDailyMetricKey,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const dateKey of chartDayKeys) {
    const value = metricValue(byDate, dateKey, key);
    if (value != null) out[dateKey] = value;
  }
  return out;
}

export function buildDailyHealthProgressFromRecords(
  records: readonly HealthDailyMetricRecord[],
  todayKey: string,
  chartDayKeys: readonly string[],
): DailyHealthProgressView {
  const byDate = indexDailyMetricRecords(records);

  const stepsByDate = collectSeries(byDate, chartDayKeys, "steps");
  const activeKcalByDate = collectSeries(byDate, chartDayKeys, "active_kcal");
  const avgHeartRateByDate = collectSeries(
    byDate,
    chartDayKeys,
    "avg_heart_rate_bpm",
  );
  const restingHeartRateByDate = collectSeries(
    byDate,
    chartDayKeys,
    "resting_heart_rate_bpm",
  );
  const oxygenByDate = collectSeries(
    byDate,
    chartDayKeys,
    "oxygen_saturation_pct",
  );
  const sleepByDate = collectSeries(byDate, chartDayKeys, "sleep_total_min");
  const vo2ByDate = collectSeries(byDate, chartDayKeys, "vo2_max_ml_kg_min");

  return {
    todaySteps: metricValue(byDate, todayKey, "steps"),
    todayActiveKcal: metricValue(byDate, todayKey, "active_kcal"),
    todayAvgHeartRateBpm: metricValue(byDate, todayKey, "avg_heart_rate_bpm"),
    todayRestingHeartRateBpm: metricValue(
      byDate,
      todayKey,
      "resting_heart_rate_bpm",
    ),
    todayOxygenSaturationPct: metricValue(
      byDate,
      todayKey,
      "oxygen_saturation_pct",
    ),
    todaySleepTotalMin: metricValue(byDate, todayKey, "sleep_total_min"),
    todayVo2MaxMlKgMin: metricValue(byDate, todayKey, "vo2_max_ml_kg_min"),
    stepsChartSeries: buildDailyStepsChartSeries(stepsByDate),
    activeKcalChartSeries: buildDailyHealthMetricChartSeries(activeKcalByDate),
    avgHeartRateChartSeries:
      buildDailyHealthMetricChartSeries(avgHeartRateByDate),
    restingHeartRateChartSeries: buildDailyHealthMetricChartSeries(
      restingHeartRateByDate,
    ),
    oxygenSaturationChartSeries:
      buildDailyHealthMetricChartSeries(oxygenByDate),
    sleepTotalChartSeries: buildDailyHealthMetricChartSeries(sleepByDate),
    vo2MaxChartSeries: buildDailyHealthMetricChartSeries(vo2ByDate),
  };
}

export function mergeLiveTodayOverProgressView(
  view: DailyHealthProgressView,
  todayKey: string,
  live: DailyHealthDayMetrics | undefined,
): DailyHealthProgressView {
  if (!live) return view;

  const stepsByDate = seriesToRecord(view.stepsChartSeries, "stepCount");
  const activeKcalByDate = seriesToRecord(view.activeKcalChartSeries, "value");
  const avgHeartRateByDate = seriesToRecord(
    view.avgHeartRateChartSeries,
    "value",
  );
  const restingHeartRateByDate = seriesToRecord(
    view.restingHeartRateChartSeries,
    "value",
  );
  const oxygenByDate = seriesToRecord(
    view.oxygenSaturationChartSeries,
    "value",
  );
  const sleepByDate = seriesToRecord(view.sleepTotalChartSeries, "value");
  const vo2ByDate = seriesToRecord(view.vo2MaxChartSeries, "value");

  stepsByDate[todayKey] = live.steps;
  activeKcalByDate[todayKey] = live.activeKcal;
  if (live.avgHeartRateBpm != null) {
    avgHeartRateByDate[todayKey] = live.avgHeartRateBpm;
  }
  if (live.restingHeartRateBpm != null) {
    restingHeartRateByDate[todayKey] = live.restingHeartRateBpm;
  }
  if (live.oxygenSaturationPct != null) {
    oxygenByDate[todayKey] = live.oxygenSaturationPct;
  }
  if (live.sleepTotalMin != null) {
    sleepByDate[todayKey] = live.sleepTotalMin;
  }
  if (live.vo2MaxMlKgMin != null) {
    vo2ByDate[todayKey] = live.vo2MaxMlKgMin;
  }

  return {
    todaySteps: live.steps,
    todayActiveKcal: live.activeKcal,
    todayAvgHeartRateBpm: live.avgHeartRateBpm ?? null,
    todayRestingHeartRateBpm: live.restingHeartRateBpm ?? null,
    todayOxygenSaturationPct: live.oxygenSaturationPct ?? null,
    todaySleepTotalMin: live.sleepTotalMin ?? null,
    todayVo2MaxMlKgMin: live.vo2MaxMlKgMin ?? null,
    stepsChartSeries: buildDailyStepsChartSeries(stepsByDate),
    activeKcalChartSeries: buildDailyHealthMetricChartSeries(activeKcalByDate),
    avgHeartRateChartSeries:
      buildDailyHealthMetricChartSeries(avgHeartRateByDate),
    restingHeartRateChartSeries: buildDailyHealthMetricChartSeries(
      restingHeartRateByDate,
    ),
    oxygenSaturationChartSeries:
      buildDailyHealthMetricChartSeries(oxygenByDate),
    sleepTotalChartSeries: buildDailyHealthMetricChartSeries(sleepByDate),
    vo2MaxChartSeries: buildDailyHealthMetricChartSeries(vo2ByDate),
  };
}

function seriesToRecord<T extends { date: string }>(
  series: readonly T[],
  valueKey: keyof T,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const point of series) {
    const value = point[valueKey];
    if (typeof value === "number" && Number.isFinite(value)) {
      out[point.date] = value;
    }
  }
  return out;
}

export function recordsHaveAnySyncedData(
  records: readonly HealthDailyMetricRecord[],
): boolean {
  return records.some((row) => row.valueNum != null);
}
