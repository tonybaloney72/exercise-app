"use client";

import { motion } from "framer-motion";
import type { ExerciseSlotCounts } from "@/lib/workoutLogSummary";
import { completionRatio } from "@/lib/workoutLogSummary";

type WorkoutStatBarProps = {
  label: string;
  counts: ExerciseSlotCounts;
  /** Stagger bar fill animation (seconds). */
  delay?: number;
};

export default function WorkoutStatBar({
  label,
  counts,
  delay = 0,
}: WorkoutStatBarProps) {
  const { total, completed, skipped } = counts;
  const ratio = completionRatio(counts);
  const pct = Math.round(ratio * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className="space-y-1.5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {completed}/{total}
          {total > 0 && (
            <span className="ml-1 text-xs font-normal text-muted">({pct}%)</span>
          )}
        </span>
      </div>

      <div className="h-2.5 rounded-full bg-border overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-linear-to-r from-accent to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ delay: delay + 0.08, duration: 0.55, ease: "easeOut" }}
        />
      </div>

      {skipped > 0 && (
        <p className="text-sm text-muted">
          {skipped} skipped
          {total - completed - skipped > 0 &&
            ` · ${total - completed - skipped} not completed`}
        </p>
      )}
    </motion.div>
  );
}
