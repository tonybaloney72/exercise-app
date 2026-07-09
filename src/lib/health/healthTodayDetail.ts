import type { HealthDayRecord } from "@/lib/health/healthConnectTypes";
import type { HealthStatSlug } from "@/lib/health/healthStatRoutes";

export type HealthTodayRecordType =
  | "steps"
  | "heartRate"
  | "restingHeartRate"
  | "oxygenSaturation"
  | "sleep"
  | "vo2Max";

export type HourlyHealthChartPoint = {
  hour: number;
  xLabel: string;
  value: number;
};

export type HealthRecordLogEntry = {
  id: string;
  timeLabel: string;
  detailLabel: string;
  sourceName?: string;
  sortKey: number;
};

export type HealthTodayAggregation = "sum" | "avg";

const SLUG_TO_RECORD_TYPE: Partial<
  Record<HealthStatSlug, HealthTodayRecordType>
> = {
  steps: "steps",
  "heart-rate": "heartRate",
  "resting-heart-rate": "restingHeartRate",
  "blood-oxygen": "oxygenSaturation",
  sleep: "sleep",
  "vo2-max": "vo2Max",
};

const SLUG_AGGREGATION: Partial<Record<HealthStatSlug, HealthTodayAggregation>> =
  {
    steps: "sum",
    sleep: "sum",
    "heart-rate": "avg",
    "resting-heart-rate": "avg",
    "blood-oxygen": "avg",
    "vo2-max": "avg",
  };

export function healthTodayRecordTypeForSlug(
  slug: HealthStatSlug,
): HealthTodayRecordType | null {
  return SLUG_TO_RECORD_TYPE[slug] ?? null;
}

export function healthTodayAggregationForSlug(
  slug: HealthStatSlug,
): HealthTodayAggregation {
  return SLUG_AGGREGATION[slug] ?? "avg";
}

/** Stats whose today chart uses HC hourly aggregates (deduped across sources). */
export function healthTodayUsesHourlyAggregates(slug: HealthStatSlug): boolean {
  return slug === "steps";
}

export function buildHourlySeriesFromTotals(
  hours: ReadonlyArray<{ hour: number; value: number }>,
): HourlyHealthChartPoint[] {
  return hours.map((row) => ({
    hour: row.hour,
    xLabel: formatHealthHourLabel(row.hour),
    value: Math.max(0, Math.round(row.value)),
  }));
}

function formatHealthHourLabel(hour: number): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
  });
}

function formatHealthTime(iso: string): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return iso;
  return new Date(parsed).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHealthTimeRange(startIso: string, endIso?: string): string {
  if (!endIso) return formatHealthTime(startIso);
  return `${formatHealthTime(startIso)}–${formatHealthTime(endIso)}`;
}

function localHour(iso: string): number | null {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).getHours();
}

function overlapMinutesInHour(
  startMs: number,
  endMs: number,
  hour: number,
  ref: Date,
): number {
  const bucketStart = new Date(
    ref.getFullYear(),
    ref.getMonth(),
    ref.getDate(),
    hour,
    0,
    0,
    0,
  ).getTime();
  const bucketEnd = bucketStart + 60 * 60 * 1000;
  const overlapStart = Math.max(startMs, bucketStart);
  const overlapEnd = Math.min(endMs, bucketEnd);
  if (overlapEnd <= overlapStart) return 0;
  return (overlapEnd - overlapStart) / 60_000;
}

export function buildHourlyHealthSeries(
  records: readonly HealthDayRecord[],
  options: {
    aggregation: HealthTodayAggregation;
    slug: HealthStatSlug;
    ref?: Date;
  },
): HourlyHealthChartPoint[] {
  const ref = options.ref ?? new Date();
  const maxHour = ref.getHours();
  const buckets = Array.from({ length: maxHour + 1 }, (_, hour) => ({
    hour,
    xLabel: formatHealthHourLabel(hour),
    value: 0,
    count: 0,
  }));

  if (options.slug === "sleep") {
    for (const record of records) {
      const startMs = Date.parse(record.startTime);
      const endMs = record.endTime
        ? Date.parse(record.endTime)
        : startMs;
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) continue;
      for (const bucket of buckets) {
        bucket.value += overlapMinutesInHour(
          startMs,
          endMs,
          bucket.hour,
          ref,
        );
      }
    }
    return buckets.map(({ hour, xLabel, value }) => ({
      hour,
      xLabel,
      value: Math.round(value),
    }));
  }

  for (const record of records) {
    const hour = localHour(record.startTime);
    if (hour == null || hour > maxHour) continue;
    const bucket = buckets[hour];
    if (!bucket) continue;
    if (options.aggregation === "sum") {
      bucket.value += record.value;
    } else {
      bucket.value += record.value;
      bucket.count += 1;
    }
  }

  return buckets.map(({ hour, xLabel, value, count }) => ({
    hour,
    xLabel,
    value:
      options.aggregation === "avg" && count > 0
        ? Math.round((value / count) * 10) / 10
        : Math.round(value),
  }));
}

function formatRecordValue(slug: HealthStatSlug, value: number): string {
  switch (slug) {
    case "steps":
      return `${Math.round(value).toLocaleString()} steps`;
    case "heart-rate":
    case "resting-heart-rate":
      return `${Math.round(value)} bpm`;
    case "blood-oxygen":
      return `${value.toFixed(1)}%`;
    case "sleep":
      return `${Math.round(value)} min asleep`;
    case "vo2-max":
      return `${value.toFixed(1)} ml/kg/min`;
    default:
      return String(value);
  }
}

export function buildHealthRecordLogEntries(
  records: readonly HealthDayRecord[],
  slug: HealthStatSlug,
): HealthRecordLogEntry[] {
  return [...records]
    .map((record, index) => {
      const sortKey = Date.parse(record.startTime);
      return {
        id: `${record.startTime}-${index}`,
        timeLabel: formatHealthTimeRange(record.startTime, record.endTime),
        detailLabel: formatRecordValue(slug, record.value),
        sourceName: record.sourceName?.trim() || undefined,
        sortKey: Number.isFinite(sortKey) ? sortKey : 0,
      };
    })
    .sort((a, b) => b.sortKey - a.sortKey);
}

export function hourlySeriesHasData(series: readonly HourlyHealthChartPoint[]): boolean {
  return series.some((point) => point.value > 0);
}
