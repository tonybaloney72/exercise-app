"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ExerciseRow from "./ExerciseRow";
import type { Round, RoundLog } from "@/types";
import { useFloatingTimerStore } from "@/stores/useFloatingTimerStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { formatTimerDisplay } from "@/utils/time";

interface RoundCardProps {
  round: Round;
  roundLog: RoundLog;
}

export default function RoundCard({ round, roundLog }: RoundCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showRestPrompt, setShowRestPrompt] = useState(false);
  const restBetweenRounds = useSettingsStore((s) => s.restBetweenRounds);
  const restTimerAutoStart = useSettingsStore((s) => s.restTimerAutoStart);

  const completedCount = roundLog.exercises.filter(
    (e) => e.completed || e.skipped
  ).length;
  const total = roundLog.exercises.length;
  const allDone = total > 0 && completedCount === total;

  // On the false→true transition for `allDone`, collapse the round and
  // kick off the rest timer. Cool-down still happens after the final round,
  // so we trigger regardless of whether this is the last round.
  const wasDoneRef = useRef(allDone);
  useEffect(() => {
    if (!allDone) {
      setShowRestPrompt(false);
    } else if (!wasDoneRef.current && allDone) {
      setIsOpen(false);
      if (restTimerAutoStart) {
        setShowRestPrompt(false);
        useFloatingTimerStore.getState().startRest(restBetweenRounds);
      } else {
        setShowRestPrompt(true);
      }
    }
    wasDoneRef.current = allDone;
  }, [allDone, restBetweenRounds, restTimerAutoStart]);

  function handleStartRest() {
    setShowRestPrompt(false);
    useFloatingTimerStore.getState().startRest(restBetweenRounds);
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Round {round.roundNumber}
          </h3>
          {allDone && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-green-400 text-xs"
            >
              ✓
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {completedCount}/{total}
          </span>
          {/* Progress bar */}
          <div className="h-1.5 w-16 rounded-full bg-border overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / total) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {!isOpen && showRestPrompt && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-t border-border px-4 py-3"
        >
          <button
            type="button"
            onClick={handleStartRest}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent/35 bg-accent/10 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/15 active:scale-[0.98]"
          >
            <span>Start rest</span>
            <span className="tabular-nums text-accent/80">
              {formatTimerDisplay(restBetweenRounds)}
            </span>
          </button>
        </motion.div>
      )}

      {/* Exercise list */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-2 py-1 space-y-0.5">
              {round.exercises.map((ex, i) => {
                const log = roundLog.exercises[i];
                if (!log) return null;
                return (
                  <ExerciseRow
                    key={`${round.roundNumber}-${ex.exerciseId}`}
                    roundExercise={ex}
                    log={log}
                    roundNumber={round.roundNumber}
                    slotIndex={i}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
