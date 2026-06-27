"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AnimatedSection from "@/components/common/AnimatedSection";
import TabEnterMotion from "@/components/common/TabEnterMotion";
import TodayPageSkeleton from "@/components/common/TodayPageSkeleton";
import SurfaceCard from "@/components/common/SurfaceCard";
import CategoryBadge from "@/components/common/CategoryBadge";
import PlanMetaPill from "@/components/common/PlanMetaPill";
import WorkoutDayReview from "@/components/workout/WorkoutDayReview";
import PostWorkoutSummary from "@/components/workout/PostWorkoutSummary";
import StaleWorkoutSessionsBanner from "@/components/workout/StaleWorkoutSessionsBanner";
import TodayWorkoutPanel, {
  type TodayWorkoutPanelMode,
} from "@/components/workout/TodayWorkoutPanel";
import { isUserCustomizedWeekSource } from "@/lib/planGenerator";
import { categoriesPresentInPlan } from "@/lib/planDisplayCategories";
import { cardioBadgesForPlan, restBadgeForPlan } from "@/lib/planCardioDisplay";
import { bumpTrainingWeekPlansAfterCustomSave } from "@/adapters/bumpTrainingWeekPlansAfterCustomSave";
import { resetTrainingDayToGenerated } from "@/lib/trainingWeekRefresh";
import { saveCustomDayPlan } from "@/lib/trainingWeekCustomize";
import { useWeekSourceForDate } from "@/hooks/useWeekSourceForDate";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatLocalDateKey, parseLocalDateKey } from "@/utils/localDateKey";
import { toastSaveError } from "@/utils/saveErrorToast";
import {
  findCompletedStrengthWorkoutForDate,
  getPausedWorkoutDateForToday,
} from "@/utils/workoutLogLookup";
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

function formatTodayWeekdayName(dateKey: string): string {
  const d = parseLocalDateKey(dateKey);
  return d?.toLocaleDateString(undefined, { weekday: "long" }) ?? "Today";
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
    void reconcileDayBoundary();
  }, [mode, todayKey, reconcileDayBoundary]);

  useEffect(() => {
    if (!activePastSession || !activeWorkout) return;
    router.replace(`/progress/history/${activeWorkout.date}/log`);
  }, [activePastSession, activeWorkout, router]);

  const todaysCompletedLog = useMemo(
    () => findCompletedStrengthWorkoutForDate(workoutHistory, todayKey),
    [workoutHistory, todayKey],
  );

  const completedLogForUi = devForcePreWorkout ? null : todaysCompletedLog;
  /** Any live session (in progress or editing a finished log) replaces the completion review. */
  const showTodaysCompletedReview =
    Boolean(completedLogForUi) && !activeWorkout;

  const handleEditCompletedWorkout = () => {
    if (!completedLogForUi) return;
    setShowWorkoutDetails(false);
    scrollTodayToTop();
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
    return <TodayPageSkeleton />;
  }

  if (planError || !plan) {
    return (
      <div className="flex flex-col gap-3 px-2 py-8 text-center">
        <p className="text-sm text-foreground">
          {planError ?? "Could not load today&apos;s plan."}
        </p>
      </div>
    );
  }

  if (activePastSession) {
    return (
      <div className="flex flex-col gap-2 px-2 py-12 text-center">
        <p className="text-sm text-muted">Opening session for</p>
        <p className="text-sm font-medium text-foreground">
          {formatSessionHeaderDate(sessionDateKey)}
        </p>
      </div>
    );
  }

  const allCategories = categoriesPresentInPlan(plan);
  const restBadge = restBadgeForPlan(plan);
  const cardioBadges = cardioBadgesForPlan(plan);
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
  /** Quick cardio + body weight — hidden during workout detail, more-details review, or live session. */
  const showQuickLogsSection =
    showQuickActivityLog &&
    !showWorkoutDetails &&
    (showTodaysCompletedReview || !workoutDetailOpen);
  const showQuickLogsBeforeReview =
    showQuickLogsSection && !showTodaysCompletedReview;
  const showQuickLogsAfterReview =
    showQuickLogsSection && showTodaysCompletedReview;

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
    <div className="flex flex-col gap-5 py-6">
      {devForcePreWorkout && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Dev: pre-workout view forced (
          <code className="font-mono">?dev=start</code>
          ). Remove the query to see today&apos;s review again.
        </p>
      )}

      {/* Header */}
      <TabEnterMotion y={-10}>
        {showTodaysCompletedReview ? (
          <h1 className="flex min-w-0 flex-nowrap items-baseline gap-x-2 leading-tight">
            <span className="truncate text-2xl font-bold text-foreground">
              {formatTodayWeekdayName(todayKey)}
            </span>
            <span
              className="shrink-0 text-muted font-normal text-xl"
              aria-hidden
            >
              –
            </span>
            <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-green-400">
              Workout complete
            </span>
          </h1>
        ) : (
          <h1 className="text-2xl font-bold text-foreground">{plan.name}</h1>
        )}
      </TabEnterMotion>

      {/* Category chips on today's plan (collapsed or expanded) */}
      {!completedLogForUi && !activeWorkout && !customizing && (
        <TabEnterMotion delay={0.1} y={0} className="flex flex-wrap gap-2">
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
        </TabEnterMotion>
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
        <AnimatedSection className="flex flex-col gap-3" delay={0.15}>
          <SurfaceCard className="flex flex-col gap-2 p-4">
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

      {showQuickLogsBeforeReview ? (
        <AnimatedSection className="flex flex-col gap-3" delay={0.12}>
          <QuickActivityLog plan={plan} dateKey={todayKey} />
          <WeightLogCard dateKey={todayKey} />
        </AnimatedSection>
      ) : null}

      {/* Completed today - summary card unchanged */}
      {isTodaySession && showTodaysCompletedReview && !showWorkoutDetails && (
        <PostWorkoutSummary
          plan={plan}
          log={completedLogForUi!}
          onMoreDetails={() => {
            setShowWorkoutDetails(true);
            scrollTodayToTop();
          }}
        />
      )}

      {isTodaySession && showTodaysCompletedReview && showWorkoutDetails && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              setShowWorkoutDetails(false);
              scrollTodayToTop();
            }}
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

      {showQuickLogsAfterReview ? (
        <AnimatedSection className="flex flex-col gap-3" delay={0.12}>
          <QuickActivityLog plan={plan} dateKey={todayKey} />
          <WeightLogCard dateKey={todayKey} />
        </AnimatedSection>
      ) : null}
    </div>
  );
}

export default function TodayPage() {
  return (
    <Suspense fallback={<TodayPageSkeleton />}>
      <TodayPageInner />
    </Suspense>
  );
}
