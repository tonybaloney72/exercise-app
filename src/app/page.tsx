"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { getTodaysPlan } from "@/data/dailyPlans";
import { CATEGORIES } from "@/data/categories";
import CategoryBadge from "@/components/common/CategoryBadge";
import WorkoutSession from "@/components/workout/WorkoutSession";
import RestTimer from "@/components/common/RestTimer";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

export default function TodayPage() {
  const { activeWorkout, startWorkout, loadHistory } = useWorkoutStore();
  const { loadSettings } = useSettingsStore();
  const plan = useMemo(() => getTodaysPlan(), []);

  useEffect(() => {
    loadHistory();
    loadSettings();
  }, [loadHistory, loadSettings]);

  const allCategories = [
    ...plan.strengthFocus,
    ...plan.coreGroups,
  ];

  return (
    <div className="py-6 space-y-5">
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

      {/* Day info card (when no active workout) */}
      {!activeWorkout && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          {/* Day structure overview */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Workout Structure
            </h2>
            <div className="space-y-2 text-sm text-muted">
              {plan.hasJog && (
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 text-xs">1</span>
                  <span>Warm-up stretches (5–10 min)</span>
                </div>
              )}
              {plan.hasJog && (
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 text-xs">2</span>
                  <span>Jog</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs">
                  {plan.hasJog ? "3" : "1"}
                </span>
                <span>{plan.rounds.length} round{plan.rounds.length > 1 ? "s" : ""} of exercises</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20 text-xs">
                  {plan.hasJog ? "4" : "2"}
                </span>
                <span>Cool-down stretches (5–10 min)</span>
              </div>
            </div>
          </div>

          {/* Target muscles */}
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
                    <span className="text-sm text-foreground">{CATEGORIES[cat].name}</span>
                    <p className="text-xs text-muted">{CATEGORIES[cat].description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Start button */}
          <button
            onClick={() => startWorkout(plan)}
            className="w-full rounded-xl bg-accent py-4 text-base font-bold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90 active:scale-[0.98]"
          >
            Start Workout
          </button>
        </motion.div>
      )}

      {/* Active workout session */}
      {activeWorkout && <WorkoutSession plan={plan} />}
      {activeWorkout && <RestTimer />}
    </div>
  );
}
