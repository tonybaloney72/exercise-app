"use client";

import { Suspense, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EmptyState from "@/components/common/EmptyState";
import SurfaceCard from "@/components/common/SurfaceCard";
import WorkoutHistoryCalendar from "@/components/progress/WorkoutHistoryCalendar";
import { ProgressBackLink } from "@/components/progress/ProgressSubnavLink";
import {
  buildMonthCalendarModel,
  completedDateKeysFromHistory,
  monthKeyFromParts,
  parseMonthKey,
  shiftMonthKey,
} from "@/lib/workoutHistoryCalendar";
import { useEnsureHistoryLoaded } from "@/hooks/useEnsureHistoryLoaded";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { formatLocalDateKey } from "@/utils/localDateKey";

function WorkoutHistoryPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workoutHistory } = useWorkoutStore();

  useEnsureHistoryLoaded();
  const defaultMonthKey = monthKeyFromParts(
    new Date().getFullYear(),
    new Date().getMonth(),
  );

  const monthParam = searchParams.get("month");
  const todayKey = formatLocalDateKey();
  const monthKey = useMemo(() => {
    if (monthParam && parseMonthKey(monthParam)) return monthParam;
    return defaultMonthKey;
  }, [monthParam, defaultMonthKey]);

  const completedKeys = useMemo(
    () => completedDateKeysFromHistory(workoutHistory),
    [workoutHistory],
  );

  const totalCount = completedKeys.size;

  const model = useMemo(
    () => buildMonthCalendarModel(monthKey, completedKeys, todayKey),
    [monthKey, completedKeys, todayKey],
  );

  const navigateMonth = useCallback(
    (delta: number) => {
      const next = shiftMonthKey(monthKey, delta);
      if (!next) return;
      if (delta > 0 && next > defaultMonthKey) return;
      const q = new URLSearchParams({ month: next });
      router.push(`/progress/history?${q.toString()}`);
    },
    [monthKey, defaultMonthKey, router],
  );

  return (
    <div className="py-6 space-y-5">
      <div className="space-y-3">
        <ProgressBackLink />
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Workout history
          </h1>
          <p className="text-sm text-muted mt-1">
            {totalCount === 0
              ? "Completed workouts appear on the calendar below."
              : `${totalCount} completed workout${totalCount === 1 ? "" : "s"} - tap a day for details.`}
          </p>
        </div>
      </div>

      {totalCount === 0 ? (
        <SurfaceCard className="border-dashed bg-surface/50 py-8">
          <EmptyState
            icon="📅"
            title="No completed workouts yet."
            description="Finish a session on Today and it will show up here."
            action={{ label: "Go to Today", href: "/today" }}
          />
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="p-4">
        {model ? (
          <WorkoutHistoryCalendar
            model={model}
            onPrevMonth={() => navigateMonth(-1)}
            onNextMonth={() => navigateMonth(1)}
            canGoNext={monthKey < defaultMonthKey}
          />
        ) : (
          <p className="text-sm text-muted text-center py-6">Invalid month.</p>
        )}
      </SurfaceCard>
    </div>
  );
}

export default function WorkoutHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-muted">
          Loading history…
        </div>
      }
    >
      <WorkoutHistoryPageInner />
    </Suspense>
  );
}
