"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CategoryBadge from "@/components/common/CategoryBadge";
import { exerciseMap } from "@/data/exercises";
import { useWorkoutStore } from "@/stores/useWorkoutStore";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { getSwapCandidates } from "@/lib/exerciseSwap";
import type { ExerciseLog, ExerciseSetMode, RoundExercise } from "@/types";
import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  resolveExerciseSettings,
} from "@/utils/effectiveExerciseSettings";
import ExerciseSetCountdown from "./ExerciseSetCountdown";
import TimerTargetControls from "./TimerTargetControls";
import { formatSecondsToMMSS } from "@/utils/time";
import SwapExerciseModal from "./SwapExerciseModal";

interface ExerciseRowProps {
  roundExercise: RoundExercise;
  log: ExerciseLog;
  roundNumber: number;
  slotIndex: number;
}

export default function ExerciseRow({
  roundExercise,
  log,
  roundNumber,
  slotIndex,
}: ExerciseRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapModalKey, setSwapModalKey] = useState(0);
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const {
    toggleExercise,
    skipExercise,
    unskipExercise,
    setActualReps,
    setActualDuration,
    setTargetDuration,
    setRoundExerciseLoggingMode,
    swapRoundExercise,
    clearRoundExerciseSwap,
    shuffleRoundExercise,
  } = useWorkoutStore();

  const plannedExercise = exerciseMap[roundExercise.exerciseId];
  const effectiveId = log.swappedWith ?? roundExercise.exerciseId;
  const effectiveExercise = exerciseMap[effectiveId];
  const stored = useExerciseSettingsStore((s) => s.byExerciseId[effectiveId]);

  const roundExercises = useMemo(() => {
    const r = activeWorkout?.rounds.find(
      (x) => x.roundNumber === roundNumber,
    );
    return r?.exercises ?? [];
  }, [activeWorkout?.rounds, roundNumber]);

  const swapCandidates = useMemo(
    () =>
      getSwapCandidates(
        roundExercise.category,
        roundExercise.exerciseId,
        roundExercises,
        slotIndex,
      ),
    [roundExercise.category, roundExercise.exerciseId, roundExercises, slotIndex],
  );

  const mode: ExerciseSetMode = useMemo(() => {
    if (!plannedExercise || !effectiveExercise) return "reps";
    return (
      log.loggingMode ??
      resolveExerciseSettings(effectiveExercise, stored).defaultSetMode
    );
  }, [
    log.loggingMode,
    plannedExercise,
    effectiveExercise,
    stored,
  ]);

  const effectiveTargetSec = useMemo(() => {
    if (!effectiveExercise) return DEFAULT_TIMER_SECONDS_FALLBACK;
    const raw = log.targetDurationSeconds;
    if (raw != null && raw > 0) return Math.min(999, raw);
    const resolved = resolveExerciseSettings(effectiveExercise, stored);
    if (
      resolved.defaultSetMode === "timer" &&
      resolved.defaultTimerSeconds != null &&
      resolved.defaultTimerSeconds > 0
    ) {
      return Math.min(999, resolved.defaultTimerSeconds);
    }
    return DEFAULT_TIMER_SECONDS_FALLBACK;
  }, [log.targetDurationSeconds, effectiveExercise, stored]);

  const prescriptionLine = useMemo(() => {
    if (!plannedExercise || !effectiveExercise) return "";
    if (mode === "reps") return roundExercise.targetReps;
    return `Timer · ${effectiveTargetSec}s`;
  }, [
    plannedExercise,
    effectiveExercise,
    mode,
    roundExercise.targetReps,
    effectiveTargetSec,
  ]);

  if (!plannedExercise || !effectiveExercise) return null;

  const plannedId = roundExercise.exerciseId;

  const didLine =
    mode === "reps" && log.actualReps != null
      ? ` → did ${log.actualReps}`
      : mode === "timer" && log.actualDuration != null
        ? ` → did ${formatSecondsToMMSS(log.actualDuration) || `${log.actualDuration}s`}`
        : "";

  return (
    <div className={`transition-colors ${log.skipped ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-2 px-1">
        <button
          type="button"
          onClick={() => toggleExercise(roundNumber, plannedId)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition-all active:scale-95"
          style={{
            borderColor: log.completed ? "var(--accent)" : "var(--border-color)",
            backgroundColor: log.completed ? "var(--accent)" : "transparent",
          }}
        >
          {log.completed && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2.5 7.5L5.5 10.5L11.5 3.5" />
            </motion.svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center gap-2 min-h-[44px] py-2 text-left"
        >
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium transition-all ${
                log.completed ? "text-muted line-through" : "text-foreground"
              }`}
            >
              {effectiveExercise.name}
            </p>
            {log.swappedWith && (
              <p className="text-[10px] text-muted">
                Instead of {plannedExercise.name}
              </p>
            )}
            <p className="text-xs text-muted">
              {prescriptionLine}
              {didLine}
            </p>
          </div>
          <CategoryBadge category={effectiveExercise.category} />
        </button>

        {!log.skipped && (
          <button
            type="button"
            onClick={() => {
              setSwapModalKey((k) => k + 1);
              setSwapOpen(true);
            }}
            className="p-1.5 text-muted hover:text-foreground transition-colors shrink-0"
            title="Swap exercise"
            aria-label="Swap exercise"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 3 21 3 21 8" />
              <line x1="13" y1="11" x2="21" y2="3" />
              <polyline points="8 21 3 21 3 16" />
              <line x1="11" y1="13" x2="3" y2="21" />
            </svg>
          </button>
        )}

        {!log.completed && !log.skipped && (
          <button
            type="button"
            onClick={() => skipExercise(roundNumber, plannedId)}
            className="p-1.5 text-muted hover:text-foreground transition-colors shrink-0"
            title="Skip"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>
        )}
        {log.skipped && (
          <button
            type="button"
            onClick={() => unskipExercise(roundNumber, plannedId)}
            className="p-1.5 text-muted hover:text-foreground transition-colors shrink-0"
            title="Undo skip"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        )}
      </div>

      <SwapExerciseModal
        key={swapModalKey}
        open={swapOpen}
        plannedName={plannedExercise.name}
        candidates={swapCandidates}
        hasSwap={Boolean(log.swappedWith)}
        onClose={() => setSwapOpen(false)}
        onPick={(id) =>
          swapRoundExercise(roundNumber, slotIndex, id, roundExercise.category)
        }
        onRandom={() =>
          shuffleRoundExercise(roundNumber, slotIndex, roundExercise.category)
        }
        onClearSwap={() => clearRoundExerciseSwap(roundNumber, slotIndex)}
      />

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-10 pb-3 space-y-3">
              <p className="text-xs text-muted">{effectiveExercise.notes}</p>

              <div className="space-y-1.5">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                  This set
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setRoundExerciseLoggingMode(
                        roundNumber,
                        plannedId,
                        "reps",
                      )
                    }
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      mode === "reps"
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-surface-hover text-muted hover:text-foreground"
                    }`}
                  >
                    Reps
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRoundExerciseLoggingMode(
                        roundNumber,
                        plannedId,
                        "timer",
                      )
                    }
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      mode === "timer"
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-surface-hover text-muted hover:text-foreground"
                    }`}
                  >
                    Timer
                  </button>
                </div>
              </div>

              {mode === "reps" && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted">Actual reps:</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={log.actualReps != null ? String(log.actualReps) : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setActualReps(roundNumber, plannedId, undefined);
                      } else {
                        const num = parseInt(val, 10);
                        if (!isNaN(num)) {
                          setActualReps(roundNumber, plannedId, num);
                        }
                      }
                    }}
                    className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-accent"
                    placeholder="—"
                  />
                </div>
              )}

              {mode === "timer" && (
                <div className="space-y-3">
                  <TimerTargetControls
                    effectiveSeconds={effectiveTargetSec}
                    storedTargetSeconds={log.targetDurationSeconds}
                    onPreset={(sec) =>
                      setTargetDuration(roundNumber, plannedId, sec)
                    }
                    onCommitCustom={(sec) =>
                      setTargetDuration(roundNumber, plannedId, sec)
                    }
                  />

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted shrink-0">
                      Actual duration (optional)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={5}
                      max={999}
                      value={log.actualDuration ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") {
                          setActualDuration(roundNumber, plannedId, undefined);
                          return;
                        }
                        const n = Math.round(Number(v));
                        if (!Number.isNaN(n)) {
                          setActualDuration(roundNumber, plannedId, n);
                        }
                      }}
                      className="w-20 rounded-md border border-border bg-background px-2 py-1 font-mono text-sm text-foreground outline-none focus:border-accent"
                      placeholder="—"
                    />
                  </div>

                  <ExerciseSetCountdown
                    key={`set-cd-${effectiveTargetSec}`}
                    durationSec={effectiveTargetSec}
                    disabled={log.skipped}
                  />
                </div>
              )}

              {effectiveExercise.videoUrl && (
                <a
                  href={effectiveExercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Watch video
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
