"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import AnimatedSection from "@/components/common/AnimatedSection";
import SurfaceCard from "@/components/common/SurfaceCard";
import WorkoutStatBar from "@/components/workout/WorkoutStatBar";
import { formatLoggedDuration } from "@/utils/time";
import { summarizeWorkoutLog } from "@/lib/workoutLogSummary";
import type { DayPlan, WorkoutLog } from "@/types";

interface PostWorkoutSummaryProps {
  plan: DayPlan;
  log: WorkoutLog;
  onMoreDetails: () => void;
  onEditWorkout?: () => void;
}

export default function PostWorkoutSummary({
  plan,
  log,
  onMoreDetails,
  onEditWorkout,
}: PostWorkoutSummaryProps) {
  const summary = useMemo(() => summarizeWorkoutLog(log, plan), [log, plan]);

  const timeParts = [
    summary.startTimeLabel ? `Started ${summary.startTimeLabel}` : null,
    summary.endTimeLabel ? `Ended ${summary.endTimeLabel}` : null,
    summary.durationLabel ? summary.durationLabel : null,
  ].filter(Boolean);

  const strengthDone =
    summary.strength.total > 0 &&
    summary.strength.completed === summary.strength.total;
  const allStrengthAddressed =
    summary.strength.total > 0 &&
    summary.strength.completed + summary.strength.skipped ===
      summary.strength.total;

  return (
    <AnimatedSection className="space-y-4" delay={0.08}>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
      >
        <SurfaceCard className="p-5 border-green-500/25 bg-green-500/5 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-green-400">
            Workout complete
          </p>
          <h2 className="text-xl font-bold text-foreground">
            {strengthDone
              ? "You crushed it"
              : allStrengthAddressed
                ? "Nice work today"
                : "Session saved"}
          </h2>
          {timeParts.length > 0 && (
            <p className="text-sm text-muted pt-0.5">{timeParts.join(" · ")}</p>
          )}
        </SurfaceCard>
      </motion.div>

      <SurfaceCard className="p-4 space-y-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
          Session stats
        </h3>

        {summary.strength.total > 0 && (
          <WorkoutStatBar
            label="Strength exercises"
            counts={summary.strength}
            delay={0.12}
          />
        )}

        {summary.stretches.total > 0 && (
          <WorkoutStatBar
            label="Warm-up & cool-down"
            counts={summary.stretches}
            delay={0.2}
          />
        )}

        {summary.cardio.map((line, i) => (
          <motion.div
            key={line.instanceKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 + i * 0.06, duration: 0.25 }}
            className="space-y-1.5 pt-1 border-t border-border"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{line.label}</span>
              <span className="text-sm font-semibold text-foreground">
                {line.skipped ? "Skipped" : line.completed ? "Done" : "—"}
              </span>
            </div>
            {line.completed && !line.skipped && (
              <p className="text-[11px] text-muted">
                {[
                  line.distanceMi != null ? `${line.distanceMi} mi` : null,
                  line.durationSeconds != null
                    ? formatLoggedDuration(line.durationSeconds)
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Logged complete"}
              </p>
            )}
          </motion.div>
        ))}
      </SurfaceCard>

      <div className="flex flex-col gap-2 sm:flex-row">
        {onEditWorkout ? (
          <button
            type="button"
            onClick={onEditWorkout}
            className="flex-1 rounded-xl bg-accent py-3.5 text-sm font-semibold text-white shadow-md shadow-accent/20 transition-colors hover:bg-accent/90"
          >
            Edit workout
          </button>
        ) : null}
        <button
          type="button"
          onClick={onMoreDetails}
          className={`rounded-xl border border-border bg-surface py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:bg-surface-hover ${
            onEditWorkout ? "flex-1" : "w-full"
          }`}
        >
          More details
        </button>
      </div>
    </AnimatedSection>
  );
}
