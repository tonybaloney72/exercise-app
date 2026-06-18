"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import FloatingTimer from "@/components/common/FloatingTimer";
import WorkoutDayReview from "@/components/workout/WorkoutDayReview";
import WorkoutSession from "@/components/workout/WorkoutSession";
import SurfaceCard from "@/components/common/SurfaceCard";
import { ProgressBackLink } from "@/components/progress/ProgressSubnavLink";
import { useEnsureHistoryLoaded } from "@/hooks/useEnsureHistoryLoaded";
import { useDayPlan } from "@/hooks/useDayPlan";
import {
  planFromWorkoutLog,
  sessionPlanForWorkoutEdit,
} from "@/lib/workoutEditSession";
import { formatCompletedBannerTitle } from "@/lib/workoutHistoryGroups";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { getBackfillEligibility } from "@/lib/backfillWorkout";
import { compareDateKeyToRef } from "@/lib/workoutHistoryCalendar";
import { formatLocalDateKey } from "@/utils/localDateKey";
import {
  findCompletedWorkoutForDate,
  findInProgressWorkoutForDate,
} from "@/utils/workoutLogLookup";
import {
  isDateKeyInCurrentCalendarWeek,
  parseLocalDateKey,
} from "@/utils/weekCalendar";

function formatPageTitle(dateKey: string): string {
  const d = parseLocalDateKey(dateKey);
  if (!d) return "Workout";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function WorkoutHistoryDayPage() {
  const params = useParams();
  const dateKey = typeof params.date === "string" ? params.date : "";
  const {
    workoutHistory,
    updateCompletedWorkoutNotes,
    activeWorkout,
    startEditingCompletedWorkout,
  } = useWorkoutStore();
  const { plan: prescribedPlan } = useDayPlan(dateKey);

  useEnsureHistoryLoaded();

  const log = useMemo(
    () => findCompletedWorkoutForDate(workoutHistory, dateKey),
    [workoutHistory, dateKey],
  );

  const reviewPlan = useMemo(
    () => (log ? planFromWorkoutLog(log) : null),
    [log],
  );
  const sessionPlan = useMemo(() => {
    if (!log) return null;
    if (prescribedPlan) return sessionPlanForWorkoutEdit(log, prescribedPlan);
    return reviewPlan;
  }, [log, prescribedPlan, reviewPlan]);

  const editingCompletedHere =
    activeWorkout?.endTime != null && activeWorkout.date === dateKey;

  const handleEditCompletedWorkout = () => {
    if (!log) return;
    startEditingCompletedWorkout(log.id);
  };

  const inCurrentWeek = isDateKeyInCurrentCalendarWeek(dateKey);
  const parsed = parseLocalDateKey(dateKey);
  const todayKey = formatLocalDateKey();
  const when = compareDateKeyToRef(dateKey, todayKey);
  const backfillEligibility = useMemo(
    () =>
      getBackfillEligibility({
        dateKey,
        workoutHistory,
        activeWorkout,
        todayKey,
      }),
    [dateKey, workoutHistory, activeWorkout, todayKey],
  );
  const inProgressLog = useMemo(
    () => findInProgressWorkoutForDate(workoutHistory, dateKey),
    [workoutHistory, dateKey],
  );

  if (!parsed) {
    return (
      <div className="flex flex-col py-8 gap-4 px-2 text-center">
        <p className="text-sm text-muted">Invalid date in URL.</p>
        <ProgressBackLink />
      </div>
    );
  }

  if (!log || !reviewPlan) {
    const logHref = `/progress/history/${dateKey}/log`;
    return (
      <div className="flex flex-col py-8 gap-4">
        <ProgressBackLink />
        <h1 className="text-2xl font-bold text-foreground">
          {formatPageTitle(dateKey)}
        </h1>
        <SurfaceCard className="flex flex-col px-4 py-6 text-center gap-3">
          <p className="text-sm text-foreground">
            No completed workout found for this day.
          </p>
          {when === "today" ? (
            <p className="text-sm text-muted">
              <Link
                href="/today"
                className="font-medium text-accent hover:underline"
              >
                Open Today
              </Link>{" "}
              to start or continue today&apos;s workout.
            </p>
          ) : when === "past" ? (
            <>
              {inProgressLog || activeWorkout?.date === dateKey ? (
                <Link
                  href={logHref}
                  className="inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent/90"
                >
                  Continue logging
                </Link>
              ) : backfillEligibility.ok ? (
                <Link
                  href={logHref}
                  className="inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent/90"
                >
                  Log workout for this day
                </Link>
              ) : (
                <p className="text-xs text-muted">
                  {backfillEligibility.reason}
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted">
              This day is in the future - no log yet.
            </p>
          )}
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col py-6 gap-5">
      <div className="flex flex-col gap-3">
        <ProgressBackLink />
        <h1 className="text-2xl font-bold text-foreground">
          {formatPageTitle(dateKey)}
        </h1>
      </div>

      {inCurrentWeek ? (
        <p className="text-xs text-muted px-1">
          To change this week&apos;s prescribed plan (not the saved log), open{" "}
          <Link
            href={`/weekly/day/${dateKey}`}
            className="font-medium text-accent hover:underline"
          >
            Weekly
          </Link>
          .
        </p>
      ) : null}

      {editingCompletedHere && sessionPlan && (
        <>
          <WorkoutSession plan={sessionPlan} hideSaveForLater />
          <FloatingTimer />
        </>
      )}

      {!editingCompletedHere && (
        <WorkoutDayReview
          plan={reviewPlan}
          log={log}
          completedBannerTitle={formatCompletedBannerTitle(dateKey)}
          onNotesChange={(notes) => updateCompletedWorkoutNotes(log.id, notes)}
          onEditWorkout={handleEditCompletedWorkout}
        />
      )}
    </div>
  );
}
