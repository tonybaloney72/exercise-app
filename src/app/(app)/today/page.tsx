"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import AnimatedSection from "@/components/common/AnimatedSection";
import PlanCardSkeleton from "@/components/common/PlanCardSkeleton";
import SurfaceCard from "@/components/common/SurfaceCard";
import CategoryBadge from "@/components/common/CategoryBadge";
import WorkoutDayReview from "@/components/workout/WorkoutDayReview";
import PostWorkoutSummary from "@/components/workout/PostWorkoutSummary";
import StaleWorkoutSessionsBanner from "@/components/workout/StaleWorkoutSessionsBanner";
import TodayWorkoutPanel, {
  type TodayWorkoutPanelMode,
} from "@/components/workout/TodayWorkoutPanel";
import { isUserCustomizedWeekSource } from "@/lib/planGenerator";
import { categoriesPresentInPlan } from "@/lib/planDisplayCategories";
import { bumpTrainingWeekPlansAfterCustomSave } from "@/lib/trainingWeekCacheRefresh";
import { resetTrainingDayToGenerated } from "@/lib/trainingWeekRefresh";
import { saveCustomDayPlan } from "@/lib/trainingWeekCustomize";
import { useWeekSourceForDate } from "@/hooks/useWeekSourceForDate";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { toastSaveError } from "@/utils/saveErrorToast";
import {
  findCompletedWorkoutForDate,
  getPausedWorkoutDateForToday,
} from "@/utils/workoutLogLookup";
import { parseLocalDateKey } from "@/utils/weekCalendar";
import { useDayPlan } from "@/hooks/useDayPlan";
import type { DayPlan } from "@/types";
import AccountFeatureGate from "@/components/auth/AccountFeatureGate";
import QuickActivityLog from "@/components/workout/QuickActivityLog";
import WeightLogCard from "@/components/workout/WeightLogCard";

function formatSessionHeaderDate(dateKey: string): string {
  const d = parseLocalDateKey(dateKey);
  if (!d) return dateKey;
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function TodayPageInner() {
  const router = useRouter();
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
  const activePastSession = Boolean(
    activeWorkout && !activeWorkout.endTime && activeWorkout.date !== todayKey,
  );
  const sessionDateKey =
    activeWorkout && !activeWorkout.endTime ? activeWorkout.date : todayKey;
  const {
    plan: todayPlan,
    loading: planLoading,
    error: planError,
  } = useDayPlan(todayKey);
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
  const [showWorkoutDetails, setShowWorkoutDetails] = useState(false);
  const [workoutDetailOpen, setWorkoutDetailOpen] = useState(false);

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

  useEffect(() => {
    if (!activePastSession || !activeWorkout) return;
    router.replace(`/progress/history/${activeWorkout.date}/log`);
  }, [activePastSession, activeWorkout, router]);

  const todaysCompletedLog = useMemo(
    () => findCompletedWorkoutForDate(workoutHistory, todayKey),
    [workoutHistory, todayKey],
  );

  const completedLogForUi = devForcePreWorkout ? null : todaysCompletedLog;
  /** Any live session (in progress or editing a finished log) replaces the completion review. */
  const showTodaysCompletedReview =
    Boolean(completedLogForUi) && !activeWorkout;

  const handleEditCompletedWorkout = () => {
    if (!completedLogForUi) return;
    setShowWorkoutDetails(false);
    startEditingCompletedWorkout(completedLogForUi.id);
  };
  const pausedDraftTodayKey = useMemo(
    () => getPausedWorkoutDateForToday(workoutHistory, todayKey),
    [workoutHistory, todayKey],
  );
  const hasPausedDraftToday =
    !activeWorkout &&
    !completedLogForUi &&
    (pausedWorkoutDate === todayKey || pausedDraftTodayKey === todayKey);

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
  const weekSource = useWeekSourceForDate(canCustomize ? todayKey : "");

  useEffect(() => {
    setShowWorkoutDetails(false);
  }, [todaysCompletedLog?.id]);

  useEffect(() => {
    if (activeWorkout) {
      setShowWorkoutDetails(false);
      setCustomizing(false);
      setWorkoutDetailOpen(true);
    }
  }, [activeWorkout?.id]);

  useEffect(() => {
    if (customizing) setWorkoutDetailOpen(true);
  }, [customizing]);

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

  if (activePastSession) {
    return (
      <div className="py-12 text-center space-y-2 px-2">
        <p className="text-sm text-muted">Opening session for</p>
        <p className="text-sm font-medium text-foreground">
          {formatSessionHeaderDate(sessionDateKey)}
        </p>
      </div>
    );
  }

  const allCategories = categoriesPresentInPlan(plan);
  const isCustomWeek = isUserCustomizedWeekSource(weekSource);
  const editingCompletedSession =
    Boolean(activeWorkout?.endTime) && activeWorkout?.date === todayKey;
  const showPlanEditor = customizing && canEditPlan;
  const hideStaleBanner =
    Boolean(activeWorkout) || customizing || activePastSession;
  const isTodaySession =
    !activeWorkout ||
    activeWorkout.endTime != null ||
    activeWorkout.date === todayKey;
  const showQuickActivityLog =
    isTodaySession &&
    !customizing &&
    !showPlanEditor &&
    !activeWorkout &&
    !hasPausedDraftToday;

  const showWorkoutEntry =
    !activeWorkout && !completedLogForUi && !hasPausedDraftToday;

  const todayWorkoutPanelMode: TodayWorkoutPanelMode | null =
    activeWorkout && isTodaySession
      ? "session"
      : showPlanEditor
        ? "plan-edit"
        : showWorkoutEntry && workoutDetailOpen
          ? "preview"
          : null;

  function scrollTodayToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveDay(editedPlan: DayPlan) {
    setSaving(true);
    setSaveError(null);
    try {
      const mergedWeek = await saveCustomDayPlan(todayKey, editedPlan);
      await bumpTrainingWeekPlansAfterCustomSave(todayKey, mergedWeek);
      setCustomizing(false);
      scrollTodayToTop();
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
      await resetTrainingDayToGenerated(todayKey);
      setCustomizing(false);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Could not reset this day");
    } finally {
      setSaving(false);
    }
  }

  function handleStartWorkout() {
    if (!plan) return;
    setSaveError(null);
    setCustomizing(false);
    setWorkoutDetailOpen(true);
    scrollTodayToTop();
    startWorkout(plan);
  }

  function handleOpenWorkoutDetail() {
    setWorkoutDetailOpen(true);
    scrollTodayToTop();
  }

  function handleCollapseWorkoutDetail() {
    if (customizing || activeWorkout) return;
    setWorkoutDetailOpen(false);
    scrollTodayToTop();
  }

  return (
    <div className="py-6 space-y-5">
      {devForcePreWorkout && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Dev: pre-workout view forced (
          <code className="font-mono">?dev=start</code>
          ). Remove the query to see today&apos;s review again.
        </p>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-2xl font-bold text-foreground">{plan.name}</h1>
      </motion.div>

      {/* Category chips on today's plan (collapsed or expanded) */}
      {!completedLogForUi && !activeWorkout && !customizing && (
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
          title="Customize today's plan"
        />
      )}

      {saveError && (
        <p className="text-sm text-red-400 text-center px-2" role="alert">
          {saveError}
        </p>
      )}

      {showWorkoutEntry && !workoutDetailOpen && !customizing && (
        <button
          type="button"
          onClick={handleOpenWorkoutDetail}
          className="w-full rounded-xl bg-accent py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 active:scale-[0.98]"
        >
          View Today's Workout
        </button>
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
            onClick={() => {
              setWorkoutDetailOpen(true);
              scrollTodayToTop();
              resumeWorkout();
            }}
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

      {todayWorkoutPanelMode ? (
        <TodayWorkoutPanel
          mode={todayWorkoutPanelMode}
          plan={plan}
          todayKey={todayKey}
          isCustomWeek={isCustomWeek}
          canCustomize={canEditPlan}
          saving={saving}
          onStart={handleStartWorkout}
          onCustomize={() => {
            setSaveError(null);
            setCustomizing(true);
            scrollTodayToTop();
          }}
          onSavePlan={(edited) => void handleSaveDay(edited)}
          onCancelCustomize={() => {
            setSaveError(null);
            setCustomizing(false);
            scrollTodayToTop();
          }}
          onResetDay={() => void handleResetDay()}
          onCollapse={
            todayWorkoutPanelMode === "preview"
              ? handleCollapseWorkoutDetail
              : undefined
          }
        />
      ) : null}

      {showQuickActivityLog &&
        !showTodaysCompletedReview &&
        !workoutDetailOpen && (
          <AnimatedSection className="space-y-3" delay={0.12}>
            <QuickActivityLog plan={plan} dateKey={todayKey} />
            <WeightLogCard dateKey={todayKey} />
          </AnimatedSection>
        )}

      {/* Completed today — summary card unchanged */}
      {isTodaySession && showTodaysCompletedReview && !showWorkoutDetails && (
        <PostWorkoutSummary
          plan={plan}
          log={completedLogForUi!}
          onMoreDetails={() => setShowWorkoutDetails(true)}
          onEditWorkout={handleEditCompletedWorkout}
        />
      )}

      {isTodaySession && showTodaysCompletedReview && showWorkoutDetails && (
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
            log={completedLogForUi!}
            hideCompletionBanner
            onEditWorkout={handleEditCompletedWorkout}
            onNotesChange={(notes) =>
              updateCompletedWorkoutNotes(completedLogForUi!.id, notes)
            }
          />
        </div>
      )}

      <StaleWorkoutSessionsBanner hidden={hideStaleBanner} />

      {showQuickActivityLog && showTodaysCompletedReview && (
        <AnimatedSection className="space-y-3" delay={0.12}>
          <QuickActivityLog plan={plan} dateKey={todayKey} />
          <WeightLogCard dateKey={todayKey} />
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
