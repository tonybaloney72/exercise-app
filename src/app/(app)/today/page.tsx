"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import AnimatedSection from "@/components/common/AnimatedSection";
import PlanCardSkeleton from "@/components/common/PlanCardSkeleton";
import SurfaceCard from "@/components/common/SurfaceCard";
import CategoryBadge from "@/components/common/CategoryBadge";
import WorkoutSession from "@/components/workout/WorkoutSession";
import WorkoutDayReview from "@/components/workout/WorkoutDayReview";
import PostWorkoutSummary from "@/components/workout/PostWorkoutSummary";
import StaleWorkoutSessionsBanner from "@/components/workout/StaleWorkoutSessionsBanner";
import WorkoutPlanEditor from "@/components/workout/WorkoutPlanEditor";
import FloatingTimer from "@/components/common/FloatingTimer";
import { isUserCustomizedWeekSource } from "@/lib/planGenerator";
import { categoriesPresentInPlan } from "@/lib/planDisplayCategories";
import { useSettingsStore } from "@/stores/useSettingsStore";
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
import { formatLocalDateKey } from "@/utils/localDateKey";
import { toastSaveError } from "@/utils/saveErrorToast";
import { findCompletedWorkoutForDate } from "@/utils/workoutLogLookup";
import { useDayPlan } from "@/hooks/useDayPlan";
import type { DayPlan } from "@/types";
import AccountFeatureGate from "@/components/auth/AccountFeatureGate";
import QuickActivityLog from "@/components/workout/QuickActivityLog";

function TodayPageInner() {
  const searchParams = useSearchParams();
  const {
    activeWorkout,
    workoutHistory,
    pausedWorkoutDate,
    startWorkout,
    resumeWorkout,
    discardWorkout,
    loadHistory,
    reconcileDayBoundary,
    updateCompletedWorkoutNotes,
    startEditingCompletedWorkout,
  } = useWorkoutStore();
  const mode = useAuthStore((s) => s.mode);
  const todayKey = formatLocalDateKey();
  const sessionDateKey =
    activeWorkout && !activeWorkout.endTime ? activeWorkout.date : todayKey;
  const { plan: todayPlan, loading: planLoading, error: planError } =
    useDayPlan(todayKey);
  const { plan: sessionPlanFromDate } = useDayPlan(
    sessionDateKey !== todayKey ? sessionDateKey : "",
  );
  const plan =
    sessionDateKey !== todayKey && sessionPlanFromDate
      ? sessionPlanFromDate
      : todayPlan;
  const [customizing, setCustomizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [weekSource, setWeekSource] = useState<string | null>(null);
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(false);

  const devForcePreWorkout =
    process.env.NODE_ENV === "development" &&
    searchParams.get("dev") === "start";

  useEffect(() => {
    if (mode === "loading") return;
    void loadHistory();
  }, [mode, loadHistory]);

  useEffect(() => {
    if (mode === "loading") return;
    void reconcileDayBoundary();
  }, [mode, todayKey, reconcileDayBoundary]);

  const todaysCompletedLog = useMemo(
    () => findCompletedWorkoutForDate(workoutHistory, todayKey),
    [workoutHistory, todayKey],
  );

  const completedLogForUi = devForcePreWorkout ? null : todaysCompletedLog;
  const editingCompletedToday =
    activeWorkout?.endTime != null && activeWorkout.date === todayKey;

  const handleEditCompletedWorkout = () => {
    if (!completedLogForUi) return;
    setShowWorkoutDetails(false);
    startEditingCompletedWorkout(completedLogForUi.id);
  };
  const hasPausedDraftToday =
    !activeWorkout &&
    !completedLogForUi &&
    pausedWorkoutDate === todayKey;

  const canCustomize = mode === "authenticated" && !!plan;
  const showCustomizeSlot =
    !!plan &&
    !activeWorkout &&
    !devForcePreWorkout &&
    !todaysCompletedLog &&
    pausedWorkoutDate !== todayKey;
  const canEditPlan = canCustomize && showCustomizeSlot;
  const showGuestCustomizeGate =
    mode === "guest" && showCustomizeSlot && !customizing;

  useEffect(() => {
    if (!canCustomize) {
      setWeekSource(null);
      return;
    }
    let cancelled = false;
    void getWeekSourceForDate(todayKey).then((source) => {
      if (!cancelled) setWeekSource(source);
    });
    return () => {
      cancelled = true;
    };
  }, [canCustomize, todayKey]);

  useEffect(() => {
    setShowWorkoutDetails(false);
  }, [todaysCompletedLog?.id]);

  if (planLoading) {
    return (
      <div className="py-6 space-y-5" aria-busy="true">
        <div className="space-y-2 animate-pulse">
          <div className="h-3 w-24 rounded bg-border" />
          <div className="h-8 w-52 max-w-[80%] rounded bg-border" />
          <div className="h-4 w-full max-w-sm rounded bg-border/80" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-7 w-16 rounded-full bg-border animate-pulse"
            />
          ))}
        </div>
        <PlanCardSkeleton />
      </div>
    );
  }

  if (planError || !plan) {
    return (
      <div className="py-8 space-y-3 text-center px-2">
        <p className="text-sm text-foreground">
          {planError ?? "Could not load today&apos;s plan."}
        </p>
      </div>
    );
  }

  const allCategories = categoriesPresentInPlan(plan);
  const isCustomWeek = isUserCustomizedWeekSource(weekSource);
  const showPlanEditor = customizing && canEditPlan;
  const showPreWorkoutActions =
    !activeWorkout &&
    !completedLogForUi &&
    !hasPausedDraftToday &&
    !showPlanEditor;
  const hideStaleBanner = Boolean(activeWorkout) || customizing;
  const showQuickActivityLog =
    !customizing &&
    !showPlanEditor &&
    (!activeWorkout || editingCompletedToday) &&
    !hasPausedDraftToday;

  async function handleSaveDay(editedPlan: DayPlan) {
    setSaving(true);
    setSaveError(null);
    try {
      await saveCustomDayPlan(todayKey, editedPlan);
      bumpTrainingWeekPlans();
      setCustomizing(false);
      const source = await getWeekSourceForDate(todayKey);
      setWeekSource(source);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Could not save changes";
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
      await resetTrainingDayToGenerated(todayKey);
      setCustomizing(false);
      const source = await getWeekSourceForDate(todayKey);
      setWeekSource(source);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Could not reset this day");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="py-6 space-y-5">
      {devForcePreWorkout && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Dev: pre-workout view forced (<code className="font-mono">?dev=start</code>
          ). Remove the query to see today&apos;s review again.
        </p>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <p className="text-xs font-medium uppercase tracking-wider text-accent">
          {plan.name}
        </p>
        <h1 className="text-2xl font-bold text-foreground">
          Today&apos;s Workout
        </h1>
      </motion.div>

      {/* Category chips */}
      {!completedLogForUi && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2"
        >
          {allCategories.map((cat) => (
            <CategoryBadge key={cat} category={cat} size="md" />
          ))}
          {plan.hasJog && (
            <span className="inline-flex items-center rounded-full bg-sky-500/20 px-2.5 py-1 text-xs font-medium text-sky-400">
              🏃 Jog
            </span>
          )}
        </motion.div>
      )}

      {showGuestCustomizeGate && (
        <AccountFeatureGate
          feature="customizeDay"
          title="Edit workout"
        />
      )}

      {saveError && (
        <p className="text-sm text-red-400 text-center px-2" role="alert">
          {saveError}
        </p>
      )}

      {showPlanEditor && (
        <WorkoutPlanEditor
          key={todayKey}
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

      {/* Active workout session */}
      {activeWorkout && <WorkoutSession plan={plan} />}
      {activeWorkout && <FloatingTimer />}

      {/* Completed today — summary first, full log on demand */}
      {!editingCompletedToday && completedLogForUi && !showWorkoutDetails && (
        <PostWorkoutSummary
          plan={plan}
          log={completedLogForUi}
          onMoreDetails={() => setShowWorkoutDetails(true)}
          onEditWorkout={handleEditCompletedWorkout}
        />
      )}

      {!editingCompletedToday && completedLogForUi && showWorkoutDetails && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowWorkoutDetails(false)}
            className="text-sm font-medium text-accent hover:underline"
          >
            ← Back to summary
          </button>
          <WorkoutDayReview
            plan={plan}
            log={completedLogForUi}
            hideCompletionBanner
            onEditWorkout={handleEditCompletedWorkout}
            onNotesChange={(notes) =>
              updateCompletedWorkoutNotes(completedLogForUi.id, notes)
            }
          />
        </div>
      )}

      {showQuickActivityLog && (
        <AnimatedSection delay={0.12}>
          <QuickActivityLog plan={plan} dateKey={todayKey} />
        </AnimatedSection>
      )}

      <StaleWorkoutSessionsBanner hidden={hideStaleBanner} />

      {hasPausedDraftToday && (
        <AnimatedSection className="space-y-3" delay={0.15}>
          <SurfaceCard className="p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">
              Workout in progress
            </p>
            <p className="text-xs text-muted">
              You saved this session for later. Resume to pick up where you left
              off, or discard to start fresh.
            </p>
          </SurfaceCard>
          <button
            type="button"
            onClick={() => resumeWorkout()}
            className="w-full rounded-xl bg-accent py-4 text-base font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 active:scale-[0.98]"
          >
            Resume workout
          </button>
          <button
            type="button"
            onClick={() => discardWorkout()}
            className="w-full rounded-xl border border-border bg-surface py-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            Discard saved session
          </button>
        </AnimatedSection>
      )}

      {showPreWorkoutActions && (
        <AnimatedSection className="space-y-4" delay={0.15}>
          <div className="flex gap-2">
            {canEditPlan ? (
              <button
                type="button"
                onClick={() => {
                  setSaveError(null);
                  setCustomizing(true);
                }}
                className="flex-1 rounded-xl border border-accent/40 bg-accent/10 py-3.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
              >
                Edit workout
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => startWorkout(plan)}
              className={`rounded-xl bg-accent py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 active:scale-[0.98] ${
                canEditPlan ? "flex-1" : "w-full py-4 text-base"
              }`}
            >
              Start workout
            </button>
          </div>
        </AnimatedSection>
      )}
    </div>
  );
}

export default function TodayPage() {
  return (
    <Suspense fallback={null}>
      <TodayPageInner />
    </Suspense>
  );
}
