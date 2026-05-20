"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import WorkoutDayReview from "@/components/workout/WorkoutDayReview";
import SurfaceCard from "@/components/common/SurfaceCard";
import { ProgressBackLink } from "@/components/progress/ProgressSubnavLink";
import { planFromWorkoutLog } from "@/lib/workoutEditSession";
import { formatCompletedBannerTitle } from "@/lib/workoutHistoryGroups";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useAuthStore } from "@/stores/useAuthStore";
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
  const router = useRouter();
  const dateKey = typeof params.date === "string" ? params.date : "";
  const {
    workoutHistory,
    loadHistory,
    updateCompletedWorkoutNotes,
    activeWorkout,
  } = useWorkoutStore();
  const mode = useAuthStore((s) => s.mode);

  useEffect(() => {
    if (mode === "loading") return;
    void loadHistory();
  }, [mode, loadHistory]);

  const log = useMemo(
    () => findCompletedWorkoutForDate(workoutHistory, dateKey),
    [workoutHistory, dateKey],
  );

  const plan = useMemo(() => (log ? planFromWorkoutLog(log) : null), [log]);

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
      <div className="py-8 space-y-4 px-2 text-center">
        <p className="text-sm text-muted">Invalid date in URL.</p>
        <ProgressBackLink href="/progress/history" label="Back to history" />
      </div>
    );
  }

  if (!log || !plan) {
    const logHref = `/progress/history/${dateKey}/log`;
    return (
      <div className="py-8 space-y-4">
        <ProgressBackLink href="/progress/history" label="Back to history" />
        <h1 className="text-2xl font-bold text-foreground">
          {formatPageTitle(dateKey)}
        </h1>
        <SurfaceCard className="px-4 py-6 text-center space-y-3">
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
                <p className="text-xs text-muted">{backfillEligibility.reason}</p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted">
              This day is in the future — no log yet.
            </p>
          )}
        </SurfaceCard>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-5">
      <div className="space-y-3">
        <ProgressBackLink href="/progress/history" label="Back to history" />
        <h1 className="text-2xl font-bold text-foreground">
          {formatPageTitle(dateKey)}
        </h1>
      </div>

      {inCurrentWeek ? (
        <p className="text-xs text-muted px-1">
          This week is still open on{" "}
          <Link href={`/weekly/day/${dateKey}`} className="font-medium text-accent hover:underline">
            Weekly
          </Link>
          {" "}if you want to edit the prescribed plan or workout structure.
        </p>
      ) : null}

      <WorkoutDayReview
        plan={plan}
        log={log}
        completedBannerTitle={formatCompletedBannerTitle(dateKey)}
        onNotesChange={(notes) => updateCompletedWorkoutNotes(log.id, notes)}
        onEditWorkout={
          inCurrentWeek
            ? () => router.push(`/weekly/day/${dateKey}`)
            : undefined
        }
      />
    </div>
  );
}
