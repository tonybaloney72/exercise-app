/** Sum positive sample values (for exercise windows with delta buckets). */
export function sumHealthSampleValues(
  samples: ReadonlyArray<{ value: number }>,
): number {
  return samples
    .map((sample) => sample.value)
    .filter((value) => Number.isFinite(value) && value > 0)
    .reduce((sum, value) => sum + value, 0);
}

export type DailyHealthSampleLike = {
  value: number;
  endDate?: string;
  sourceName?: string;
};

function peakSampleValue(
  samples: ReadonlyArray<DailyHealthSampleLike>,
): number {
  const values = samples
    .map((sample) => sample.value)
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length === 0 ? 0 : Math.max(...values);
}

/**
 * When multiple HC data sources each report a full-day total (Samsung Health + device),
 * take the max per source then the max across sources — matching HC's deduped UI total.
 */
function dedupeMultiSourceDailyTotals(
  samples: ReadonlyArray<DailyHealthSampleLike>,
): number | null {
  const bySource = new Map<string, number>();
  for (const sample of samples) {
    if (!Number.isFinite(sample.value) || sample.value <= 0) continue;
    const key = sample.sourceName?.trim() || "unknown";
    bySource.set(key, Math.max(bySource.get(key) ?? 0, sample.value));
  }
  if (bySource.size < 2) return null;

  const perSource = [...bySource.values()];
  const maxVal = Math.max(...perSource);
  const minVal = Math.min(...perSource);
  if (minVal / maxVal >= 0.85) {
    return Math.round(maxVal);
  }
  return null;
}

/**
 * Roll up raw HC samples for a full calendar day.
 * Samsung/HC sometimes returns multiple records that each contain the daily total;
 * summing those inflates the chart. Prefer {@link queryNativeHealthAggregated} when available.
 */
export function aggregateDailyHealthSampleTotal(
  samples: ReadonlyArray<DailyHealthSampleLike>,
): number {
  const multiSource = dedupeMultiSourceDailyTotals(samples);
  if (multiSource != null) return multiSource;

  const values = samples
    .map((sample) => sample.value)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (values.length === 0) return 0;
  if (values.length === 1) return Math.round(values[0]!);

  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);

  // Multiple near-identical totals → duplicate daily snapshots (e.g. repeated SH sync).
  if (minVal / maxVal >= 0.85) {
    return Math.round(maxVal);
  }

  const sortedByEnd = [...samples]
    .filter((sample) => Number.isFinite(sample.value) && sample.value > 0)
    .sort((a, b) => {
      const aEnd = a.endDate ? Date.parse(a.endDate) : 0;
      const bEnd = b.endDate ? Date.parse(b.endDate) : 0;
      return aEnd - bEnd;
    });
  const latest = sortedByEnd[sortedByEnd.length - 1]?.value ?? maxVal;
  const sum = values.reduce((total, value) => total + value, 0);

  // Latest cumulative snapshot dominates overlapping totals.
  if (latest >= sum * 0.8) {
    return Math.round(latest);
  }

  return Math.round(sum);
}

export function aggregatedBucketTotal(
  buckets: ReadonlyArray<{ value: number }>,
): number {
  const values = buckets
    .map((bucket) => bucket.value)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (values.length === 0) return 0;
  if (values.length === 1) return Math.round(values[0]!);

  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  // Multiple day buckets with similar totals → duplicate source rollups, not additive.
  if (minVal / maxVal >= 0.85) {
    return Math.round(maxVal);
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0));
}

/**
 * Pick the best daily total when HC aggregate and raw samples disagree.
 * Prefer HC aggregate when present — it dedupes multi-source totals (Samsung + device).
 * Override only when aggregate is clearly stale vs sample peak.
 */
export function resolveDailyHealthMetricTotal(
  aggregatedTotal: number,
  samples: ReadonlyArray<DailyHealthSampleLike>,
): number {
  const fromSamples = aggregateDailyHealthSampleTotal(samples);
  const peak = peakSampleValue(samples);

  if (aggregatedTotal <= 0) return fromSamples;

  if (peak > 0 && aggregatedTotal < peak * 0.85) {
    return Math.max(fromSamples, Math.round(peak));
  }

  return aggregatedTotal;
}
