"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CompletionCheckmark from "@/components/common/CompletionCheckmark";
import { exerciseMap } from "@/core/catalog";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { getStretchSwapCandidates } from "@/lib/stretchSwap";
import { vibrateOnExerciseComplete } from "@/utils/hapticFeedback";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import WorkoutRowMetaLine from "./WorkoutRowMetaLine";
import type { WorkoutRowMenuItem } from "./WorkoutRowOverflowMenu";
import SwapExerciseModal from "./SwapExerciseModal";
import type { ExerciseLog, ExerciseSetMode, StretchEntry } from "@/types";
import { exerciseVideoLinkLabel } from "@/lib/exerciseVideoLink";
import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  resolveExerciseSettings,
  resolveStretchTimerTargetSeconds,
} from "@/utils/effectiveExerciseSettings";
import { formatLoggedDuration } from "@/utils/time";
import TimerTargetControls from "./TimerTargetControls";

interface StretchSectionProps {
  title: string;
  stretchCategory: "SW" | "SC";
  stretches: StretchEntry[];
  exerciseLogs: ExerciseLog[];
  onToggle: (exerciseId: string) => void;
  onSkip: (exerciseId: string) => void;
  onUnskip: (exerciseId: string) => void;
  onSwap?: (fromExerciseId: string, toExerciseId: string) => void;
  onSetTargetDuration: (exerciseId: string, seconds: number) => void;
  onSetActualDuration: (
    exerciseId: string,
    seconds: number | undefined,
  ) => void;
  onAddStretch?: () => void;
  onRemoveStretch?: (exerciseId: string) => void;
}

export default function StretchSection({
  title,
  stretches,
  exerciseLogs,
  stretchCategory,
  onToggle,
  onSkip,
  onUnskip,
  onSwap,
  onSetTargetDuration,
  onSetActualDuration,
  onAddStretch,
  onRemoveStretch,
}: StretchSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const usedStretchIds = useMemo(
    () => new Set(stretches.map((s) => s.exerciseId)),
    [stretches],
  );

  const completedCount = exerciseLogs.filter(
    (e) => e.completed || e.skipped,
  ).length;
  const total = exerciseLogs.length;
  const allDone = completedCount === total && total > 0;

  return (
    <motion.div layout className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex w-full items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
        >
          <motion.div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {allDone && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-green-400 text-xs"
              >
                ✓
              </motion.span>
            )}
          </motion.div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-muted">
              {completedCount}/{total}
            </span>
            <motion.div className="h-1.5 w-16 rounded-full bg-border overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={{ width: 0 }}
                animate={{
                  width: `${total > 0 ? (completedCount / total) * 100 : 0}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
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
              aria-hidden
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>
        {onAddStretch ? (
          <button
            type="button"
            onClick={onAddStretch}
            className="shrink-0 rounded-md border border-border px-2 py-0.5 text-caption font-medium text-foreground hover:bg-surface-hover"
          >
            + Add
          </button>
        ) : null}
      </div>

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
              {stretches.map((stretch) => {
                const log = exerciseLogs.find(
                  (e) => e.exerciseId === stretch.exerciseId,
                );
                const exercise = exerciseMap[stretch.exerciseId];
                if (!exercise || !log) return null;

                return (
                  <StretchRow
                    key={stretch.exerciseId}
                    exerciseId={stretch.exerciseId}
                    targetReps={stretch.targetReps}
                    log={log}
                    onToggle={() => {
                      if (!log.completed && !log.skipped) {
                        vibrateOnExerciseComplete();
                      }
                      onToggle(stretch.exerciseId);
                    }}
                    onSkip={() => onSkip(stretch.exerciseId)}
                    onUnskip={() => onUnskip(stretch.exerciseId)}
                    onSwap={onSwap}
                    stretchCategory={stretchCategory}
                    usedStretchIds={usedStretchIds}
                    onSetTargetDuration={(sec) =>
                      onSetTargetDuration(stretch.exerciseId, sec)
                    }
                    onSetActualDuration={(sec) =>
                      onSetActualDuration(stretch.exerciseId, sec)
                    }
                    onRemoveFromWorkout={
                      onRemoveStretch
                        ? () => onRemoveStretch(stretch.exerciseId)
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface StretchRowProps {
  exerciseId: string;
  targetReps: string;
  log: ExerciseLog;
  stretchCategory: "SW" | "SC";
  usedStretchIds: ReadonlySet<string>;
  onToggle: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  onSwap?: (fromExerciseId: string, toExerciseId: string) => void;
  onSetTargetDuration: (seconds: number) => void;
  onSetActualDuration: (seconds: number | undefined) => void;
  onRemoveFromWorkout?: () => void;
}

function StretchRow({
  exerciseId,
  targetReps,
  log,
  stretchCategory,
  usedStretchIds,
  onToggle,
  onSkip,
  onUnskip,
  onSwap,
  onSetTargetDuration,
  onSetActualDuration,
  onRemoveFromWorkout,
}: StretchRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapModalKey, setSwapModalKey] = useState(0);
  const exercise = exerciseMap[exerciseId];
  const stored = useExerciseSettingsStore((s) => s.byExerciseId[exerciseId]);
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const preferenceMap = useExercisePreferencesStore((s) => s.byExerciseId);
  const swapCandidates = useMemo(
    () =>
      onSwap
        ? getStretchSwapCandidates({
            category: stretchCategory,
            currentExerciseId: exerciseId,
            usedExerciseIds: usedStretchIds,
            availableEquipment,
            dislikedExerciseIds: collectDislikedIds(preferenceMap),
          })
        : [],
    [
      onSwap,
      stretchCategory,
      exerciseId,
      usedStretchIds,
      availableEquipment,
      preferenceMap,
    ],
  );

  const mode: ExerciseSetMode = useMemo(() => {
    if (!exercise) return "reps";
    return (
      log.loggingMode ??
      resolveExerciseSettings(exercise, stored).defaultSetMode
    );
  }, [log.loggingMode, exercise, stored]);

  const effectiveTargetSec = useMemo(() => {
    if (!exercise || mode !== "timer") return DEFAULT_TIMER_SECONDS_FALLBACK;
    return resolveStretchTimerTargetSeconds(
      exercise,
      stored,
      log.targetDurationSeconds,
      targetReps,
    );
  }, [exercise, mode, stored, log.targetDurationSeconds, targetReps]);

  const prescriptionLine = useMemo(() => {
    if (!exercise) return targetReps;
    if (mode === "timer") return `Timer · ${effectiveTargetSec}s`;
    const r = resolveExerciseSettings(exercise, stored);
    return r.defaultTargetReps != null
      ? String(r.defaultTargetReps)
      : targetReps;
  }, [exercise, mode, targetReps, effectiveTargetSec, stored]);

  const didLine =
    mode === "timer" && log.actualDuration != null
      ? ` → did ${formatLoggedDuration(log.actualDuration)}`
      : "";

  if (!exercise) return null;

  const overflowItems: WorkoutRowMenuItem[] = [];
  if (onSwap && !log.skipped) {
    overflowItems.push({
      label: "Swap stretch",
      onClick: () => {
        setSwapModalKey((k) => k + 1);
        setSwapOpen(true);
      },
    });
  }
  if (!log.completed && !log.skipped) {
    overflowItems.push({
      label: "Skip",
      onClick: onSkip,
    });
  }
  if (log.skipped) {
    overflowItems.push({
      label: "Undo skip",
      onClick: onUnskip,
    });
  }
  if (onRemoveFromWorkout) {
    overflowItems.push({
      label: "Remove from workout",
      onClick: onRemoveFromWorkout,
    });
  }

  const showTimerPill =
    mode === "timer" && !log.completed && !log.skipped;
  const detailText = showTimerPill
    ? didLine.replace(/^\s*→\s*/, "").trim() || null
    : `${prescriptionLine}${didLine}`.trim() || null;

  return (
    <div className={`transition-colors ${log.skipped ? "opacity-40" : ""}`}>
      {onSwap ? (
        <SwapExerciseModal
          key={swapModalKey}
          open={swapOpen}
          plannedName={exercise?.name ?? exerciseId}
          candidates={swapCandidates}
          hasSwap={false}
          onClose={() => setSwapOpen(false)}
          onPick={(id) => onSwap(exerciseId, id)}
          onClearSwap={() => {}}
        />
      ) : null}
      <div className="flex items-start gap-2 px-1">
        <button
          type="button"
          onClick={onToggle}
          className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition-all active:scale-95"
          style={{
            borderColor: log.completed ? "var(--accent)" : "var(--border-color)",
            backgroundColor: log.completed ? "var(--accent)" : "transparent",
          }}
        >
          {log.completed ? <CompletionCheckmark /> : null}
        </button>

        <WorkoutRowMetaLine
          name={exercise.name}
          nameClassName={
            log.completed || log.skipped
              ? "text-muted line-through"
              : "text-foreground"
          }
          onNameClick={() => setExpanded(!expanded)}
          expanded={expanded}
          onToggleExpand={() => setExpanded(!expanded)}
          menuItems={overflowItems}
          detailText={detailText}
          showTimerPill={showTimerPill}
          timerSeconds={effectiveTargetSec}
          timerTitle={`Start stretch timer (${effectiveTargetSec}s)`}
        />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <motion.div className="px-10 pb-3 space-y-3">
              <p className="text-xs text-muted">{exercise.notes}</p>

              {mode === "timer" && (
                <TimerTargetControls
                  effectiveSeconds={effectiveTargetSec}
                  storedTargetSeconds={log.targetDurationSeconds}
                  onPreset={onSetTargetDuration}
                  onCommitCustom={onSetTargetDuration}
                />
              )}

              {mode === "timer" && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted shrink-0">
                    Actual duration (optional)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={
                      log.actualDuration != null
                        ? String(log.actualDuration)
                        : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      if (v === "") {
                        onSetActualDuration(undefined);
                        return;
                      }
                      if (!/^\d+$/.test(v)) return;
                      const n = parseInt(v, 10);
                      if (!Number.isNaN(n)) {
                        onSetActualDuration(n);
                      }
                    }}
                    placeholder={String(effectiveTargetSec)}
                    className="w-20 rounded-md border border-border bg-background px-2 py-1 font-mono text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
              )}

              {exercise.videoUrl && (
                <a
                  href={exercise.videoUrl}
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
                    aria-hidden
                  >
                    {exerciseVideoLinkLabel(exercise.videoUrl) === "Watch video" ? (
                      <polygon points="5 3 19 12 5 21 5 3" />
                    ) : (
                      <>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </>
                    )}
                  </svg>
                  {exerciseVideoLinkLabel(exercise.videoUrl)}
                </a>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
