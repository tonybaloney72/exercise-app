/** Sum positive sample values (for exercise windows with delta buckets). */
export function sumHealthSampleValues(
  samples: ReadonlyArray<{ value: number }>,
): number {
  return samples
    .map((sample) => sample.value)
    .filter((value) => Number.isFinite(value) && value > 0)
    .reduce((sum, value) => sum + value, 0);
}

/**
 * Roll up raw HC samples for a full calendar day.
 * Samsung/HC sometimes returns multiple records that each contain the daily total;
 * summing those inflates the chart. Prefer {@link queryNativeHealthAggregated} when available.
 */
export function aggregateDailyHealthSampleTotal(
  samples: ReadonlyArray<{ value: number; endDate?: string }>,
): number {
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
  return Math.round(values.reduce((sum, value) => sum + value, 0));
}

/**
 * Pick the best daily total when HC aggregate and raw samples disagree.
 * Aggregate often lags Samsung Health sync; samples can duplicate daily totals.
 */
export function resolveDailyHealthMetricTotal(
  aggregatedTotal: number,
  samples: ReadonlyArray<{ value: number; endDate?: string }>,
): number {
  const fromSamples = aggregateDailyHealthSampleTotal(samples);
  if (aggregatedTotal <= 0) return fromSamples;
  if (fromSamples <= 0) return aggregatedTotal;
  return Math.max(aggregatedTotal, fromSamples);
}
