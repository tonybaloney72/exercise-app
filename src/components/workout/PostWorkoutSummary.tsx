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
}

function formatCardioResultLine(line: {
  skipped: boolean;
  completed: boolean;
  distanceMi?: number;
  durationSeconds?: number;
}): string {
  if (line.skipped) return "Skipped";
  if (!line.completed) return "-";
  const parts = [
    line.distanceMi != null ? `${line.distanceMi} mi` : null,
    line.durationSeconds != null
      ? formatLoggedDuration(line.durationSeconds)
      : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Logged";
}

export default function PostWorkoutSummary({
  plan,
  log,
  onMoreDetails,
}: PostWorkoutSummaryProps) {
  const summary = useMemo(() => summarizeWorkoutLog(log, plan), [log, plan]);

  const sessionTimeParts = [
    summary.startTimeLabel ? `Started ${summary.startTimeLabel}` : null,
    summary.endTimeLabel ? `Ended ${summary.endTimeLabel}` : null,
    summary.durationLabel ? summary.durationLabel : null,
  ].filter(Boolean);

  const hasSessionRows =
    summary.strength.total > 0 ||
    summary.stretches.total > 0 ||
    summary.cardio.length > 0;

  return (
    <AnimatedSection delay={0.08}>
      <SurfaceCard className="flex flex-col p-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
          Session stats
        </h3>

        {hasSessionRows ? (
          <div className="flex flex-col gap-4 py-4">
            {summary.strength.total > 0 ? (
              <WorkoutStatBar
                label="Strength exercises"
                counts={summary.strength}
                delay={0.12}
              />
            ) : null}

            {summary.stretches.total > 0 ? (
              <WorkoutStatBar
                label="Warm-up & cool-down"
                counts={summary.stretches}
                delay={0.2}
              />
            ) : null}

            {summary.cardio.map((line, i) => (
              <motion.div
                key={line.instanceKey}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 + i * 0.06, duration: 0.25 }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {line.label}
                  </span>
                  <span className="shrink-0 text-right text-sm font-semibold text-foreground">
                    {formatCardioResultLine(line)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : null}

        {sessionTimeParts.length > 0 ? (
          <p
            className={`text-xs text-muted ${
              hasSessionRows ? "border-t border-border py-4" : "py-4"
            }`}
          >
            {sessionTimeParts.join(" · ")}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onMoreDetails}
          className="w-full rounded-xl border border-border bg-surface-hover py-3 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:bg-accent/10"
        >
          More details
        </button>
      </SurfaceCard>
    </AnimatedSection>
  );
}
