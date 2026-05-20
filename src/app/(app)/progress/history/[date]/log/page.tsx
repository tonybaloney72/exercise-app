"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import FloatingTimer from "@/components/common/FloatingTimer";
import SurfaceCard from "@/components/common/SurfaceCard";
import { ProgressBackLink } from "@/components/progress/ProgressSubnavLink";
import WorkoutSession from "@/components/workout/WorkoutSession";
import { getBackfillEligibility } from "@/lib/backfillWorkout";
import { useDayPlan } from "@/hooks/useDayPlan";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { formatLocalDateKey } from "@/utils/localDateKey";
import {
  findInProgressWorkoutForDate,
  findCompletedWorkoutForDate,
} from "@/utils/workoutLogLookup";
import { parseLocalDateKey } from "@/utils/weekCalendar";

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
    loadHistory,
    startWorkoutForDate,
  } = useWorkoutStore();
  const { plan, loading: planLoading, error: planError } = useDayPlan(dateKey);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "loading") return;
    void loadHistory();
  }, [mode, loadHistory]);

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
    const ok = startWorkoutForDate(plan, dateKey);
    if (!ok) {
      const again = getBackfillEligibility({
        dateKey,
        workoutHistory: useWorkoutStore.getState().workoutHistory,
        activeWorkout: useWorkoutStore.getState().activeWorkout,
        todayKey,
      });
      setStartError(again.ok ? "Could not start workout." : again.reason);
    }
  }, [plan, dateKey, startWorkoutForDate, todayKey]);

  useEffect(() => {
    if (!plan || !eligibility.ok || sessionForThisDay) return;
    if (inProgressLog) {
      handleBegin();
    }
  }, [plan, eligibility.ok, sessionForThisDay, inProgressLog, handleBegin]);

  useEffect(() => {
    if (completedLog) {
      router.replace(`/progress/history/${dateKey}`);
    }
  }, [completedLog, dateKey, router]);

  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) {
    return (
      <div className="py-8 space-y-4 px-2 text-center">
        <p className="text-sm text-muted">Invalid date in URL.</p>
        <ProgressBackLink href="/progress/history" label="Back to history" />
      </div>
    );
  }

  const backHref = `/progress/history/${dateKey}`;

  if (!eligibility.ok) {
    return (
      <div className="py-8 space-y-4">
        <ProgressBackLink href={backHref} label="Back to day" />
        <SurfaceCard className="px-4 py-6 text-center">
          <p className="text-sm text-foreground">{eligibility.reason}</p>
        </SurfaceCard>
      </div>
    );
  }

  if (planLoading || mode === "loading") {
    return (
      <div className="py-8 space-y-4">
        <ProgressBackLink href={backHref} label="Back to day" />
        <p className="text-sm text-muted text-center">Loading plan…</p>
      </div>
    );
  }

  if (planError || !plan) {
    return (
      <div className="py-8 space-y-4">
        <ProgressBackLink href={backHref} label="Back to day" />
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
      <div className="py-8 space-y-4">
        <ProgressBackLink href={backHref} label="Back to day" />
        <SurfaceCard className="px-4 py-6 text-center">
          <p className="text-sm text-foreground">
            Finish or discard your current workout before logging another day.
          </p>
          <Link
            href="/today"
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
      <div className="py-8 space-y-5">
        <ProgressBackLink href={backHref} label="Back to day" />
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
    <div className="py-6 space-y-5">
      <ProgressBackLink href={backHref} label="Back to day" />
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
        onAfterComplete={() => router.push(`/progress/history/${dateKey}`)}
      />
      <FloatingTimer />
    </div>
  );
}
