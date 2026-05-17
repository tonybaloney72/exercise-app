"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import AnimatedSection from "@/components/common/AnimatedSection";
import SurfaceCard from "@/components/common/SurfaceCard";
import { CATEGORIES } from "@/data/categories";
import CategoryBadge from "@/components/common/CategoryBadge";
import WorkoutSession from "@/components/workout/WorkoutSession";
import WorkoutDayReview from "@/components/workout/WorkoutDayReview";
import WorkoutPlanEditor from "@/components/workout/WorkoutPlanEditor";
import FloatingTimer from "@/components/common/FloatingTimer";
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
import { formatLocalDateKey } from "@/utils/localDateKey";
import { findWorkoutLogForDate } from "@/utils/workoutLogLookup";
import { useDayPlan } from "@/hooks/useDayPlan";
import type { DayPlan } from "@/types";

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
    updateCompletedWorkoutNotes,
  } = useWorkoutStore();
  const mode = useAuthStore((s) => s.mode);
  const todayKey = formatLocalDateKey();
  const { plan, loading: planLoading, error: planError } = useDayPlan(todayKey);
  const [customizing, setCustomizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [weekSource, setWeekSource] = useState<string | null>(null);

  const devForcePreWorkout =
    process.env.NODE_ENV === "development" &&
    searchParams.get("dev") === "start";

  useEffect(() => {
    if (mode === "loading") return;
    loadHistory();
  }, [mode, loadHistory]);

  const todaysCompletedLog = useMemo(
    () => findWorkoutLogForDate(workoutHistory, todayKey),
    [workoutHistory, todayKey],
  );

  const completedLogForUi = devForcePreWorkout ? null : todaysCompletedLog;
  const hasPausedDraftToday =
    !activeWorkout &&
    !completedLogForUi &&
    pausedWorkoutDate === todayKey;

  const canCustomize = mode === "authenticated" && !!plan;
  const canEditPlan =
    canCustomize &&
    !activeWorkout &&
    !devForcePreWorkout &&
    !todaysCompletedLog &&
    pausedWorkoutDate !== todayKey;

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

  if (planLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted">
        Loading today&apos;s plan…
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

  const allCategories = [...plan.strengthFocus, ...plan.coreGroups];
  const isCustomWeek = isUserCustomizedWeekSource(weekSource);
  const showPlanEditor = customizing && canEditPlan;

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
      setSaveError(e instanceof Error ? e.message : "Could not save changes");
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
        <p className="text-sm text-muted">{plan.theme}</p>
        {isCustomWeek && canCustomize && (
          <p className="text-xs text-accent/90 pt-1">
            This week has custom edits — reset the full week from Weekly overview.
          </p>
        )}
      </motion.div>

      {/* Category chips */}
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

      {canEditPlan && !showPlanEditor && (
        <button
          type="button"
          onClick={() => {
            setSaveError(null);
            setCustomizing(true);
          }}
          className="w-full rounded-xl border border-accent/40 bg-accent/10 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          Customize this workout
        </button>
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

      {/* Completed today — read-only summary + editable notes */}
      {!activeWorkout && completedLogForUi && (
        <WorkoutDayReview
          plan={plan}
          log={completedLogForUi}
          onNotesChange={(notes) =>
            updateCompletedWorkoutNotes(completedLogForUi.id, notes)
          }
        />
      )}

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

      {/* Pre-workout: plan context + start */}
      {!activeWorkout &&
        !completedLogForUi &&
        !hasPausedDraftToday &&
        !showPlanEditor && (
        <AnimatedSection className="space-y-4" delay={0.15}>
          <SurfaceCard className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Target Muscles
            </h2>
            <div className="space-y-1.5">
              {allCategories.map((cat) => (
                <div key={cat} className="flex items-start gap-2">
                  <div
                    className="mt-1 h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORIES[cat].color }}
                  />
                  <div>
                    <span className="text-sm text-foreground">
                      {CATEGORIES[cat].name}
                    </span>
                    <p className="text-xs text-muted">
                      {CATEGORIES[cat].description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <button
            type="button"
            onClick={() => startWorkout(plan)}
            className="w-full rounded-xl bg-accent py-4 text-base font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 active:scale-[0.98]"
          >
            Start Workout
          </button>
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
