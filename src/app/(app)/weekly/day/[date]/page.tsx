"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CategoryBadge from "@/components/common/CategoryBadge";
import WorkoutDayReview from "@/components/workout/WorkoutDayReview";
import WorkoutPlanPreview from "@/components/workout/WorkoutPlanPreview";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { findWorkoutLogForDate } from "@/utils/workoutLogLookup";
import { useDayPlan } from "@/hooks/useDayPlan";
import {
  compareDateKeyToToday,
  isDateKeyInCurrentCalendarWeek,
  parseLocalDateKey,
} from "@/utils/weekCalendar";

function formatCompletedBannerTitle(dateKey: string): string {
  const d = parseLocalDateKey(dateKey);
  if (!d) return "Completed";
  const label = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `Completed · ${label}`;
}

function formatScheduledBannerTitle(dateKey: string): string {
  const d = parseLocalDateKey(dateKey);
  if (!d) return "Scheduled workout";
  const label = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return `Scheduled · ${label}`;
}

function formatPageTitle(dateKey: string): string {
  const d = parseLocalDateKey(dateKey);
  if (!d) return "Workout";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const WEEKLY_BACK_LINK_CLASS =
  "group flex w-full max-w-md items-center gap-3 rounded-xl border-2 border-border bg-surface px-4 py-3.5 text-left shadow-sm transition-colors hover:border-accent/50 hover:bg-accent/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:mx-auto";

function WeeklyOverviewBackLink() {
  return (
    <Link href="/weekly" className={WEEKLY_BACK_LINK_CLASS}>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-lg font-bold text-accent group-hover:bg-accent/30"
        aria-hidden
      >
        ←
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">
          Back to weekly overview
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-muted">
          All days in this training week
        </span>
      </span>
    </Link>
  );
}

export default function WeeklyDayPage() {
  const params = useParams();
  const router = useRouter();
  const dateKey = typeof params.date === "string" ? params.date : "";
  const {
    workoutHistory,
    loadHistory,
    startWorkout,
    updateCompletedWorkoutNotes,
    activeWorkout,
  } = useWorkoutStore();
  const mode = useAuthStore((s) => s.mode);

  useEffect(() => {
    if (mode === "loading") return;
    void loadHistory();
  }, [mode, loadHistory]);

  const parsed = parseLocalDateKey(dateKey);
  const inWeek = isDateKeyInCurrentCalendarWeek(dateKey);
  const planKey = parsed && inWeek ? dateKey : "";
  const { plan, loading: planLoading, error: planError } = useDayPlan(planKey);

  const when = compareDateKeyToToday(dateKey);

  const logForDay = useMemo(
    () => findWorkoutLogForDate(workoutHistory, dateKey),
    [workoutHistory, dateKey],
  );

  const continueWorkoutHere =
    when === "today" &&
    !logForDay &&
    activeWorkout &&
    activeWorkout.date === dateKey;

  if (!parsed) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-2">
        <p className="text-sm text-muted text-center">Invalid date in URL.</p>
        <WeeklyOverviewBackLink />
      </div>
    );
  }

  if (!inWeek) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-2">
        <p className="text-sm text-foreground text-center px-2">
          Only the current calendar week can be opened here.
        </p>
        <WeeklyOverviewBackLink />
      </div>
    );
  }

  if (planLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 px-2">
        <p className="text-sm text-muted text-center">Loading this day&apos;s plan…</p>
        <WeeklyOverviewBackLink />
      </div>
    );
  }

  if (planError || !plan) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-2">
        <p className="text-sm text-foreground text-center px-2">
          {planError ?? "Could not load this day&apos;s plan."}
        </p>
        <WeeklyOverviewBackLink />
      </div>
    );
  }

  const allCategories = [...plan.strengthFocus, ...plan.coreGroups];

  return (
    <div className="py-6 space-y-5">
      <div className="flex flex-col gap-3">
        <WeeklyOverviewBackLink />
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-accent">
            {plan.name}
          </p>
          <h1 className="text-2xl font-bold text-foreground">{formatPageTitle(dateKey)}</h1>
          <p className="text-sm text-muted">{plan.theme}</p>
        </motion.div>
      </div>

      <div className="flex flex-wrap gap-2">
        {allCategories.map((cat) => (
          <CategoryBadge key={cat} category={cat} size="md" />
        ))}
        {plan.hasJog && (
          <span className="inline-flex items-center rounded-full bg-sky-500/20 px-2.5 py-1 text-xs font-medium text-sky-400">
            🏃 Jog
          </span>
        )}
      </div>

      {when === "future" && (
        <WorkoutPlanPreview
          plan={plan}
          bannerTitle={formatScheduledBannerTitle(dateKey)}
          bannerHint="Read-only preview of the prescribed plan."
          isFutureDay
          showTargetMuscleList={false}
        />
      )}

      {when !== "future" && logForDay && (
        <WorkoutDayReview
          plan={plan}
          log={logForDay}
          completedBannerTitle={formatCompletedBannerTitle(dateKey)}
          onNotesChange={(notes) => updateCompletedWorkoutNotes(logForDay.id, notes)}
        />
      )}

      {when !== "future" && !logForDay && (
        <>
          {when === "past" ? (
            <div className="rounded-xl border border-border bg-surface px-4 py-3">
              <p className="text-sm text-muted">No workout was logged on this day.</p>
            </div>
          ) : continueWorkoutHere ? (
            <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
              <p className="text-sm text-foreground">
                Workout in progress — continue on{" "}
                <Link href="/today" className="font-medium text-accent hover:underline">
                  Today
                </Link>{" "}
                for timers and logging.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface px-4 py-3">
              <p className="text-sm text-foreground">
                You haven&apos;t completed today&apos;s workout yet — preview below or use{" "}
                <Link href="/today" className="font-medium text-accent hover:underline">
                  Today
                </Link>
                .
              </p>
            </div>
          )}
          <WorkoutPlanPreview
            plan={plan}
            bannerTitle={
              when === "today"
                ? "Today’s prescribed plan"
                : formatScheduledBannerTitle(dateKey)
            }
            bannerHint={when === "today" ? undefined : "What was scheduled — not logged."}
            showTargetMuscleList
          />
        </>
      )}

      {when === "today" && !logForDay && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {continueWorkoutHere ? (
            <Link
              href="/today"
              className="flex w-full items-center justify-center rounded-xl bg-accent py-4 text-base font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 active:scale-[0.98]"
            >
              Continue workout
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                startWorkout(plan);
                router.push("/today");
              }}
              className="w-full rounded-xl bg-accent py-4 text-base font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 active:scale-[0.98]"
            >
              Start workout
            </button>
          )}
          <p className="text-center text-[11px] text-muted">
            {continueWorkoutHere
              ? "Resume your session on Today."
              : "Opens the Today tab with your live session and timers."}
          </p>
        </motion.div>
      )}
    </div>
  );
}
