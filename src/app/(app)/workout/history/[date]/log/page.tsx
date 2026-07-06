"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import FloatingTimer from "@/components/common/FloatingTimer";
import SurfaceCard from "@/components/common/SurfaceCard";
import BackNavLink from "@/components/common/BackNavLink";
import { routes } from "@/lib/appRoutes";
import WorkoutSession from "@/components/workout/WorkoutSession";
import {
  canResumeInProgressForDate,
  getBackfillEligibility,
} from "@/lib/backfillWorkout";
import { useEnsureHistoryLoaded } from "@/hooks/useEnsureHistoryLoaded";
import { useDayPlan } from "@/hooks/useDayPlan";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { formatLocalDateKey } from "@/utils/localDateKey";
import {
  findInProgressWorkoutForDate,
  findCompletedWorkoutForDate,
} from "@/utils/workoutLogLookup";
import { parseLocalDateKey } from "@/utils/localDateKey";

function formatPageTitle(dateKey: string): string {
  const d = parseLocalDateKey(dateKey);
  if (!d) return "Workout";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function WorkoutHistoryBackfillLogPage() {
  const params = useParams();
  const router = useRouter();
  const dateKey = typeof params.date === "string" ? params.date : "";
  const mode = useAuthStore((s) => s.mode);
  const {
    activeWorkout,
    workoutHistory,
    startWorkoutForDate,
    continueInProgressWorkout,
  } = useWorkoutStore();
  const { plan, loading: planLoading, error: planError } = useDayPlan(dateKey);
  const [startError, setStartError] = useState<string | null>(null);

  useEnsureHistoryLoaded();

  const todayKey = formatLocalDateKey();
  const eligibility = useMemo(
    () =>
      getBackfillEligibility({
        dateKey,
        workoutHistory,
        activeWorkout,
        todayKey,
      }),
    [dateKey, workoutHistory, activeWorkout, todayKey],
  );

  const resumeEligibility = useMemo(
    () =>
      canResumeInProgressForDate({
        dateKey,
        workoutHistory,
        activeWorkout,
      }),
    [dateKey, workoutHistory, activeWorkout],
  );

  const canAccessLogPage = eligibility.ok || resumeEligibility.ok;

  const completedLog = useMemo(
    () => findCompletedWorkoutForDate(workoutHistory, dateKey),
    [workoutHistory, dateKey],
  );

  const inProgressLog = useMemo(
    () => findInProgressWorkoutForDate(workoutHistory, dateKey),
    [workoutHistory, dateKey],
  );

  const sessionForThisDay =
    activeWorkout?.date === dateKey && !activeWorkout.endTime;

  const handleBegin = useCallback(() => {
    if (!plan) return;
    setStartError(null);
    const ok = inProgressLog
      ? continueInProgressWorkout(plan, dateKey)
      : startWorkoutForDate(plan, dateKey);
    if (!ok) {
      const again = inProgressLog
        ? canResumeInProgressForDate({
            dateKey,
            workoutHistory: useWorkoutStore.getState().workoutHistory,
            activeWorkout: useWorkoutStore.getState().activeWorkout,
          })
        : getBackfillEligibility({
            dateKey,
            workoutHistory: useWorkoutStore.getState().workoutHistory,
            activeWorkout: useWorkoutStore.getState().activeWorkout,
            todayKey,
          });
      setStartError(again.ok ? "Could not start workout." : again.reason);
    }
  }, [
    plan,
    dateKey,
    inProgressLog,
    startWorkoutForDate,
    continueInProgressWorkout,
    todayKey,
  ]);

  useEffect(() => {
    if (!plan || !canAccessLogPage || sessionForThisDay) return;
    if (inProgressLog) {
      handleBegin();
    }
  }, [plan, canAccessLogPage, sessionForThisDay, inProgressLog, handleBegin]);

  useEffect(() => {
    if (completedLog) {
      router.replace(routes.workoutHistoryDay(dateKey));
    }
  }, [completedLog, dateKey, router]);

  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) {
    return (
      <div className="flex flex-col py-8 gap-4 px-2 text-center">
        <p className="text-sm text-muted">Invalid date in URL.</p>
        <BackNavLink />
      </div>
    );
  }

  if (!canAccessLogPage) {
    return (
      <div className="flex flex-col py-8 gap-4">
        <BackNavLink />
        <SurfaceCard className="px-4 py-6 text-center">
          <p className="text-sm text-foreground">
            {resumeEligibility.ok === false
              ? resumeEligibility.reason
              : eligibility.ok === false
                ? eligibility.reason
                : "Cannot open this workout."}
          </p>
        </SurfaceCard>
      </div>
    );
  }

  if (planLoading || mode === "loading") {
    return (
      <div className="flex flex-col py-8 gap-4">
        <BackNavLink />
        <p className="text-sm text-muted text-center">Loading plan…</p>
      </div>
    );
  }

  if (planError || !plan) {
    return (
      <div className="flex flex-col py-8 gap-4">
        <BackNavLink />
        <SurfaceCard className="px-4 py-6 text-center">
          <p className="text-sm text-red-400">
            {planError ?? "Could not load the plan for this day."}
          </p>
        </SurfaceCard>
      </div>
    );
  }

  if (
    activeWorkout &&
    !activeWorkout.endTime &&
    activeWorkout.date !== dateKey
  ) {
    return (
      <div className="flex flex-col py-8 gap-4">
        <BackNavLink />
        <SurfaceCard className="px-4 py-6 text-center">
          <p className="text-sm text-foreground">
            Finish or discard your current workout before logging another day.
          </p>
          <Link
            href={routes.workout}
            className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
          >
            Go to Today
          </Link>
        </SurfaceCard>
      </div>
    );
  }

  if (!sessionForThisDay) {
    return (
      <div className="flex flex-col py-8 gap-5">
        <BackNavLink />
        <h1 className="text-2xl font-bold text-foreground">
          Log workout · {formatPageTitle(dateKey)}
        </h1>
        <SurfaceCard className="px-4 py-4">
          <p className="text-sm text-muted">
            You&apos;ll log against the prescribed plan for that training week.
            Progress saves as you go; complete when finished.
          </p>
        </SurfaceCard>
        {startError && (
          <p className="text-sm text-red-400 text-center" role="alert">
            {startError}
          </p>
        )}
        <button
          type="button"
          onClick={handleBegin}
          className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-white transition-colors hover:bg-accent/90"
        >
          Begin logging
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col py-6 gap-5">
      <BackNavLink />
      <h1 className="text-2xl font-bold text-foreground">
        {formatPageTitle(dateKey)}
      </h1>
      <WorkoutSession
        plan={plan}
        hideSaveForLater
        sessionBanner={
          <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              Logging a past workout
            </p>
            <p className="text-xs text-muted mt-0.5">
              This session is dated {formatPageTitle(dateKey)}. Complete when
              done to save it to your history.
            </p>
          </div>
        }
        onAfterComplete={() => router.push(routes.workoutHistoryDay(dateKey))}
      />
      <FloatingTimer />
    </div>
  );
}
