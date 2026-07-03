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
  restingHeartRateChartSeries,
  oxygenSaturationChartSeries,
  sleepTotalChartSeries,
  vo2MaxChartSeries,
  dailyHealthLoading,
  dailyHealthUnavailableReason,
}: {
  history: WorkoutLog[];
  stepsChartSeries: DailyStepsChartPoint[];
  activeKcalChartSeries: DailyHealthMetricChartPoint[];
  avgHeartRateChartSeries: DailyHealthMetricChartPoint[];
  restingHeartRateChartSeries: DailyHealthMetricChartPoint[];
  oxygenSaturationChartSeries: DailyHealthMetricChartPoint[];
  sleepTotalChartSeries: DailyHealthMetricChartPoint[];
  vo2MaxChartSeries: DailyHealthMetricChartPoint[];
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
      <DailyHealthMetricProgressChart
        title="Resting heart rate"
        subtitle="Daily resting heart rate from Health Connect."
        series={restingHeartRateChartSeries}
        yLabel="bpm"
        emptyDetail="No resting heart rate data for the last two weeks yet."
        formatValue={(v) => `${Math.round(v)} bpm`}
        loading={loading}
        unavailableReason={dailyHealthUnavailableReason}
        chartType="line"
        allowDecimals
      />
      <DailyHealthMetricProgressChart
        title="Blood oxygen (SpO₂)"
        subtitle="Daily average oxygen saturation from Health Connect."
        series={oxygenSaturationChartSeries}
        yLabel="%"
        emptyDetail="No SpO₂ data for the last two weeks yet."
        formatValue={(v) => `${v.toFixed(1)}%`}
        loading={loading}
        unavailableReason={dailyHealthUnavailableReason}
        chartType="line"
        allowDecimals
      />
      <DailyHealthMetricProgressChart
        title="Sleep"
        subtitle="Total sleep per night (wake date) from Health Connect."
        series={sleepTotalChartSeries}
        yLabel="min"
        emptyDetail="No sleep data for the last two weeks yet."
        formatValue={(v) => `${Math.round(v)} min`}
        loading={loading}
        unavailableReason={dailyHealthUnavailableReason}
        chartType="bar"
      />
      <DailyHealthMetricProgressChart
        title="VO₂ max"
        subtitle="Latest reading per day when your watch or phone reports VO₂ max."
        series={vo2MaxChartSeries}
        yLabel="ml/kg/min"
        emptyDetail="No VO₂ max readings in the last three months yet."
        formatValue={(v) => `${v.toFixed(1)}`}
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
