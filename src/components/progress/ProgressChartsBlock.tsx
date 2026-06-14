"use client";

import type { WorkoutLog } from "@/types";
import WeightProgressChart from "@/components/progress/WeightProgressChart";
import ProgressChartsSection from "@/components/progress/ProgressChartsSection";
import ExerciseProgressChart from "@/components/progress/ExerciseProgressChart";
import CardioProgressSection from "@/components/progress/CardioProgressSection";

/** Recharts-heavy sections — loaded async from the Progress tab page. */
export default function ProgressChartsBlock({
  history,
}: {
  history: WorkoutLog[];
}) {
  return (
    <>
      <WeightProgressChart />
      <ProgressChartsSection history={history} />
      <ExerciseProgressChart history={history} />
      <CardioProgressSection history={history} />
    </>
  );
}
