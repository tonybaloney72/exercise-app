"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WorkoutCompletionCheckbox from "@/components/workout/WorkoutCompletionCheckbox";
import { exerciseMap } from "@/core/catalog";
import { collectDislikedIds } from "@/lib/exerciseCandidates";
import { getStretchSwapCandidates } from "@/lib/stretchSwap";
import { vibrateOnExerciseComplete } from "@/utils/hapticFeedback";
import { useExercisePreferencesStore } from "@/stores/useExercisePreferencesStore";
import { useExerciseSettingsStore } from "@/stores/useExerciseSettingsStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import WorkoutRowMetaLine from "./WorkoutRowMetaLine";
import SetTimerPill from "./SetTimerPill";
import type { WorkoutRowMenuItem } from "./WorkoutRowOverflowMenu";
import {
  MenuIconDislike,
  MenuIconRemove,
  MenuIconReport,
  MenuIconSkip,
  MenuIconStar,
  MenuIconSwap,
  MenuIconUndoSkip,
} from "./WorkoutRowMenuIcons";
import ExerciseReportSheet from "@/components/feedback/ExerciseReportSheet";
import SwapExerciseModal from "./SwapExerciseModal";
import ExerciseDetailSheet from "./ExerciseDetailSheet";
import type { ExerciseLog, ExerciseSetMode, StretchEntry } from "@/types";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  DEFAULT_TIMER_SECONDS_FALLBACK,
  parseRepTargetHint,
  resolveExerciseSettings,
  resolveStretchTimerTargetSeconds,
} from "@/utils/effectiveExerciseSettings";
import { formatLoggedDuration } from "@/utils/time";

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
  onSetActualReps: (
    exerciseId: string,
    reps: number | undefined,
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
  onSetActualReps,
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

  const wasDoneRef = useRef(allDone);
  useEffect(() => {
    if (allDone && !wasDoneRef.current) {
      setIsOpen(false);
    }
    wasDoneRef.current = allDone;
  }, [allDone]);

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
            <div className="flex flex-col border-t border-border px-2 py-1 gap-0.5">
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
                    onSetActualReps={(reps) =>
                      onSetActualReps(stretch.exerciseId, reps)
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
  onSetActualReps: (reps: number | undefined) => void;
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
  onSetActualReps,
  onRemoveFromWorkout,
}: StretchRowProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapModalKey, setSwapModalKey] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const exercise = exerciseMap[exerciseId];
  const stored = useExerciseSettingsStore((s) => s.byExerciseId[exerciseId]);
  const availableEquipment = useSettingsStore((s) => s.availableEquipment);
  const authMode = useAuthStore((s) => s.mode);
  const preferenceMap = useExercisePreferencesStore((s) => s.byExerciseId);
  const setPreference = useExercisePreferencesStore((s) => s.setPreference);
  const exercisePreference = preferenceMap[exerciseId];
  const swapCandidates = useMemo(
    () =>
      onSwap
        ? getStretchSwapCandidates({
            section: stretchCategory === "SC" ? "coolDown" : "warmUp",
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
    mode === "reps" && log.actualReps != null
      ? ` → did ${log.actualReps}`
      : mode === "timer" && log.actualDuration != null
        ? ` → did ${formatLoggedDuration(log.actualDuration)}`
        : "";

  const repsPlaceholder = useMemo(() => {
    if (!exercise || mode !== "reps") return "-";
    const r = resolveExerciseSettings(exercise, stored);
    if (r.defaultTargetReps != null) return String(r.defaultTargetReps);
    const hint = parseRepTargetHint(targetReps);
    return hint != null ? String(hint) : "-";
  }, [exercise, mode, stored, targetReps]);

  if (!exercise) return null;

  const overflowItems: WorkoutRowMenuItem[] = [];
  if (authMode === "authenticated") {
    const isFavorite = exercisePreference === "favorite";
    const isDisliked = exercisePreference === "disliked";
    overflowItems.push({
      label: isFavorite ? "Remove favorite" : "Favorite",
      icon: <MenuIconStar filled={isFavorite} />,
      onClick: () =>
        void setPreference(exerciseId, isFavorite ? null : "favorite", {
          refreshGeneratedWeek: false,
        }),
    });
    overflowItems.push({
      label: isDisliked ? "Remove dislike" : "Dislike",
      icon: <MenuIconDislike active={isDisliked} />,
      onClick: () =>
        void setPreference(exerciseId, isDisliked ? null : "disliked", {
          refreshGeneratedWeek: false,
        }),
    });
  }
  overflowItems.push({
    label: "Report an issue",
    icon: <MenuIconReport />,
    onClick: () => setReportOpen(true),
  });
  if (onSwap && !log.skipped) {
    overflowItems.push({
      label: "Swap stretch",
      icon: <MenuIconSwap />,
      onClick: () => {
        setSwapModalKey((k) => k + 1);
        setSwapOpen(true);
      },
    });
  }
  if (!log.completed && !log.skipped) {
    overflowItems.push({
      label: "Skip",
      icon: <MenuIconSkip />,
      onClick: onSkip,
    });
  }
  if (log.skipped) {
    overflowItems.push({
      label: "Undo skip",
      icon: <MenuIconUndoSkip />,
      onClick: onUnskip,
    });
  }
  if (onRemoveFromWorkout) {
    overflowItems.push({
      label: "Remove from workout",
      icon: <MenuIconRemove />,
      onClick: onRemoveFromWorkout,
    });
  }

  const showInlineCompleted =
    !log.skipped && (mode === "reps" || mode === "timer");

  const detailText =
    showInlineCompleted && mode === "reps"
      ? prescriptionLine.trim() || null
      : !showInlineCompleted
        ? `${prescriptionLine}${didLine}`.trim() || null
        : null;

  const detailLeading =
    showInlineCompleted && mode === "timer" ? (
      !log.completed ? (
        <SetTimerPill
          seconds={effectiveTargetSec}
          title={`Start stretch timer (${effectiveTargetSec}s)`}
          target={{
            kind: stretchCategory === "SC" ? "coolDown" : "warmUp",
            exerciseId,
          }}
        />
      ) : (
        <p className="text-xs leading-snug text-muted tabular-nums">
          {effectiveTargetSec}s
        </p>
      )
    ) : null;

  const completedFieldId = `completed-stretch-${exerciseId}`;

  const inlineCompletedInput = showInlineCompleted ? (
    <div className="flex items-center gap-1.5">
      <label htmlFor={completedFieldId} className="text-xs text-muted">
        Did
      </label>
      <input
        id={completedFieldId}
        type="text"
        inputMode="numeric"
        value={
          mode === "reps"
            ? log.actualReps != null
              ? String(log.actualReps)
              : ""
            : log.actualDuration != null
              ? String(log.actualDuration)
              : ""
        }
        onChange={(e) => {
          const val = e.target.value.trim();
          if (val === "") {
            if (mode === "reps") {
              onSetActualReps(undefined);
            } else {
              onSetActualDuration(undefined);
            }
            return;
          }
          if (!/^\d+$/.test(val)) return;
          const num = parseInt(val, 10);
          if (Number.isNaN(num)) return;
          if (mode === "reps") {
            onSetActualReps(num);
          } else {
            onSetActualDuration(num);
          }
        }}
        className={`w-14 rounded-md border border-border bg-background px-2 py-0.5 text-right text-sm text-foreground outline-none focus:border-accent ${
          mode === "timer" ? "font-mono" : ""
        }`}
        placeholder={
          mode === "reps" ? repsPlaceholder : String(effectiveTargetSec)
        }
        aria-label={
          mode === "reps" ? "Completed reps" : "Completed duration in seconds"
        }
      />
    </div>
  ) : null;

  const completionCheckbox = (
    <WorkoutCompletionCheckbox completed={log.completed} onClick={onToggle} />
  );

  return (
    <div className={`transition-colors ${log.skipped ? "opacity-40" : ""}`}>
      <ExerciseReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        exercise={exercise}
        source="exercise_row"
        contextExtra={{
          stretchCategory,
          exerciseId,
        }}
      />
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
      <div className="px-1">
        <WorkoutRowMetaLine
          leading={completionCheckbox}
          name={exercise.name}
          nameClassName={
            log.completed || log.skipped
              ? "text-muted line-through"
              : "text-foreground"
          }
          onNameClick={() => setDetailOpen(true)}
          opensDetailSheet
          menuItems={overflowItems}
          detailText={detailText}
          detailLeading={detailLeading}
          detailTrailing={inlineCompletedInput}
        />
      </div>

      <ExerciseDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={exercise.name}
        notes={exercise.notes}
        videoUrl={exercise.videoUrl}
        mode={mode}
        effectiveTargetSec={effectiveTargetSec}
        storedTargetSeconds={log.targetDurationSeconds}
        onTimerPreset={onSetTargetDuration}
        onTimerCommitCustom={onSetTargetDuration}
      />
    </div>
  );
}
