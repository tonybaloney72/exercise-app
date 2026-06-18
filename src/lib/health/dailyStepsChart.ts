export interface DailyStepsChartPoint {
  date: string;
  xLabel: string;
  sortKey: number;
  stepCount: number;
}

function parseDateKeyMs(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0).getTime();
}

function shortLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${m ?? 1}/${d ?? 1}`;
}

export function buildDailyStepsChartSeries(
  stepsByDate: Record<string, number>,
): DailyStepsChartPoint[] {
  return Object.entries(stepsByDate)
    .map(([date, stepCount]) => ({
      date,
      xLabel: shortLabel(date),
      sortKey: parseDateKeyMs(date),
      stepCount,
    }))
    .sort((a, b) => a.sortKey - b.sortKey);
}
