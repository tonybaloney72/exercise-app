"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import CategoryBadge from "@/components/common/CategoryBadge";
import SurfaceCard from "@/components/common/SurfaceCard";
import WorkoutDayReview from "@/components/workout/WorkoutDayReview";
import WorkoutPlanEditor from "@/components/workout/WorkoutPlanEditor";
import WorkoutPlanPreview from "@/components/workout/WorkoutPlanPreview";
import { isUserCustomizedWeekSource } from "@/lib/planGenerator";
import {
  bumpTrainingWeekPlans,
  resetTrainingWeekToGenerated,
} from "@/lib/trainingWeekRefresh";
import {
  getWeekSourceForDate,
  saveCustomDayPlan,
} from "@/lib/trainingWeekCustomize";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { findWorkoutLogForDate } from "@/utils/workoutLogLookup";
import { useDayPlan } from "@/hooks/useDayPlan";
import type { DayPlan } from "@/types";
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
  "group block w-full max-w-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:mx-auto";

function WeeklyOverviewBackLink() {
  return (
    <Link href="/weekly" className={WEEKLY_BACK_LINK_CLASS}>
      <SurfaceCard className="flex items-center gap-3 border-2 px-4 py-3.5 shadow-sm transition-colors hover:border-accent/50 hover:bg-accent/10">
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
      </SurfaceCard>
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
    pausedWorkoutDate,
  } = useWorkoutStore();
  const mode = useAuthStore((s) => s.mode);
  const [customizing, setCustomizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [weekSource, setWeekSource] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "loading") return;
    void loadHistory();
  }, [mode, loadHistory]);

  const parsed = parseLocalDateKey(dateKey);
  const inWeek = isDateKeyInCurrentCalendarWeek(dateKey);
  const planKey = parsed && inWeek ? dateKey : "";
  const { plan, loading: planLoading, error: planError } = useDayPlan(planKey);

  const canCustomize = mode === "authenticated" && !!planKey;

  useEffect(() => {
    if (!canCustomize) {
      setWeekSource(null);
      return;
    }
    let cancelled = false;
    void getWeekSourceForDate(dateKey).then((source) => {
      if (!cancelled) setWeekSource(source);
    });
    return () => {
      cancelled = true;
    };
  }, [canCustomize, dateKey, plan]);

  const when = compareDateKeyToToday(dateKey);

  const logForDay = useMemo(
    () => findWorkoutLogForDate(workoutHistory, dateKey),
    [workoutHistory, dateKey],
  );

  const continueWorkoutHere =
    when === "today" &&
    !logForDay &&
    ((activeWorkout && activeWorkout.date === dateKey) ||
      pausedWorkoutDate === dateKey);

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
        <p className="text-sm text-muted text-center">
          Loading this day&apos;s plan…
        </p>
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
  const isCustomWeek = isUserCustomizedWeekSource(weekSource);
  const showPlanEditor = customizing && canCustomize && !logForDay;

  async function handleSaveDay(editedPlan: DayPlan) {
    setSaving(true);
    setSaveError(null);
    try {
      await saveCustomDayPlan(dateKey, editedPlan);
      bumpTrainingWeekPlans();
      setCustomizing(false);
      const source = await getWeekSourceForDate(dateKey);
      setWeekSource(source);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetWeek() {
    setSaving(true);
    setSaveError(null);
    try {
      await resetTrainingWeekToGenerated(dateKey);
      setCustomizing(false);
      const source = await getWeekSourceForDate(dateKey);
      setWeekSource(source);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Could not reset week");
    } finally {
      setSaving(false);
    }
  }

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
          <h1 className="text-2xl font-bold text-foreground">
            {formatPageTitle(dateKey)}
          </h1>
          <p className="text-sm text-muted">{plan.theme}</p>
          {isCustomWeek && canCustomize && (
            <p className="text-xs text-accent/90 pt-1">
              This week has custom edits — reset from the editor to regenerate.
            </p>
          )}
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

      {canCustomize && !logForDay && !showPlanEditor && (
        <button
          type="button"
          onClick={() => {
            setSaveError(null);
            setCustomizing(true);
          }}
          className="w-full rounded-xl border border-accent/40 bg-accent/10 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          Customize this day&apos;s workout
        </button>
      )}

      {saveError && (
        <p className="text-sm text-red-400 text-center px-2" role="alert">
          {saveError}
        </p>
      )}

      {showPlanEditor && (
        <WorkoutPlanEditor
          key={dateKey}
          initialPlan={plan}
          isCustomWeek={isCustomWeek}
          saving={saving}
          onSave={(edited) => void handleSaveDay(edited)}
          onCancel={() => {
            setSaveError(null);
            setCustomizing(false);
          }}
          onResetWeek={() => void handleResetWeek()}
        />
      )}

      {when === "future" && !showPlanEditor && (
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
          onNotesChange={(notes) =>
            updateCompletedWorkoutNotes(logForDay.id, notes)
          }
        />
      )}

      {when !== "future" && !logForDay && (
        <>
          {when === "past" ? (
            <SurfaceCard className="px-4 py-3">
              <p className="text-sm text-muted">
                No workout was logged on this day.
              </p>
            </SurfaceCard>
          ) : continueWorkoutHere ? (
            <SurfaceCard className="border-accent/30 bg-accent/10 px-4 py-3">
              <p className="text-sm text-foreground">
                Workout in progress — continue on{" "}
                <Link
                  href="/today"
                  className="font-medium text-accent hover:underline"
                >
                  Today
                </Link>{" "}
                for timers and logging.
              </p>
            </SurfaceCard>
          ) : (
            <SurfaceCard className="px-4 py-3">
              <p className="text-sm text-foreground">
                You haven&apos;t completed today&apos;s workout yet — preview
                below or use{" "}
                <Link
                  href="/today"
                  className="font-medium text-accent hover:underline"
                >
                  Today
                </Link>
                .
              </p>
            </SurfaceCard>
          )}
          {!showPlanEditor && (
            <WorkoutPlanPreview
              plan={plan}
              bannerTitle={
                when === "today"
                  ? "Today’s prescribed plan"
                  : formatScheduledBannerTitle(dateKey)
              }
              bannerHint={
                when === "today"
                  ? undefined
                  : "What was scheduled — not logged."
              }
              showTargetMuscleList
            />
          )}
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
              {pausedWorkoutDate === dateKey && !activeWorkout
                ? "Resume workout"
                : "Continue workout"}
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
              ? pausedWorkoutDate === dateKey && !activeWorkout
                ? "Resume your saved session on Today."
                : "Resume your session on Today."
              : "Opens the Today tab with your live session and timers."}
          </p>
        </motion.div>
      )}
    </div>
  );
}
