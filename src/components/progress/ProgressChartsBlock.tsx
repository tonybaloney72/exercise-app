"use client";

import type { WorkoutLog } from "@/types";
import type { DailyStepsChartPoint } from "@/lib/health/dailyStepsChart";
import WeightProgressChart from "@/components/progress/WeightProgressChart";
import ProgressChartsSection from "@/components/progress/ProgressChartsSection";
import ExerciseProgressChart from "@/components/progress/ExerciseProgressChart";
import CardioProgressSection from "@/components/progress/CardioProgressSection";
import CardioHealthProgressSection from "@/components/progress/CardioHealthProgressSection";
import type { DailyHealthUnavailableReason } from "@/hooks/useDailyHealthFromHealth";
import DailyStepsProgressChart from "@/components/progress/DailyStepsProgressChart";

/** Recharts-heavy sections — loaded async from the Progress tab page. */
export default function ProgressChartsBlock({
  history,
  dailyStepsSeries,
  dailyStepsLoading,
  dailyStepsUnavailableReason,
}: {
  history: WorkoutLog[];
  dailyStepsSeries: DailyStepsChartPoint[];
  dailyStepsLoading?: boolean;
  dailyStepsUnavailableReason?: DailyHealthUnavailableReason | null;
}) {
  return (
    <>
      <WeightProgressChart />
      <DailyStepsProgressChart
        series={dailyStepsSeries}
        loading={dailyStepsLoading}
        unavailableReason={dailyStepsUnavailableReason}
      />
      <ProgressChartsSection history={history} />
      <ExerciseProgressChart history={history} />
      <CardioProgressSection history={history} />
      <CardioHealthProgressSection history={history} />
    </>
  );
}
