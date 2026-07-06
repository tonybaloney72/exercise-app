"use client";

import { notFound, useParams } from "next/navigation";
import { useMemo, useState } from "react";
import BackNavLink from "@/components/common/BackNavLink";
import HealthRangeSwitcher from "@/components/health/HealthRangeSwitcher";
import ProgressChartsSkeleton from "@/components/progress/ProgressChartsSkeleton";
import CardioProgressChart from "@/components/progress/JogProgressChart";
import CardioSessionHistory from "@/components/health/CardioSessionHistory";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useHistoryReady } from "@/hooks/useHistoryReady";
import { routes } from "@/lib/appRoutes";
import {
  CARDIO_ACTIVITY_EMOJI,
  CARDIO_ACTIVITY_LABELS,
  CARDIO_KIND_TO_EXERCISE_ID,
} from "@/lib/cardioActivities";
import type { CardioActivityKind } from "@/types";
import { workoutsForCardioProgressCharts } from "@/utils/workoutLogLookup";
import {
  filterEntriesByHealthRange,
  type HealthRangePresetId,
} from "@/lib/health/healthRangePresets";

const CARDIO_KINDS = Object.keys(
  CARDIO_KIND_TO_EXERCISE_ID,
) as CardioActivityKind[];

function isCardioKind(value: string): value is CardioActivityKind {
  return (CARDIO_KINDS as readonly string[]).includes(value);
}

export default function HealthExerciseKindPage() {
  const params = useParams();
  const kind = typeof params.kind === "string" ? params.kind : "";
  if (!isCardioKind(kind)) {
    notFound();
  }

  const historyReady = useHistoryReady();
  const { workoutHistory, activeWorkout } = useWorkoutStore();
  const exerciseId = CARDIO_KIND_TO_EXERCISE_ID[kind];
  const [range, setRange] = useState<HealthRangePresetId>("week");

  const chartHistory = useMemo(
    () => workoutsForCardioProgressCharts(workoutHistory, activeWorkout),
    [workoutHistory, activeWorkout],
  );

  const filteredHistory = useMemo(
    () => filterEntriesByHealthRange(chartHistory, range),
    [chartHistory, range],
  );

  if (!historyReady) {
    return <ProgressChartsSkeleton />;
  }

  const title = `${CARDIO_ACTIVITY_EMOJI[kind]} ${CARDIO_ACTIVITY_LABELS[kind] ?? kind}`;

  return (
    <div className="flex flex-col gap-5 py-6">
      <BackNavLink fallbackHref={routes.healthExercises} />
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted mt-1">Distance and pace over time</p>
        </div>
        <HealthRangeSwitcher value={range} onChange={setRange} />
      </div>
      <CardioProgressChart
        history={filteredHistory}
        exerciseId={exerciseId}
        hideHeader
      />
      <CardioSessionHistory
        history={filteredHistory}
        exerciseId={exerciseId}
      />
    </div>
  );
}
