"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import CategoryBadge from "@/components/common/CategoryBadge";
import PlanMetaPill from "@/components/common/PlanMetaPill";
import BackNavLink from "@/components/common/BackNavLink";
import { routes } from "@/lib/appRoutes";
import SurfaceCard from "@/components/common/SurfaceCard";
import FloatingTimer from "@/components/common/FloatingTimer";
import WorkoutDayReview from "@/components/workout/WorkoutDayReview";
import WorkoutPlanEditor from "@/components/workout/WorkoutPlanEditor";
import WorkoutSession from "@/components/workout/WorkoutSession";
import WorkoutPlanPreview from "@/components/workout/WorkoutPlanPreview";
import { categoriesPresentInPlan } from "@/lib/planDisplayCategories";
import { cardioBadgesForPlan, restBadgeForPlan } from "@/lib/planCardioDisplay";
import {
  isFullRestDay,
  isOptionalRestDay,
  REST_DAY_DESCRIPTIONS,
} from "@/lib/restDays";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { isUserCustomizedWeekSource } from "@/lib/planGenerator";
import { bumpTrainingWeekPlansAfterCustomSave } from "@/adapters/bumpTrainingWeekPlansAfterCustomSave";
import { resetTrainingDayToGenerated } from "@/lib/trainingWeekRefresh";
import { saveCustomDayPlan } from "@/lib/trainingWeekCustomize";
import { useEnsureHistoryLoaded } from "@/hooks/useEnsureHistoryLoaded";
import { useWeekSourceForDate } from "@/hooks/useWeekSourceForDate";
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
import { parseLocalDateKey } from "@/utils/localDateKey";
import {
  compareDateKeyToToday,
  isDateKeyInCurrentCalendarWeek,
  getWeekDateKeys,
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

export default function WeeklyDayPage() {
  const params = useParams();
  const router = useRouter();
  const dateKey = typeof params.date === "string" ? params.date : "";
  const {
    workoutHistory,
    startWorkout,
    startWorkoutForDate,
    continueInProgressWorkout,
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

  useEnsureHistoryLoaded();

  const parsed = parseLocalDateKey(dateKey);
  const when = compareDateKeyToToday(dateKey);
  const inWeek = isDateKeyInCurrentCalendarWeek(dateKey);
  /** Past days from prior weeks (e.g. Sat → Sun) are allowed; future outside this week is not. */
  const canOpenDay =
    !!parsed && (when === "past" || when === "today" || inWeek);
  const planKey = canOpenDay ? dateKey : "";
  const { plan, loading: planLoading, error: planError } = useDayPlan(planKey);

  const weekDates = useMemo(() => {
    const d = parseLocalDateKey(dateKey);
    if (!d) return [];
    return getWeekDateKeys(d)
      .map((key) => parseLocalDateKey(key))
      .filter((day): day is Date => day != null);
  }, [dateKey]);
  const { weekByDow } = useTrainingWeekPlans(weekDates);

  const canCustomize = mode === "authenticated" && !!planKey;
  const weekSource = useWeekSourceForDate(canCustomize ? dateKey : "");

  const isCustomWeek =
    programMode === "custom" || isUserCustomizedWeekSource(weekSource);

  const logForDay = useMemo(
    () => findCompletedWorkoutForDate(workoutHistory, dateKey),
    [workoutHistory, dateKey],
  );

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
    !editingCompletedHere;

  if (!parsed) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-2">
        <p className="text-sm text-muted text-center">Invalid date in URL.</p>
        <BackNavLink href={routes.workoutWeek} />
      </div>
    );
  }

  if (!canOpenDay) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-2">
        <p className="text-sm text-foreground text-center px-2">
          {when === "future"
            ? "Future weeks open from Weekly when that week starts."
            : "Could not open this day."}
        </p>
        <BackNavLink
          href={
            inWeek ? routes.workoutWeek : routes.workoutHistoryDay(dateKey)
          }
        />
      </div>
    );
  }

  if (planLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 px-2">
        <BackNavLink href={routes.workoutWeek} />
        <p className="text-sm text-muted text-center">
          Loading this day&apos;s plan…
        </p>
      </div>
    );
  }

  if (planError || !plan) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-2">
        <p className="text-sm text-foreground text-center px-2">
          {planError ?? "Could not load this day&apos;s plan."}
        </p>
        <BackNavLink href={routes.workoutWeek} />
      </div>
    );
  }

  const allCategories = categoriesPresentInPlan(plan);
  const restBadge = restBadgeForPlan(plan);
  const cardioBadges = cardioBadgesForPlan(plan);
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
      const mergedWeek = await saveCustomDayPlan(dateKey, editedPlan);
      await bumpTrainingWeekPlansAfterCustomSave(dateKey, mergedWeek);
      setCustomizing(false);
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
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Could not reset this day");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col py-6 gap-5">
      <div className="flex flex-col gap-3">
        <BackNavLink
          href={inWeek ? routes.workoutWeek : routes.workoutHistory}
        />
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-1"
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
        {restBadge ? (
          <PlanMetaPill variant="rest">{restBadge}</PlanMetaPill>
        ) : null}
        {cardioBadges.map((label) => (
          <PlanMetaPill key={label} variant="cardio">
            {label}
          </PlanMetaPill>
        ))}
      </div>

      {isOptionalRestDay(plan) && !showPlanEditor && !customizing && (
        <SurfaceCard className="px-4 py-3">
          <p className="text-sm text-muted leading-snug">
            {isFullRestDay(plan)
              ? REST_DAY_DESCRIPTIONS.full_rest
              : REST_DAY_DESCRIPTIONS.stretches}{" "}
            Use{" "}
            <span className="font-medium text-foreground">Edit Day</span> to
            add optional exercises, stretches, or cardio.
          </p>
        </SurfaceCard>
      )}

      {canCustomize &&
        showCustomizeSlot &&
        !showPlanEditor &&
        when !== "past" && (
        <button
          type="button"
          onClick={() => {
            setSaveError(null);
            setCustomizing(true);
          }}
          className="w-full rounded-xl border border-accent/40 bg-accent/10 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          Edit Day
        </button>
      )}

      {mode === "guest" &&
        showCustomizeSlot &&
        !customizing &&
        when !== "past" && (
        <AccountFeatureGate
          feature="customizeDay"
          title="Edit Day"
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
          isFutureDay
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
            <div className="flex flex-col gap-4">
              {inProgressLog || activeWorkout?.date === dateKey ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!plan) return;
                    const ok = continueInProgressWorkout(plan, dateKey);
                    if (ok) {
                      router.replace(
                        `${routes.workoutHistoryLog(dateKey)}?from=week`,
                      );
                    }
                  }}
                  className="w-full rounded-xl bg-accent py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 active:scale-[0.98]"
                >
                  Continue logging
                </button>
              ) : backfillEligibility.ok ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!plan) return;
                    const ok = startWorkoutForDate(plan, dateKey);
                    if (ok) {
                      router.replace(
                        `${routes.workoutHistoryLog(dateKey)}?from=week`,
                      );
                    }
                  }}
                  className="w-full rounded-xl bg-accent py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 active:scale-[0.98]"
                >
                  Start workout
                </button>
              ) : (
                <SurfaceCard className="px-4 py-3 text-center">
                  <p className="text-xs text-muted">
                    {backfillEligibility.reason}
                  </p>
                </SurfaceCard>
              )}
              {canCustomize && showCustomizeSlot && !showPlanEditor ? (
                <button
                  type="button"
                  onClick={() => {
                    setSaveError(null);
                    setCustomizing(true);
                  }}
                  className="w-full rounded-xl border border-accent/40 bg-accent/10 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
                >
                  Edit Day
                </button>
              ) : null}
              {mode === "guest" && showCustomizeSlot && !customizing ? (
                <AccountFeatureGate feature="customizeDay" title="Edit Day" />
              ) : null}
              {!showPlanEditor ? (
                <WorkoutPlanPreview
                  plan={plan}
                  weekByDow={weekByDow}
                  showTargetMuscleList={false}
                />
              ) : null}
            </div>
          ) : continueWorkoutHere ? (
            <SurfaceCard className="border-accent/30 bg-accent/10 px-4 py-3">
              <p className="text-sm text-foreground">
                Workout in progress - continue on{" "}
                <Link
                  href={routes.workout}
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
                You haven&apos;t completed today&apos;s workout yet - preview
                below or use{" "}
                <Link
                  href={routes.workout}
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
          className="flex flex-col gap-2"
        >
          {continueWorkoutHere ? (
            <Link
              href={routes.workout}
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
                router.push(routes.workout);
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
