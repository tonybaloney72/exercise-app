"use client";

import { useEffect, useMemo } from "react";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { motion } from "framer-motion";
import { formatLocalDateKey } from "@/utils/localDateKey";

export default function ProgressPage() {
  const { workoutHistory, loadHistory } = useWorkoutStore();
  const mode = useAuthStore((s) => s.mode);

  useEffect(() => {
    if (mode === "loading") return;
    loadHistory();
  }, [mode, loadHistory]);

  const stats = useMemo(() => {
    const totalWorkouts = workoutHistory.length;

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sortedDates = [...new Set(workoutHistory.map((w) => w.date))].sort().reverse();

    for (let i = 0; i < sortedDates.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      const expectedStr = formatLocalDateKey(expected);
      if (sortedDates[i] === expectedStr) {
        currentStreak++;
      } else {
        break;
      }
    }

    const totalExercises = workoutHistory.reduce(
      (acc, w) =>
        acc +
        w.rounds.reduce(
          (a, r) => a + r.exercises.filter((e) => e.completed).length,
          0
        ),
      0
    );

    const totalJogMiles = workoutHistory.reduce(
      (acc, w) => acc + (w.jogDistance ?? 0),
      0
    );

    return { totalWorkouts, currentStreak, totalExercises, totalJogMiles };
  }, [workoutHistory]);

  const statCards = [
    { label: "Total Workouts", value: stats.totalWorkouts, icon: "💪" },
    { label: "Current Streak", value: `${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}`, icon: "🔥" },
    { label: "Exercises Done", value: stats.totalExercises, icon: "✅" },
    { label: "Miles Jogged", value: stats.totalJogMiles.toFixed(1), icon: "🏃" },
  ];

  return (
    <div className="py-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Progress</h1>
        <p className="text-sm text-muted mt-1">Track your gains over time</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-surface p-4"
          >
            <span className="text-lg">{card.icon}</span>
            <p className="mt-2 text-xl font-bold text-foreground">{card.value}</p>
            <p className="text-[11px] text-muted">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent workouts */}
      {workoutHistory.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Recent Workouts</h2>
          {workoutHistory.slice(0, 5).map((log) => {
            const exercisesDone = log.rounds.reduce(
              (a, r) => a + r.exercises.filter((e) => e.completed).length,
              0
            );
            const exercisesTotal = log.rounds.reduce(
              (a, r) => a + r.exercises.length,
              0
            );
            return (
              <div
                key={log.id}
                className="rounded-lg border border-border bg-surface px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{log.date}</p>
                  <p className="text-xs text-muted">
                    {exercisesDone}/{exercisesTotal} exercises
                    {log.jogCompleted && ` · ${log.jogDistance ?? "?"}mi jog`}
                  </p>
                </div>
                <span className="text-xs text-green-400 font-medium">✓ Done</span>
              </div>
            );
          })}
        </div>
      )}

      {workoutHistory.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 py-12 text-center">
          <p className="text-sm text-muted">No workouts logged yet.</p>
          <p className="text-xs text-muted mt-1">Complete your first workout to see progress!</p>
        </div>
      )}
    </div>
  );
}
