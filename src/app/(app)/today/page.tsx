"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { getTodaysPlan } from "@/data/dailyPlans";
import { CATEGORIES } from "@/data/categories";
import CategoryBadge from "@/components/common/CategoryBadge";
import WorkoutSession from "@/components/workout/WorkoutSession";
import WorkoutDayReview from "@/components/workout/WorkoutDayReview";
import FloatingTimer from "@/components/common/FloatingTimer";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { formatLocalDateKey } from "@/utils/localDateKey";
import { findWorkoutLogForDate } from "@/utils/workoutLogLookup";

function TodayPageInner() {
  const searchParams = useSearchParams();
  const {
    activeWorkout,
    workoutHistory,
    startWorkout,
    loadHistory,
    updateCompletedWorkoutNotes,
  } = useWorkoutStore();
  const mode = useAuthStore((s) => s.mode);
  const plan = useMemo(() => getTodaysPlan(), []);

  const devForcePreWorkout =
    process.env.NODE_ENV === "development" &&
    searchParams.get("dev") === "start";

  useEffect(() => {
    if (mode === "loading") return;
    loadHistory();
  }, [mode, loadHistory]);

  const todaysCompletedLog = useMemo(() => {
    const todayKey = formatLocalDateKey();
    return findWorkoutLogForDate(workoutHistory, todayKey);
  }, [workoutHistory]);

  const completedLogForUi = devForcePreWorkout ? null : todaysCompletedLog;

  const allCategories = [...plan.strengthFocus, ...plan.coreGroups];

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

      {/* Pre-workout: plan context + start */}
      {!activeWorkout && !completedLogForUi && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
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
          </div>

          <button
            type="button"
            onClick={() => startWorkout(plan)}
            className="w-full rounded-xl bg-accent py-4 text-base font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 active:scale-[0.98]"
          >
            Start Workout
          </button>
        </motion.div>
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
