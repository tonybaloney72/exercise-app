"use client";

import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import AnimatedSection from "@/components/common/AnimatedSection";
import EmptyState from "@/components/common/EmptyState";
import PlanCardSkeleton from "@/components/common/PlanCardSkeleton";
import SurfaceCard from "@/components/common/SurfaceCard";
import CategoryBadge from "@/components/common/CategoryBadge";
import { isUserCustomizedWeekSource } from "@/lib/planGenerator";
import { cardioBadgesForPlan, restBadgeForPlan } from "@/lib/planCardioDisplay";
import { resetTrainingWeekToGenerated } from "@/lib/trainingWeekRefresh";
import { getWeekSourceForDate } from "@/lib/trainingWeekCustomize";
import { useTrainingWeekPlans } from "@/hooks/useTrainingWeekPlans";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useAuthStore } from "@/stores/useAuthStore";
import AccountFeatureGate from "@/components/auth/AccountFeatureGate";
import {
  categoriesPresentInPlan,
  planDaySubtitle,
} from "@/lib/planDisplayCategories";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { findCompletedWorkoutForDate } from "@/utils/workoutLogLookup";
import {
  countRoundExerciseSlots,
} from "@/utils/workoutLogCounts";

const DAY_ABBRS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Same Sun–Sat order as the week strip and `weekDates`. */
const OVERVIEW_DOW_ORDER = [0, 1, 2, 3, 4, 5, 6] as const;

export default function WeeklyPage() {
  const { workoutHistory, loadHistory } = useWorkoutStore();
  const mode = useAuthStore((s) => s.mode);
  const todayKey = formatLocalDateKey();
  const [weekSource, setWeekSource] = useState<string | null>(null);
  const [resettingWeek, setResettingWeek] = useState(false);
  const [resetWeekConfirm, setResetWeekConfirm] = useState(false);
  const [resetWeekError, setResetWeekError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "loading") return;
    loadHistory();
  }, [mode, loadHistory]);

  useEffect(() => {
    if (mode !== "authenticated") {
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
  }, [mode, todayKey]);

  const programMode = useSettingsStore((s) => s.programMode);
  const isCustomWeek =
    programMode === "custom" || isUserCustomizedWeekSource(weekSource);

  async function handleResetWeek() {
    setResettingWeek(true);
    setResetWeekError(null);
    try {
      await resetTrainingWeekToGenerated(todayKey);
      setResetWeekConfirm(false);
      const source = await getWeekSourceForDate(todayKey);
      setWeekSource(source);
    } catch (e: unknown) {
      setResetWeekError(
        e instanceof Error ? e.message : "Could not reset training week",
      );
    } finally {
      setResettingWeek(false);
    }
  }

  const today = new Date().getDay();

  const weekDates = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - dayOfWeek + i);
      return d;
    });
  }, []);

  const trainingPriorityPreset = useSettingsStore(
    (s) => s.trainingPriorityPreset,
  );
  const trainingPriorityScores = useSettingsStore(
    (s) => s.trainingPriorityScores,
  );
  const trainingPriorityCustomized = useSettingsStore(
    (s) => s.trainingPriorityCustomized,
  );
  const { weekByDow, loading: weekLoading, error: weekError } =
    useTrainingWeekPlans(weekDates);

  const weekDateKeys = useMemo(
    () => weekDates.map((d) => formatLocalDateKey(d)),
    [weekDates],
  );

  const completedDates = useMemo(() => {
    const set = new Set<string>();
    for (const key of weekDateKeys) {
      if (findCompletedWorkoutForDate(workoutHistory, key)) set.add(key);
    }
    return set;
  }, [workoutHistory, weekDateKeys]);

  return (
    <div className="py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Weekly Overview</h1>
        <p className="text-sm text-muted mt-1">Your training week at a glance</p>
      </div>

      {weekError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-foreground">
          {weekError}
        </p>
      )}

      {mode === "guest" && !weekLoading && (
        <p className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted leading-relaxed">
          <span className="font-medium text-foreground">Guest mode: </span>
          This week is generated for this device only and won&apos;t sync. Sign in
          to save a custom week and customize individual days.
        </p>
      )}

      {mode === "guest" && !weekLoading && (
        <AccountFeatureGate feature="customWeek" />
      )}

      {/* Week strip */}
      <div className="flex gap-2">
        {weekDates.map((date, i) => {
          const dateStr = formatLocalDateKey(date);
          const isToday = i === today;
          const isCompleted = completedDates.has(dateStr);
          const isPast = i < today;

          return (
            <Link
              key={i}
              href={`/weekly/day/${dateStr}`}
              className={`flex-1 flex flex-col items-center gap-1 rounded-xl py-2.5 border transition-colors hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                isToday
                  ? "border-accent bg-accent/10"
                  : isCompleted
                  ? "border-green-500/30 bg-green-500/5"
                  : isPast
                  ? "border-border bg-surface opacity-50"
                  : "border-border bg-surface"
              }`}
            >
              <span className={`text-[10px] font-medium ${isToday ? "text-accent" : "text-muted"}`}>
                {DAY_ABBRS[i]}
              </span>
              <span className={`text-sm font-bold ${isToday ? "text-accent" : "text-foreground"}`}>
                {date.getDate()}
              </span>
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="h-1.5 w-1.5 rounded-full bg-green-400"
                />
              )}
              {!isCompleted && isPast && (
                <div className="h-1.5 w-1.5 rounded-full bg-border" />
              )}
            </Link>
          );
        })}
      </div>

      {!weekLoading && completedDates.size === 0 && (
        <SurfaceCard className="border-dashed bg-surface/50 py-8">
          <EmptyState
            icon="📅"
            title="No workouts completed this week yet."
            description="Finish a session on Today and it will show up here."
            action={{ label: "Go to Today", href: "/today" }}
          />
        </SurfaceCard>
      )}

      {mode === "authenticated" && isCustomWeek && !weekLoading && (
        <SurfaceCard className="border-accent/40 bg-accent/10 p-4">
          <h2 className="text-sm font-semibold text-foreground">Custom week builder</h2>
          <p className="mt-1 text-xs text-muted leading-snug">
            Walk through Sun–Sat and add rounds, exercises, and stretches for each day.
          </p>
          <Link
            href="/weekly/build"
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-accent py-3 text-sm font-semibold text-white hover:bg-accent/90"
          >
            Open week builder
          </Link>
        </SurfaceCard>
      )}

      {/* Daily plans */}
      <div className="space-y-3">
        {weekLoading &&
          OVERVIEW_DOW_ORDER.map((dow) => <PlanCardSkeleton key={dow} />)}

        {!weekLoading &&
          OVERVIEW_DOW_ORDER.map((dow) => {
            const plan = weekByDow?.[dow];
            if (!plan) return null;
            const isToday = plan.dayOfWeek === today;
            const dateStr = weekDates[plan.dayOfWeek]
              ? formatLocalDateKey(weekDates[plan.dayOfWeek])
              : undefined;
            const isCompleted = dateStr ? completedDates.has(dateStr) : false;
            const completedLog =
              dateStr && isCompleted
                ? findCompletedWorkoutForDate(workoutHistory, dateStr)
                : null;
            const planExerciseCount = plan.rounds.reduce(
              (a, r) => a + r.exercises.length,
              0,
            );
            const loggedExerciseCount = completedLog
              ? countRoundExerciseSlots(completedLog)
              : null;

            return (
              <AnimatedSection
                key={plan.dayOfWeek}
                delay={plan.dayOfWeek * 0.03}
              >
                <Link
                  href={dateStr ? `/weekly/day/${dateStr}` : "/weekly"}
                  className={`block rounded-xl border p-4 transition-colors hover:border-accent/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    isToday
                      ? "border-accent/50 bg-accent/5"
                      : "border-border bg-surface"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-sm font-semibold ${isToday ? "text-accent" : "text-foreground"}`}
                        >
                          {plan.name}
                        </h3>
                        {isToday && (
                          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent">
                            Today
                          </span>
                        )}
                        {isCompleted && (
                          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400">
                            Done
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {planDaySubtitle(plan, trainingPriorityPreset, {
                          preferMaterialized: isCustomWeek,
                          customized: trainingPriorityCustomized,
                          scores: trainingPriorityScores,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {categoriesPresentInPlan(plan).map((cat) => (
                      <CategoryBadge key={cat} category={cat} />
                    ))}
                    {restBadgeForPlan(plan) ? (
                      <span className="inline-flex items-center rounded-full bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted">
                        {restBadgeForPlan(plan)}
                      </span>
                    ) : null}
                    {cardioBadgesForPlan(plan).map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-medium text-sky-400"
                      >
                        {label}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2 text-[10px] text-muted">
                    {completedLog ? (
                      <>
                        {completedLog.rounds.length} round
                        {completedLog.rounds.length !== 1 ? "s" : ""} ·{" "}
                        {loggedExerciseCount} logged
                        {loggedExerciseCount !== planExerciseCount ? (
                          <span className="text-muted/80">
                            {" "}
                            (plan had {planExerciseCount})
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {plan.rounds.length} round
                        {plan.rounds.length !== 1 ? "s" : ""} · {planExerciseCount}{" "}
                        exercises
                      </>
                    )}
                  </div>
                </Link>
              </AnimatedSection>
            );
          })}
      </div>

      {mode === "authenticated" && isCustomWeek && (
        <AnimatedSection delay={0.12}>
          <SurfaceCard className="p-4 space-y-2">
            <h2 className="text-sm font-semibold text-foreground">
              Reset training week
            </h2>
            <p className="text-xs text-muted">
              Regenerate Sun–Sat from your current settings and remove all custom
              workout edits for this week. Finished workout logs are unchanged.
            </p>
            {resetWeekError && (
              <p className="text-sm text-red-400" role="alert">
                {resetWeekError}
              </p>
            )}
            {resetWeekConfirm ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={resettingWeek}
                  onClick={() => void handleResetWeek()}
                  className="rounded-lg bg-red-600/90 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {resettingWeek ? "Resetting…" : "Yes, reset entire week"}
                </button>
                <button
                  type="button"
                  disabled={resettingWeek}
                  onClick={() => {
                    setResetWeekConfirm(false);
                    setResetWeekError(null);
                  }}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={resettingWeek}
                onClick={() => {
                  setResetWeekError(null);
                  setResetWeekConfirm(true);
                }}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover disabled:opacity-50"
              >
                Reset week to auto-generated
              </button>
            )}
          </SurfaceCard>
        </AnimatedSection>
      )}
    </div>
  );
}
