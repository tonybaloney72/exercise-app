/**
 * Calendar date in the user's local timezone as `YYYY-MM-DD`.
 * Prefer this over `date.toISOString().split("T")[0]`, which uses UTC and can
 * shift the day for evening / morning workouts.
 */
export function formatLocalDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse `YYYY-MM-DD` as a local calendar date. Invalid values return null. */
export function parseLocalDateKey(dateKey: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

function localDateAtNoon(key: string): Date | null {
  const parsed = parseLocalDateKey(key);
  if (!parsed) return null;
  return new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    12,
    0,
    0,
    0,
  );
}

/** Stable sort key for chart series; uses local noon to avoid DST edge cases. */
export function parseLocalDateKeyMs(key: string): number {
  return localDateAtNoon(key)?.getTime() ?? 0;
}

/** Compact axis label such as `6/20` for chart x-axis ticks. */
export function formatLocalDateKeyChartLabel(dateKey: string): string {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) return dateKey;
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

export type ChartAxisPoint = {
  xLabel: string;
  sortKey: number;
  sessionIndex?: number;
};

export function buildChartDayAxis(dateKey: string): ChartAxisPoint {
  return {
    xLabel: formatLocalDateKeyChartLabel(dateKey),
    sortKey: parseLocalDateKeyMs(dateKey),
  };
}

const CHART_SESSION_SORT_OFFSET = 0.0001;

/** Axis labels/sort keys when multiple sessions share a workout date. */
export function buildChartSessionAxis(
  dateKey: string,
  sessionIndexOneBased: number,
): ChartAxisPoint {
  const baseLabel = formatLocalDateKeyChartLabel(dateKey);
  return {
    xLabel:
      sessionIndexOneBased > 1
        ? `${baseLabel} · #${sessionIndexOneBased}`
        : baseLabel,
    sortKey:
      parseLocalDateKeyMs(dateKey) +
      (sessionIndexOneBased - 1) * CHART_SESSION_SORT_OFFSET,
    sessionIndex:
      sessionIndexOneBased > 1 ? sessionIndexOneBased : undefined,
  };
}

export function sortByChartSortKey<T extends { sortKey: number }>(rows: T[]): T[] {
  rows.sort((a, b) => a.sortKey - b.sortKey);
  return rows;
}
