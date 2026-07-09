import type { HealthDayRecord } from "@/lib/health/healthConnectTypes";
import type { HealthStatSlug } from "@/lib/health/healthStatRoutes";

/** Matches Android `SleepAggregation.DUPLICATE_OVERLAP_FRACTION`. */
const DUPLICATE_OVERLAP_FRACTION = 0.75;

type IntervalRecord = HealthDayRecord & {
  startMs: number;
  endMs: number;
  durationMs: number;
};

function toIntervalRecord(record: HealthDayRecord): IntervalRecord | null {
  const startMs = Date.parse(record.startTime);
  const endMs = record.endTime ? Date.parse(record.endTime) : startMs;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  const safeEndMs = Math.max(endMs, startMs);
  return {
    ...record,
    startMs,
    endMs: safeEndMs,
    durationMs: safeEndMs - startMs,
  };
}

function overlapFraction(a: IntervalRecord, b: IntervalRecord): number {
  const overlapStart = Math.max(a.startMs, b.startMs);
  const overlapEnd = Math.min(a.endMs, b.endMs);
  if (overlapEnd <= overlapStart) return 0;
  const overlapMs = overlapEnd - overlapStart;
  const shorter = Math.min(a.durationMs, b.durationMs);
  if (shorter <= 0) return 0;
  return overlapMs / shorter;
}

function compareCandidates(
  a: IntervalRecord,
  b: IntervalRecord,
  slug: HealthStatSlug,
): number {
  if (slug === "steps") {
    const valueDiff = b.value - a.value;
    if (valueDiff !== 0) return valueDiff;
  }
  return b.durationMs - a.durationMs;
}

function stripIntervalFields(record: IntervalRecord): HealthDayRecord {
  const { startMs: _startMs, endMs: _endMs, durationMs: _durationMs, ...rest } =
    record;
  return rest;
}

/**
 * Drops overlapping Health Connect snapshots so Today logs (and sleep charts)
 * do not double-count the same walk or sleep session.
 */
export function dedupeOverlappingHealthDayRecords(
  records: readonly HealthDayRecord[],
  slug: HealthStatSlug,
): HealthDayRecord[] {
  if (slug !== "sleep" && slug !== "steps") return [...records];
  if (records.length <= 1) return [...records];

  const intervals = records
    .map(toIntervalRecord)
    .filter((row): row is IntervalRecord => row != null);
  if (intervals.length <= 1) {
    return intervals.map(stripIntervalFields);
  }

  const sorted = [...intervals].sort((a, b) => compareCandidates(a, b, slug));
  const kept: IntervalRecord[] = [];

  for (const candidate of sorted) {
    const duplicate = kept.some(
      (existing) =>
        overlapFraction(candidate, existing) >= DUPLICATE_OVERLAP_FRACTION,
    );
    if (!duplicate) kept.push(candidate);
  }

  return kept
    .sort((a, b) => b.startMs - a.startMs)
    .map(stripIntervalFields);
}
