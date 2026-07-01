import {
  buildChartDayAxis,
  sortByChartSortKey,
} from "@/utils/localDateKey";

export interface DailyHealthMetricChartPoint {
  date: string;
  xLabel: string;
  sortKey: number;
  value: number;
}

export function buildDailyHealthMetricChartSeries(
  valuesByDate: Record<string, number>,
): DailyHealthMetricChartPoint[] {
  return sortByChartSortKey(
    Object.entries(valuesByDate).map(([date, value]) => ({
      date,
      ...buildChartDayAxis(date),
      value,
    })),
  );
}
