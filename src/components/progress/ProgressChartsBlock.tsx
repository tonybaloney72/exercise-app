"use client";

import type { WorkoutLog } from "@/types";
import type { DailyStepsChartPoint } from "@/lib/health/dailyStepsChart";
import type { DailyHealthMetricChartPoint } from "@/lib/health/dailyHealthChart";
import type { DailyHealthUnavailableReason } from "@/hooks/useDailyHealthFromHealth";
import WeightProgressChart from "@/components/progress/WeightProgressChart";
import ProgressChartsSection from "@/components/progress/ProgressChartsSection";
import ExerciseProgressChart from "@/components/progress/ExerciseProgressChart";
import CardioProgressSection from "@/components/progress/CardioProgressSection";
import DailyStepsProgressChart from "@/components/progress/DailyStepsProgressChart";
import DailyHealthMetricProgressChart from "@/components/progress/DailyHealthMetricProgressChart";

/** Recharts-heavy sections — loaded async from the Progress tab page. */
export default function ProgressChartsBlock({
  history,
  stepsChartSeries,
  activeKcalChartSeries,
  avgHeartRateChartSeries,
  dailyHealthLoading,
  dailyHealthUnavailableReason,
}: {
  history: WorkoutLog[];
  stepsChartSeries: DailyStepsChartPoint[];
  activeKcalChartSeries: DailyHealthMetricChartPoint[];
  avgHeartRateChartSeries: DailyHealthMetricChartPoint[];
  dailyHealthLoading?: boolean;
  dailyHealthUnavailableReason?: DailyHealthUnavailableReason | null;
}) {
  const loading = dailyHealthLoading ?? false;

  return (
    <>
      <WeightProgressChart />
      <DailyStepsProgressChart
        series={stepsChartSeries}
        loading={loading}
        unavailableReason={dailyHealthUnavailableReason}
      />
      <DailyHealthMetricProgressChart
        title="Active calories"
        subtitle="Total active energy per calendar day from Health Connect — workouts, cardio, and daily activity."
        series={activeKcalChartSeries}
        yLabel="kcal"
        emptyDetail="No active calorie data for the last two weeks yet."
        formatValue={(v) => `${Math.round(v)} kcal`}
        loading={loading}
        unavailableReason={dailyHealthUnavailableReason}
        chartType="bar"
      />
      <DailyHealthMetricProgressChart
        title="Average heart rate"
        subtitle="Daily average heart rate from Health Connect samples."
        series={avgHeartRateChartSeries}
        yLabel="bpm"
        emptyDetail="No heart rate data for the last two weeks yet."
        formatValue={(v) => `${Math.round(v)} bpm`}
        loading={loading}
        unavailableReason={dailyHealthUnavailableReason}
        chartType="line"
        allowDecimals
      />
      <ProgressChartsSection history={history} />
      <ExerciseProgressChart history={history} />
      <CardioProgressSection history={history} />
    </>
  );
}
