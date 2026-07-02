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

function groupSamplesBySource(
  samples: ReadonlyArray<DailyHealthSampleLike>,
): Map<string, DailyHealthSampleLike[]> {
  const bySource = new Map<string, DailyHealthSampleLike[]>();
  for (const sample of samples) {
    if (!Number.isFinite(sample.value) || sample.value <= 0) continue;
    const key = sample.sourceName?.trim() || "unknown";
    const list = bySource.get(key) ?? [];
    list.push(sample);
    bySource.set(key, list);
  }
  return bySource;
}

/** Roll up one HC source's samples for a calendar day (intervals or duplicate snapshots). */
function aggregateSingleSourceDailySampleTotal(
  samples: ReadonlyArray<DailyHealthSampleLike>,
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

function dedupePerSourceDailyTotals(perSourceTotals: number[]): number {
  if (perSourceTotals.length === 0) return 0;
  if (perSourceTotals.length === 1) return perSourceTotals[0]!;

  const maxVal = Math.max(...perSourceTotals);
  const minVal = Math.min(...perSourceTotals);
  // Samsung Health + phone pedometer track the same steps — match HC UI dedupe.
  if (minVal / maxVal >= 0.85) {
    return Math.round(maxVal);
  }

  return Math.round(maxVal);
}

export function perSourceDailySampleTotals(
  samples: ReadonlyArray<DailyHealthSampleLike>,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const [source, sourceSamples] of groupSamplesBySource(samples)) {
    totals[source] = aggregateSingleSourceDailySampleTotal(sourceSamples);
  }
  return totals;
}

/**
 * Roll up raw HC samples for a full calendar day.
 * Sum interval buckets per source, then dedupe across sources (not additive).
 */
export function aggregateDailyHealthSampleTotal(
  samples: ReadonlyArray<DailyHealthSampleLike>,
): number {
  const bySource = groupSamplesBySource(samples);
  if (bySource.size === 0) return 0;

  const perSourceTotals = [...bySource.values()].map(
    aggregateSingleSourceDailySampleTotal,
  );
  return dedupePerSourceDailyTotals(perSourceTotals);
}

/**
 * Roll up HC samples for an activity time window (cardio session import).
 * Uses per-source dedupe — not a naive sum across overlapping writers.
 */
export function rollupHealthSamplesForWindow(
  samples: ReadonlyArray<DailyHealthSampleLike>,
): number {
  return aggregateDailyHealthSampleTotal(samples);
}

export function aggregatedBucketTotal(
  buckets: ReadonlyArray<{ value: number }>,
): number {
  const values = buckets
    .map((bucket) => bucket.value)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (values.length === 0) return 0;
  // HC day buckets are per-source totals for the same day — never sum them.
  return Math.round(Math.max(...values));
}

/**
 * Pick the best daily total when HC aggregate and raw samples disagree.
 * Sample rollup is per-source then deduped. Prefer samples when aggregate
 * is stale/partial or sums duplicate sources (~2× HC UI).
 */
function aggregateLooksPartial(
  aggregatedTotal: number,
  fromSamples: number,
): boolean {
  if (fromSamples <= 0) return false;
  // HC day aggregate still syncing — well under deduped sample rollup.
  return aggregatedTotal < fromSamples * 0.45;
}

export function resolveDailyHealthMetricTotal(
  aggregatedTotal: number,
  samples: ReadonlyArray<DailyHealthSampleLike>,
): number {
  const fromSamples = aggregateDailyHealthSampleTotal(samples);
  const peak = peakSampleValue(samples);

  if (aggregatedTotal <= 0) return fromSamples;
  if (fromSamples <= 0) return aggregatedTotal;

  const ratio = aggregatedTotal / fromSamples;
  if (ratio > 1.15) {
    // Aggregate summed or duplicated sources — trust deduped sample rollup.
    return fromSamples;
  }
  if (ratio < 1 / 1.15) {
    if (aggregateLooksPartial(aggregatedTotal, fromSamples)) {
      return Math.max(fromSamples, Math.round(peak));
    }
    // Sample rollup over-counted overlapping writers — trust HC day aggregate.
    return aggregatedTotal;
  }

  if (peak > 0 && aggregatedTotal < peak * 0.85) {
    return Math.max(fromSamples, Math.round(peak));
  }

  return aggregatedTotal;
}
