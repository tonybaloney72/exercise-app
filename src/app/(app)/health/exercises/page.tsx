"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import BackNavLink from "@/components/common/BackNavLink";
import ProgressChartsSkeleton from "@/components/progress/ProgressChartsSkeleton";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useHistoryReady } from "@/hooks/useHistoryReady";
import { routes } from "@/lib/appRoutes";
import {
  CARDIO_ACTIVITY_EMOJI,
  CARDIO_ACTIVITY_LABELS,
  CARDIO_ACTIVITY_ORDER,
  CARDIO_KIND_TO_EXERCISE_ID,
} from "@/lib/cardioActivities";
import { buildCardioMilesTotals } from "@/lib/resolveWorkoutCardio";
import { totalMilesCardioStatLabel } from "@/lib/cardioStatLabels";
import {
  filterCompletedWorkouts,
  workoutsForCardioProgressCharts,
} from "@/utils/workoutLogLookup";
import { surfaceCardClassName } from "@/components/common/SurfaceCard";

const ProgressChartsSection = dynamic(
  () => import("@/components/progress/ProgressChartsSection"),
  { ssr: false, loading: () => <ProgressChartsSkeleton /> },
);
const ExerciseProgressChart = dynamic(
  () => import("@/components/progress/ExerciseProgressChart"),
  { ssr: false, loading: () => <ProgressChartsSkeleton /> },
);

export default function HealthExercisesPage() {
  const historyReady = useHistoryReady();
  const { workoutHistory, activeWorkout } = useWorkoutStore();

  const completedHistory = useMemo(
    () => filterCompletedWorkouts(workoutHistory),
    [workoutHistory],
  );

  const chartHistory = useMemo(
    () => workoutsForCardioProgressCharts(workoutHistory, activeWorkout),
    [workoutHistory, activeWorkout],
  );

  const cardioMiles = useMemo(
    () => buildCardioMilesTotals(completedHistory),
    [completedHistory],
  );

  const cardioLinks = useMemo(
    () =>
      CARDIO_ACTIVITY_ORDER.flatMap((kind) => {
        const id = CARDIO_KIND_TO_EXERCISE_ID[kind];
        const bucket = cardioMiles[id];
        if (!bucket || bucket.totalMiles <= 0) return [];
        return [
          {
            kind,
            name: CARDIO_ACTIVITY_LABELS[kind],
            label: totalMilesCardioStatLabel(kind),
            miles: bucket.totalMiles.toFixed(1),
            emoji: CARDIO_ACTIVITY_EMOJI[kind],
            href: routes.healthExerciseKind(kind),
          },
        ];
      }),
    [cardioMiles],
  );

  if (!historyReady) {
    return <ProgressChartsSkeleton />;
  }

  return (
    <div className="flex flex-col gap-2 py-6">
      <BackNavLink fallbackHref={routes.health} />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Exercises</h1>
        <p className="text-sm text-muted mt-1">
          Training focus and progress over time
        </p>
      </div>

      {cardioLinks.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">Cardio</h2>
          <div className="grid grid-cols-2 gap-2">
            {cardioLinks.map((row) => (
              <Link
                key={row.kind}
                href={row.href}
                className={`${surfaceCardClassName} block p-3 transition-colors hover:border-accent/40 hover:bg-surface-hover`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-lg" aria-hidden>
                    {row.emoji}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {row.name}
                  </span>
                </div>
                <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                  {row.miles} mi
                </p>
                <p className="text-xs text-muted">{row.label}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <ProgressChartsSection history={chartHistory} />
      <ExerciseProgressChart history={chartHistory} />
    </div>
  );
}
