"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import CategoryBadge from "@/components/common/CategoryBadge";
import SurfaceCard from "@/components/common/SurfaceCard";
import FloatingTimer from "@/components/common/FloatingTimer";
import WorkoutDayReview from "@/components/workout/WorkoutDayReview";
import WorkoutPlanEditor from "@/components/workout/WorkoutPlanEditor";
import WorkoutSession from "@/components/workout/WorkoutSession";
import WorkoutPlanPreview from "@/components/workout/WorkoutPlanPreview";
import { categoriesPresentInPlan } from "@/lib/planDisplayCategories";
import {
  isFullRestDay,
  isOptionalRestDay,
  REST_DAY_DESCRIPTIONS,
} from "@/lib/restDays";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { isUserCustomizedWeekSource } from "@/lib/planGenerator";
import {
  bumpTrainingWeekPlans,
  resetTrainingDayToGenerated,
} from "@/lib/trainingWeekRefresh";
import {
  getWeekSourceForDate,
  saveCustomDayPlan,
} from "@/lib/trainingWeekCustomize";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { getBackfillEligibility } from "@/lib/backfillWorkout";
import {
  findCompletedWorkoutForDate,
  findInProgressWorkoutForDate,
} from "@/utils/workoutLogLookup";
import { toastSaveError } from "@/utils/saveErrorToast";
import { useDayPlan } from "@/hooks/useDayPlan";
import { useTrainingWeekPlans } from "@/hooks/useTrainingWeekPlans";
import type { DayPlan } from "@/types";
import AccountFeatureGate from "@/components/auth/AccountFeatureGate";
import {
  compareDateKeyToToday,
  isDateKeyInCurrentCalendarWeek,
  getWeekDateKeys,
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
    startEditingCompletedWorkout,
    activeWorkout,
    pausedWorkoutDate,
  } = useWorkoutStore();
  const mode = useAuthStore((s) => s.mode);
  const programMode = useSettingsStore((s) => s.programMode);
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

  const weekDates = useMemo(
    () =>
      getWeekDateKeys()
        .map((key) => parseLocalDateKey(key))
        .filter((d): d is Date => d != null),
    [],
  );
  const { weekByDow } = useTrainingWeekPlans(weekDates);

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

  const isCustomWeek =
    programMode === "custom" || isUserCustomizedWeekSource(weekSource);

  const when = compareDateKeyToToday(dateKey);

  const logForDay = useMemo(
    () => findCompletedWorkoutForDate(workoutHistory, dateKey),
    [workoutHistory, dateKey],
  );

  const backfillLogHref = `/progress/history/${dateKey}/log`;
  const backfillEligibility = useMemo(
    () =>
      getBackfillEligibility({
        dateKey,
        workoutHistory,
        activeWorkout,
      }),
    [dateKey, workoutHistory, activeWorkout],
  );
  const inProgressLog = useMemo(
    () => findInProgressWorkoutForDate(workoutHistory, dateKey),
    [workoutHistory, dateKey],
  );

  const editingCompletedHere =
    activeWorkout?.endTime != null && activeWorkout.date === dateKey;

  const handleEditCompletedWorkout = () => {
    if (!logForDay) return;
    startEditingCompletedWorkout(logForDay.id);
  };

  const continueWorkoutHere =
    when === "today" &&
    !logForDay &&
    ((activeWorkout && activeWorkout.date === dateKey) ||
      pausedWorkoutDate === dateKey);

  const showCustomizeSlot =
    !!planKey &&
    !!plan &&
    !logForDay &&
    !continueWorkoutHere &&
    !editingCompletedHere &&
    (when !== "future" || isOptionalRestDay(plan));

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

  const allCategories = categoriesPresentInPlan(plan);
  const showPlanEditor = customizing && canCustomize && !logForDay;
  const weekdayMatchesPlanName = (() => {
    const d = parseLocalDateKey(dateKey);
    if (!d) return false;
    const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
    return plan.name.trim().toLowerCase() === weekday.toLowerCase();
  })();

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
      const message = e instanceof Error ? e.message : "Could not save changes";
      setSaveError(message);
      toastSaveError("workout plan", e);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDay() {
    setSaving(true);
    setSaveError(null);
    try {
      await resetTrainingDayToGenerated(dateKey);
      setCustomizing(false);
      const source = await getWeekSourceForDate(dateKey);
      setWeekSource(source);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Could not reset this day");
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
          {!weekdayMatchesPlanName && (
            <p className="text-xs font-medium uppercase tracking-wider text-accent">
              {plan.name}
            </p>
          )}
          <h1 className="text-2xl font-bold text-foreground">
            {formatPageTitle(dateKey)}
          </h1>
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

      {isOptionalRestDay(plan) && !showPlanEditor && !customizing && (
        <SurfaceCard className="px-4 py-3">
          <p className="text-sm text-muted leading-snug">
            {isFullRestDay(plan)
              ? REST_DAY_DESCRIPTIONS.full_rest
              : REST_DAY_DESCRIPTIONS.stretches}{" "}
            Use{" "}
            <span className="font-medium text-foreground">Edit workout</span> to
            add optional exercises, stretches, or cardio.
          </p>
        </SurfaceCard>
      )}

      {canCustomize && showCustomizeSlot && !showPlanEditor && (
        <button
          type="button"
          onClick={() => {
            setSaveError(null);
            setCustomizing(true);
          }}
          className="w-full rounded-xl border border-accent/40 bg-accent/10 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          Edit workout
        </button>
      )}

      {mode === "guest" && showCustomizeSlot && !customizing && (
        <AccountFeatureGate
          feature="customizeDay"
          title="Customize this day's workout"
        />
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
          onResetDay={() => void handleResetDay()}
        />
      )}

      {when === "future" && !showPlanEditor && (
        <WorkoutPlanPreview
          plan={plan}
          weekByDow={weekByDow}
          showTargetMuscleList={false}
        />
      )}

      {editingCompletedHere && plan && (
        <>
          <WorkoutSession plan={plan} />
          <FloatingTimer />
        </>
      )}

      {when !== "future" && logForDay && !editingCompletedHere && (
        <WorkoutDayReview
          plan={plan}
          log={logForDay}
          completedBannerTitle={formatCompletedBannerTitle(dateKey)}
          onEditWorkout={handleEditCompletedWorkout}
          onNotesChange={(notes) =>
            updateCompletedWorkoutNotes(logForDay.id, notes)
          }
        />
      )}

      {when !== "future" && !logForDay && (
        <>
          {when === "past" ? (
            <SurfaceCard className="px-4 py-3 text-center space-y-3">
              <p className="text-sm text-muted">
                No workout was logged on this day.
              </p>
              {inProgressLog || activeWorkout?.date === dateKey ? (
                <Link
                  href={backfillLogHref}
                  className="inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent/90"
                >
                  Continue logging
                </Link>
              ) : backfillEligibility.ok ? (
                <Link
                  href={backfillLogHref}
                  className="inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent/90"
                >
                  Log workout for this day
                </Link>
              ) : (
                <p className="text-xs text-muted">
                  {backfillEligibility.reason}
                </p>
              )}
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
          {!showPlanEditor && when !== "past" && (
            <WorkoutPlanPreview
              plan={plan}
              weekByDow={weekByDow}
              showTargetMuscleList={false}
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
          <p className="text-center text-sm text-muted">
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
