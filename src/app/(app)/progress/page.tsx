"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useTrainingWeekRefreshStore } from "@/stores/useTrainingWeekRefreshStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { motion } from "framer-motion";
import { resolveTrainingWeekForAuth } from "@/lib/planResolver";
import type { TrainingWeekDays } from "@/lib/repos";
import { formatLocalDateKey } from "@/utils/localDateKey";
import ProgressChartsSection from "@/components/progress/ProgressChartsSection";
import ExerciseProgressChart from "@/components/progress/ExerciseProgressChart";
import CardioProgressSection from "@/components/progress/CardioProgressSection";
import {
  buildCardioMilesTotals,
  formatCardioRecentLine,
} from "@/lib/resolveWorkoutCardio";
import {
  CARDIO_ACTIVITY_ORDER,
  CARDIO_KIND_TO_EXERCISE_ID,
  CARDIO_ACTIVITY_LABELS,
  CARDIO_ACTIVITY_EMOJI,
} from "@/lib/cardioActivities";
import EmptyState from "@/components/common/EmptyState";
import SurfaceCard, { surfaceCardClassName } from "@/components/common/SurfaceCard";
import { weekToDatePlanAdherence } from "@/utils/progressStats";

export default function ProgressPage() {
  const { workoutHistory, loadHistory } = useWorkoutStore();
  const mode = useAuthStore((s) => s.mode);
  const planRevision = useTrainingWeekRefreshStore((s) => s.planRevision);
  const equipmentKey = useSettingsStore((s) => s.availableEquipment.join(","));
  const programProfileKey = useSettingsStore(
    (s) => `${s.trainingPriorityPreset}:${s.roundDensity}`,
  );
  const [weekByDow, setWeekByDow] = useState<TrainingWeekDays | null>(null);

  useEffect(() => {
    if (mode === "loading") return;
    loadHistory();
  }, [mode, loadHistory]);

  useEffect(() => {
    if (mode === "loading") return;
    const todayKey = formatLocalDateKey(new Date());
    let cancelled = false;
    void resolveTrainingWeekForAuth(todayKey, mode).then(
      (w) => {
        if (!cancelled) setWeekByDow(w);
      },
      (e: unknown) => {
        console.error("[ProgressPage] resolveTrainingWeekForAuth", e);
        if (!cancelled) setWeekByDow(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [mode, planRevision, equipmentKey, programProfileKey]);

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

    const cardioMiles = buildCardioMilesTotals(workoutHistory);
    const weekPlan = weekToDatePlanAdherence(workoutHistory, weekByDow);

    return { totalWorkouts, currentStreak, cardioMiles, weekPlan };
  }, [workoutHistory, weekByDow]);

  const statCards = useMemo(() => {
    const base = [
      { label: "Total Workouts", value: String(stats.totalWorkouts), icon: "💪" },
      {
        label: "Current Streak",
        value: `${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}`,
        icon: "🔥",
      },
      {
        label: `Completed / planned (so far) · ${stats.weekPlan.spanShort}`,
        value: `${stats.weekPlan.completed} / ${stats.weekPlan.planned}`,
        icon: "✅",
      },
    ];

    const cardioStats = CARDIO_ACTIVITY_ORDER.flatMap((kind) => {
      const id = CARDIO_KIND_TO_EXERCISE_ID[kind];
      const bucket = stats.cardioMiles[id];
      if (!bucket || (bucket.totalMiles <= 0 && bucket.sessionCount === 0)) {
        return [];
      }
      if (bucket.totalMiles <= 0) return [];
      return [
        {
          label: `Miles ${CARDIO_ACTIVITY_LABELS[kind]}`,
          value: bucket.totalMiles.toFixed(1),
          icon: CARDIO_ACTIVITY_EMOJI[kind],
        },
      ];
    });

    return [...base, ...cardioStats];
  }, [stats]);

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
            className={`${surfaceCardClassName} p-4`}
          >
            <span className="text-lg">{card.icon}</span>
            <p className="mt-2 text-xl font-bold tabular-nums text-foreground">
              {card.value}
            </p>
            <p className="text-[11px] leading-snug text-muted">{card.label}</p>
          </motion.div>
        ))}
      </div>

      <ProgressChartsSection history={workoutHistory} />

      <ExerciseProgressChart history={workoutHistory} />

      <CardioProgressSection history={workoutHistory} />

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
            const cardioLine = formatCardioRecentLine(log);
            return (
              <div
                key={log.id}
                className="rounded-lg border border-border bg-surface px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{log.date}</p>
                  <p className="text-xs text-muted">
                    {exercisesDone}/{exercisesTotal} exercises
                    {cardioLine ? ` · ${cardioLine}` : ""}
                  </p>
                </div>
                <span className="text-xs text-green-400 font-medium">✓ Done</span>
              </div>
            );
          })}
        </div>
      )}

      {workoutHistory.length === 0 && (
        <SurfaceCard className="border-dashed bg-surface/50 py-12">
          <EmptyState
            icon="📈"
            title="No workouts logged yet."
            description="Complete your first workout to see trends and history here."
            action={{ label: "Start today's workout", href: "/today" }}
          />
        </SurfaceCard>
      )}
    </div>
  );
}
