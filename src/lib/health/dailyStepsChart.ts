import {
  buildChartDayAxis,
  sortByChartSortKey,
} from "@/utils/localDateKey";

export interface DailyStepsChartPoint {
  date: string;
  xLabel: string;
  sortKey: number;
  stepCount: number;
}

export function buildDailyStepsChartSeries(
  stepsByDate: Record<string, number>,
): DailyStepsChartPoint[] {
  return sortByChartSortKey(
    Object.entries(stepsByDate).map(([date, stepCount]) => ({
      date,
      ...buildChartDayAxis(date),
      stepCount,
    })),
  );
}
