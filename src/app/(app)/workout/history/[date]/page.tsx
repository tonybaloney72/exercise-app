"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import FloatingTimer from "@/components/common/FloatingTimer";
import WorkoutDayReview from "@/components/workout/WorkoutDayReview";
import WorkoutSession from "@/components/workout/WorkoutSession";
import WorkoutPlanPreview from "@/components/workout/WorkoutPlanPreview";
import SurfaceCard from "@/components/common/SurfaceCard";
import BackNavLink from "@/components/common/BackNavLink";
import { routes } from "@/lib/appRoutes";
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
import { formatLocalDateKey, parseLocalDateKey } from "@/utils/localDateKey";
import {
  findCompletedWorkoutForDate,
  findInProgressWorkoutForDate,
} from "@/utils/workoutLogLookup";
import { isDateKeyInCurrentCalendarWeek } from "@/utils/weekCalendar";

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
  const router = useRouter();
  const dateKey = typeof params.date === "string" ? params.date : "";
  const {
    workoutHistory,
    updateCompletedWorkoutNotes,
    activeWorkout,
    startEditingCompletedWorkout,
    startWorkoutForDate,
    continueInProgressWorkout,
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
        <BackNavLink />
      </div>
    );
  }

  if (!log || !reviewPlan) {
    return (
      <div className="flex flex-col py-8 gap-4">
        <BackNavLink />
        <h1 className="text-2xl font-bold text-foreground">
          {formatPageTitle(dateKey)}
        </h1>
        {when === "today" ? (
          <SurfaceCard className="flex flex-col px-4 py-6 text-center gap-3">
            <p className="text-sm text-foreground">
              No completed workout found for this day.
            </p>
            <p className="text-sm text-muted">
              <Link
                href={routes.workout}
                className="font-medium text-accent hover:underline"
              >
                Open Today
              </Link>{" "}
              to start or continue today&apos;s workout.
            </p>
          </SurfaceCard>
        ) : when === "past" ? (
          <div className="flex flex-col gap-4">
            {inProgressLog || activeWorkout?.date === dateKey ? (
              <button
                type="button"
                onClick={() => {
                  if (!prescribedPlan) {
                    router.push(routes.workoutHistoryLog(dateKey));
                    return;
                  }
                  const ok = continueInProgressWorkout(prescribedPlan, dateKey);
                  if (ok) router.push(routes.workoutHistoryLog(dateKey));
                }}
                className="w-full rounded-xl bg-accent py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90"
              >
                Continue logging
              </button>
            ) : backfillEligibility.ok ? (
              <button
                type="button"
                onClick={() => {
                  if (!prescribedPlan) {
                    router.push(routes.workoutHistoryLog(dateKey));
                    return;
                  }
                  const ok = startWorkoutForDate(prescribedPlan, dateKey);
                  if (ok) router.push(routes.workoutHistoryLog(dateKey));
                }}
                className="w-full rounded-xl bg-accent py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90"
              >
                Start workout
              </button>
            ) : (
              <SurfaceCard className="px-4 py-3 text-center">
                <p className="text-xs text-muted">{backfillEligibility.reason}</p>
              </SurfaceCard>
            )}
            {prescribedPlan ? (
              <>
                <Link
                  href={routes.workoutWeekDay(dateKey)}
                  className="flex w-full items-center justify-center rounded-xl border border-accent/40 bg-accent/10 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
                >
                  Edit Day
                </Link>
                <WorkoutPlanPreview
                  plan={prescribedPlan}
                  showTargetMuscleList={false}
                />
              </>
            ) : (
              <p className="text-sm text-muted text-center">
                Loading this day&apos;s plan…
              </p>
            )}
          </div>
        ) : (
          <SurfaceCard className="flex flex-col px-4 py-6 text-center gap-3">
            <p className="text-xs text-muted">
              This day is in the future - no log yet.
            </p>
          </SurfaceCard>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col py-6 gap-5">
      <div className="flex flex-col gap-3">
        <BackNavLink />
        <h1 className="text-2xl font-bold text-foreground">
          {formatPageTitle(dateKey)}
        </h1>
      </div>

      {inCurrentWeek ? (
        <p className="text-xs text-muted px-1">
          To change this week&apos;s prescribed plan (not the saved log), open{" "}
          <Link
            href={routes.workoutWeekDay(dateKey)}
            className="font-medium text-accent hover:underline"
          >
            Edit Day
          </Link>
          .
        </p>
      ) : when === "past" ? (
        <p className="text-xs text-muted px-1">
          To change the prescribed plan for this day, open{" "}
          <Link
            href={routes.workoutWeekDay(dateKey)}
            className="font-medium text-accent hover:underline"
          >
            Edit Day
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
